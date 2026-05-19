import React, { useCallback, useEffect, useState } from 'react';
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
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/context/AuthContext';
import { isAppleSignInAvailable, signInWithApple } from '@/lib/appleAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const validateEmail = useCallback((value: string): boolean => {
    if (!value) { setEmailError('Email is required'); return false; }
    if (!EMAIL_REGEX.test(value)) { setEmailError('Enter a valid email address'); return false; }
    setEmailError('');
    return true;
  }, []);

  const handleLogin = useCallback(async () => {
    if (!validateEmail(email)) return;
    if (!password) {
      Alert.alert('Missing password', 'Please enter your password.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      const msg = error.toLowerCase().includes('invalid')
        ? 'Incorrect email or password. Please try again.'
        : error;
      Alert.alert('Sign in failed', msg);
    }
  }, [email, password, validateEmail, signIn]);

  const handleAppleSignIn = useCallback(async () => {
    if (appleLoading || loading) return;
    setAppleLoading(true);
    const result = await signInWithApple();
    setAppleLoading(false);
    if (!result.success && result.error !== 'cancelled') {
      Alert.alert('Sign in failed', result.message ?? 'Apple sign-in failed. Please try again.');
    }
  }, [appleLoading, loading]);

  const isAnyLoading = loading || appleLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>Driver Copilot</Text>
        <Text style={styles.tagline}>Make every delivery count.</Text>

        {/* Email field */}
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
            <Text style={styles.fieldError} accessibilityLiveRegion="polite">
              {emailError}
            </Text>
          )}
        </View>

        {/* Password field */}
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          accessibilityLabel="Password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        {/* Forgot password */}
        <Link
          href="/(auth)/forgot-password"
          style={styles.forgotLink}
          accessibilityLabel="Forgot your password?"
        >
          Forgot password?
        </Link>

        {/* Sign In button */}
        <TouchableOpacity
          style={[styles.button, isAnyLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isAnyLoading}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          accessibilityState={{ disabled: isAnyLoading }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Apple Sign In — iOS only */}
        {appleAvailable && (
          appleLoading ? (
            <View style={styles.appleLoadingBox}>
              <ActivityIndicator color="#94a3b8" />
              <Text style={styles.appleLoadingText}>Signing in with Apple…</Text>
            </View>
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
              cornerRadius={12}
              style={[styles.appleButton, isAnyLoading && styles.buttonDisabled]}
              onPress={handleAppleSignIn}
            />
          )
        )}

        <Link href="/(auth)/signup" style={styles.link}>
          Don&apos;t have an account?{' '}
          <Text style={styles.linkBold}>Sign up</Text>
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
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
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
  fieldError: {
    color: '#f87171',
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotLink: {
    color: '#60a5fa',
    fontSize: 13,
    textAlign: 'right',
    marginTop: -4,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  appleButton: { width: '100%', height: 50, marginTop: 4 },
  appleLoadingBox: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  appleLoadingText: { color: '#94a3b8', fontSize: 15 },
  link: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  linkBold: { color: '#60a5fa', fontWeight: '600' },
});
