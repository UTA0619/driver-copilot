import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface Props {
  message?: string;
}

/**
 * Full-screen loading indicator. Used during auth checks, onboarding resolution,
 * and other async bootstrapping steps — replaces the blank `return null` pattern.
 */
export function LoadingScreen({ message }: Props) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color="#3b82f6" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  message: {
    color: '#94a3b8',
    fontSize: 15,
  },
});
