import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { capture, identify } from '@/lib/analytics';

export type AppleSignInResult =
  | { success: true }
  | { success: false; error: 'cancelled' | 'not_available' | 'failed'; message?: string };

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Exchange Apple identity token with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
    });

    if (error) {
      return { success: false, error: 'failed', message: error.message };
    }

    if (data.user) {
      identify(data.user.id, { email: data.user.email });
      capture('user_signed_in_apple', { auth_method: 'apple' });

      // Upsert profile (Apple only provides name on first sign-in)
      const displayName = credential.fullName
        ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
        : undefined;

      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        email: data.user.email ?? credential.email ?? '',
        platforms: [],
        is_pro: false,
        ...(displayName ? { display_name: displayName } : {}),
      });
    }

    return { success: true };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message.includes('1001') || err.message.includes('canceled'))
    ) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: 'failed', message: err instanceof Error ? err.message : 'Unknown error' };
  }
}
