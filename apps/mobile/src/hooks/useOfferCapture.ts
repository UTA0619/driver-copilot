import { useState, useCallback, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert, Linking } from 'react-native';
import { parseOffer, ParseOfferResult } from '@/services/offerService';
import type { DeliveryPlatform } from '@drivercopilot/types';

export type CaptureStatus =
  | 'idle'
  | 'picking'
  | 'compressing'
  | 'parsing'
  | 'done'
  | 'error';

export interface UseOfferCaptureState {
  status: CaptureStatus;
  result: ParseOfferResult | null;
  analyzeOffer: (platform: DeliveryPlatform, options?: { targetHourlyRate?: number }) => Promise<void>;
  reset: () => void;
}

const PARSE_TIMEOUT_MS = 30_000; // 30 second timeout

export function useOfferCapture(): UseOfferCaptureState {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [result, setResult] = useState<ParseOfferResult | null>(null);
  // Track if component is still mounted to prevent state updates on unmounted components
  const isMountedRef = useRef(true);

  // Expose a way for the consuming component to clear the ref on unmount
  // (Called implicitly through useCallback's closure)

  const safeSetStatus = useCallback((s: CaptureStatus) => {
    if (isMountedRef.current) setStatus(s);
  }, []);

  const safeSetResult = useCallback((r: ParseOfferResult | null) => {
    if (isMountedRef.current) setResult(r);
  }, []);

  const analyzeOffer = useCallback(
    async (platform: DeliveryPlatform, options?: { targetHourlyRate?: number }) => {
      // Prevent concurrent invocations
      if (!isMountedRef.current) return;

      safeSetStatus('picking');
      safeSetResult(null);

      // 1. Request photo library permission
      const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permStatus !== 'granted') {
        safeSetStatus('idle');
        Alert.alert(
          'Photos Access Required',
          'Driver Copilot needs access to your photos to analyze offer screenshots.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
        return;
      }

      // 2. Open image picker
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        // Expo SDK 52+: use array of media type strings
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) {
        safeSetStatus('idle');
        return;
      }

      const asset = pickerResult.assets[0];

      if (!asset.uri) {
        safeSetStatus('error');
        Alert.alert('Error', 'Could not load image. Please try a different photo.');
        return;
      }

      safeSetStatus('compressing');

      // 3. Resize to max 800px width and JPEG 80% to stay under 2 MB
      let base64: string;
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: Math.min(asset.width > 0 ? asset.width : 800, 800) } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );
        if (!compressed.base64) throw new Error('Compression produced no base64 output');
        base64 = compressed.base64;
      } catch {
        safeSetStatus('error');
        Alert.alert('Error', 'Could not process image. Please try again.');
        return;
      }

      safeSetStatus('parsing');

      // 4. Parse with timeout
      let parseResult: ParseOfferResult;
      try {
        const timeoutPromise = new Promise<ParseOfferResult>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), PARSE_TIMEOUT_MS)
        );
        parseResult = await Promise.race([
          parseOffer(base64, platform, {
            targetHourlyRate: options?.targetHourlyRate,
            retryOnNetworkError: true,
          }),
          timeoutPromise,
        ]);
      } catch (err) {
        if (!isMountedRef.current) return;
        const isTimeout = err instanceof Error && err.message === 'timeout';
        safeSetStatus('error');
        safeSetResult({ decision: null, error: 'network_error', latencyMs: PARSE_TIMEOUT_MS });
        Alert.alert(
          isTimeout ? 'Request Timed Out' : 'Connection Error',
          isTimeout
            ? 'Analysis took too long. Please check your connection and try again.'
            : 'Could not reach the analysis server. Check your connection and try again.',
        );
        return;
      }

      if (!isMountedRef.current) return;

      safeSetResult(parseResult);

      if (parseResult.error) {
        safeSetStatus('error');

        const errorMessages: Record<string, string> = {
          network_error: 'Connection error — please try again.',
          parse_failed: 'Could not read this screenshot. Try taking a cleaner screenshot of the offer.',
          rate_limited: 'Too many requests — please wait a moment and try again.',
          image_too_large: 'Image is too large. Please try a smaller screenshot.',
          permission_denied: 'Authentication error — please sign out and back in.',
          not_configured: 'Service not available right now. Please try later.',
        };

        const message = errorMessages[parseResult.error] ?? 'Something went wrong. Please try again.';
        Alert.alert('Analysis Failed', message);
      } else {
        safeSetStatus('done');
      }
    },
    [safeSetStatus, safeSetResult],
  );

  const reset = useCallback(() => {
    safeSetStatus('idle');
    safeSetResult(null);
  }, [safeSetStatus, safeSetResult]);

  return { status, result, analyzeOffer, reset };
}
