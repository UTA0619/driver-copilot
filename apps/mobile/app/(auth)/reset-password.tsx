import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { capture } from '@/lib/analytics';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleReset = async () => {
    setPasswordError('');
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    capture('password_reset_completed', {});
    Alert.alert('Password Updated', 'Your password has been updated. Please log in.', [
      { text: 'OK', onPress: () => router.replace('/(auth)/login') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Enter your new password below.</Text>

        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 8 characters"
          placeholderTextColor="#475569"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Repeat your password"
          placeholderTextColor="#475569"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          textContentType="newPassword"
          autoCapitalize="none"
        />

        {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleReset}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#f8fafc', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, fontSize: 16, color: '#f8fafc', borderWidth: 1, borderColor: '#334155' },
  error: { color: '#f87171', fontSize: 13, marginTop: 8 },
  btn: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 28 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
