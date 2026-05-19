import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { capture } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';

export type AppleSignInResult =
  | { success: true }
  | { success: false; error: 'cancelled' | 'not_available' | 'failed'; message?: string };

/**
 * Returns true only on iOS with Apple Sign-In available (device has Apple ID configured).
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Sign in with Apple, exchange the identity token with Supabase, and upsert
 * the user_profiles row. Returns a typed result — never throws.
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, error: 'not_available', message: 'Apple Sign-In is iOS only' };
  }

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (err: unknown) {
    // Use typed error code, not fragile string matching
    const code = (err as { code?: string })?.code;
    if (
      code === 'ERR_REQUEST_CANCELED' ||
      code === 'ERR_CANCELED' ||
      // iOS simulator returns this when the user taps "Cancel"
      code === '1001'
    ) {
      return { success: false, error: 'cancelled' };
    }
    captureError(err instanceof Error ? err : new Error(String(err)), { source: 'appleAuth.signInAsync' });
    return { success: false, error: 'failed', message: 'Apple authentication failed' };
  }

  // Guard: Apple can return null identityToken in rare edge cases (simulator, no Apple ID)
  if (!credential.identityToken) {
    return { success: false, error: 'failed', message: 'No identity token from Apple' };
  }

  // Exchange with Supabase
  const { data, error: supabaseError } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (supabaseError) {
    captureError(new Error(supabaseError.message), { source: 'appleAuth.signInWithIdToken' });
    return { success: false, error: 'failed', message: supabaseError.message };
  }

  if (!data.user) {
    return { success: false, error: 'failed', message: 'No user returned from Supabase' };
  }

  // Apple only provides fullName on the very first sign-in
  const displayName = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName]
        .filter(Boolean)
        .join(' ')
        .trim() || undefined
    : undefined;

  // Upsert the user_profiles row — handle errors explicitly
  const upsertPayload: Record<string, unknown> = {
    id: data.user.id,
    email: data.user.email ?? credential.email ?? '',
    platforms: [],
    is_pro: false,
  };
  if (displayName) upsertPayload.display_name = displayName;

  const { error: upsertError } = await supabase
    .from('user_profiles')
    .upsert(upsertPayload, { onConflict: 'id', ignoreDuplicates: false });

  if (upsertError) {
    // Log but don't fail — auth succeeded, profile upsert is best-effort
    captureError(new Error(upsertError.message), { source: 'appleAuth.upsert' });
    console.warn('[appleAuth] Profile upsert failed:', upsertError.message);
  }

  // Analytics: identify fires in AuthContext.onAuthStateChange to avoid duplication.
  // Only capture the auth-method event here.
  capture('user_signed_in_apple', { auth_method: 'apple' });

  return { success: true };
}
