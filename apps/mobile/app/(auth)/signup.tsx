import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { capture } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = useCallback((value: string): boolean => {
    if (!value) { setEmailError('Email is required'); return false; }
    if (!EMAIL_REGEX.test(value)) { setEmailError('Enter a valid email address'); return false; }
    setEmailError('');
    return true;
  }, []);

  const validatePassword = useCallback((pw: string, cf: string): boolean => {
    if (pw.length < 8) { setPasswordError('Password must be at least 8 characters'); return false; }
    if (pw !== cf) { setPasswordError('Passwords do not match'); return false; }
    setPasswordError('');
    return true;
  }, []);

  const handleSignup = useCallback(async () => {
    const emailOk = validateEmail(email);
    const passwordOk = validatePassword(password, confirm);
    if (!emailOk || !passwordOk) return;

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert('Sign up failed', error.message);
      return;
    }

    if (data.user) {
      // Create the user_profiles row explicitly — handle errors
      const { error: upsertError } = await supabase.from('user_profiles').upsert(
        {
          id: data.user.id,
          email: data.user.email ?? email.trim().toLowerCase(),
          platforms: [],
          is_pro: false,
        },
        { onConflict: 'id', ignoreDuplicates: false }
      );

      if (upsertError) {
        captureError(new Error(upsertError.message), { source: 'signup.upsert' });
        // Log but don't block — auth succeeded, profile will be retried in onboarding
        console.warn('[Signup] Profile upsert failed:', upsertError.message);
      }

      // Only identify after email is confirmed (Supabase sends confirmation email)
      // capture here just for funnel analytics — do NOT call identify until SIGNED_IN fires
      capture('user_signed_up', { auth_method: 'email' });
    }

    setLoading(false);

    // Inform about email confirmation if required
    if (data.session === null && data.user) {
      Alert.alert(
        'Check your email',
        'We sent a confirmation link to your email. Click it to activate your account.',
      );
    }
    // If email confirmation is disabled, AuthContext.onAuthStateChange will fire
    // automatically and redirect to onboarding.
  }, [email, password, confirm, validateEmail, validatePassword]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Start making smarter deliveries.</Text>

        {/* Email */}
        <View>
          <TextInput
            style={[styles.input, !!emailError && styles.inputError]}
            placeholder="Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={(v) => { setEmail(v); if (emailError) validateEmail(v); }}
            onBlur={() => validateEmail(email)}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            accessibilityLabel="Email address"
            returnKeyType="next"
          />
          {!!emailError && (
            <Text style={styles.fieldError} accessibilityLiveRegion="polite">{emailError}</Text>
          )}
        </View>

        {/* Password */}
        <View>
          <TextInput
            style={[styles.input, !!passwordError && styles.inputError]}
            placeholder="Password (min 8 characters)"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={(v) => { setPassword(v); if (passwordError) validatePassword(v, confirm); }}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            accessibilityLabel="Password, minimum 8 characters"
            returnKeyType="next"
          />
        </View>

        {/* Confirm password — different textContentType prevents autofill collision */}
        <View>
          <TextInput
            style={[styles.input, !!passwordError && styles.inputError]}
            placeholder="Confirm password"
            placeholderTextColor="#64748b"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); if (passwordError) validatePassword(password, v); }}
            secureTextEntry
            autoComplete="off"
            textContentType="oneTimeCode"
            accessibilityLabel="Confirm password"
            returnKeyType="done"
            onSubmitEditing={handleSignup}
          />
          {!!passwordError && (
            <Text style={styles.fieldError} accessibilityLiveRegion="polite">{passwordError}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Create account"
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          Already have an account?{' '}
          <Text style={styles.linkBold}>Sign in</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#94a3b8', marginBottom: 24 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputError: { borderColor: '#f87171' },
  fieldError: { color: '#f87171', fontSize: 13, marginTop: 4, marginLeft: 4 },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: '#94a3b8', textAlign: 'center', marginTop: 16, fontSize: 14 },
  linkBold: { color: '#60a5fa', fontWeight: '600' },
});
