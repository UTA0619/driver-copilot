/**
 * Camera capture screen — full-screen viewfinder for offer screenshot capture.
 * The user points their phone camera at the delivery app screen and taps capture.
 * This eliminates the screenshot → app-switch → photo picker flow.
 *
 * Route: /capture (pushed from home tab via router.push('/capture'))
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { hapticSuccess, hapticLight, hapticError } from '@/lib/haptics';
import type { DeliveryPlatform } from '@drivercopilot/types';

// Lazy-load expo-camera so a missing native module doesn't crash
let CameraView: React.ComponentType<{
  style?: object;
  ref?: React.Ref<{ takePictureAsync: (options?: { base64?: boolean; quality?: number }) => Promise<{ uri: string; base64?: string; width: number; height: number }> }>;
  facing?: 'front' | 'back';
}> | null = null;
let useCameraPermissions: (() => [{ granted: boolean } | null, () => Promise<{ granted: boolean }>]) | null = null;

try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {
  // expo-camera not linked — graceful fallback
}

const PLATFORMS = [
  { key: 'uber_eats' as DeliveryPlatform,  label: 'Uber Eats', color: '#16a34a' },
  { key: 'doordash' as DeliveryPlatform,   label: 'DoorDash',  color: '#dc2626' },
  { key: 'grubhub' as DeliveryPlatform,    label: 'Grubhub',   color: '#ea580c' },
  { key: 'instacart' as DeliveryPlatform,  label: 'Instacart', color: '#22c55e' },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CaptureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<{
    takePictureAsync: (options?: { base64?: boolean; quality?: number }) => Promise<{ uri: string; base64?: string; width: number; height: number }>;
  } | null>(null);

  const [selectedPlatform, setSelectedPlatform] = useState<DeliveryPlatform>('uber_eats');
  const [capturing, setCapturing] = useState(false);

  // Handle permissions
  const permissionsHook = useCameraPermissions?.();
  const permission = permissionsHook?.[0];
  const requestPermission = permissionsHook?.[1];

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    hapticLight();

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.9 });

      // Compress to get base64
      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: Math.min(photo.width, 800) } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!compressed.base64) throw new Error('No base64');

      hapticSuccess();
      // Navigate back to home and trigger analysis with the captured base64
      router.replace({
        pathname: '/(tabs)',
        params: {
          capturedBase64: compressed.base64,
          capturedPlatform: selectedPlatform,
        },
      });
    } catch (err) {
      hapticError();
      setCapturing(false);
    }
  }, [capturing, selectedPlatform, router]);

  // No native module fallback
  if (!CameraView || !useCameraPermissions) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.fallbackContainer}>
          <Ionicons name="camera-outline" size={64} color="#334155" />
          <Text style={styles.fallbackTitle}>Camera requires a development build</Text>
          <Text style={styles.fallbackText}>
            Run{' '}
            <Text style={styles.code}>eas build --profile development</Text>
            {'\n\n'}to enable live camera capture.{'\n'}
            Use photo library for now.
          </Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={styles.closeBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No permission
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.fallbackContainer}>
          <Ionicons name="camera-outline" size={64} color="#334155" />
          <Text style={styles.fallbackTitle}>Camera Access Needed</Text>
          <Text style={styles.fallbackText}>
            Allow camera access to capture offers directly — no screenshots needed.
          </Text>
          <TouchableOpacity
            style={styles.permBtn}
            onPress={() => requestPermission?.()}
            accessibilityRole="button"
          >
            <Text style={styles.permBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={styles.closeBtnText}>Use Photo Library Instead</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close camera"
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Point at offer screen</Text>
          <View style={styles.topBarBtn} />
        </View>

        {/* Viewfinder frame */}
        <View style={styles.frameContainer} pointerEvents="none">
          <View style={styles.frame}>
            {/* Corner accents */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.frameHint}>Align the offer within the frame</Text>
        </View>

        {/* Platform selector */}
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.platformLabel}>SELECT PLATFORM</Text>
          <View style={styles.platformRow}>
            {PLATFORMS.map(p => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.platformPill,
                  selectedPlatform === p.key && { backgroundColor: p.color, borderColor: p.color },
                ]}
                onPress={() => { setSelectedPlatform(p.key); hapticLight(); }}
                accessibilityRole="radio"
                accessibilityLabel={p.label}
                accessibilityState={{ selected: selectedPlatform === p.key }}
              >
                <Text style={[
                  styles.platformPillText,
                  selectedPlatform === p.key && styles.platformPillTextActive,
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Shutter */}
          <TouchableOpacity
            style={[styles.shutter, capturing && styles.shutterCapturing]}
            onPress={handleCapture}
            disabled={capturing}
            accessibilityRole="button"
            accessibilityLabel="Capture offer"
          >
            {capturing ? (
              <ActivityIndicator color="#0f172a" size="large" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>

          <Text style={styles.shutterHint}>
            {capturing ? 'Analyzing…' : 'Tap to capture & analyze'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Viewfinder
  frameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  frame: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.35,
    position: 'relative',
  },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#3b82f6', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  frameHint: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' },

  // Bottom panel
  bottomPanel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 16,
  },
  platformLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2, textTransform: 'uppercase' },
  platformRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  platformPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  platformPillText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  platformPillTextActive: { color: '#fff' },

  // Shutter button
  shutter: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#fff',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3b82f6', shadowRadius: 16, shadowOpacity: 0.6, shadowOffset: { width: 0, height: 0 },
  },
  shutterCapturing: { backgroundColor: '#3b82f6' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  shutterHint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: -8 },

  // Fallback
  fallbackContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  fallbackTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', textAlign: 'center' },
  fallbackText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#60a5fa' },
  permBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  closeBtn: { paddingVertical: 12 },
  closeBtnText: { color: '#475569', fontSize: 14 },
});
