import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert, Linking, Platform } from 'react-native';
import { parseOffer, ParseOfferResult } from '@/services/offerService';

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
  analyzeOffer: (platform: 'uber_eats' | 'doordash') => Promise<void>;
  reset: () => void;
}

export function useOfferCapture(): UseOfferCaptureState {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [result, setResult] = useState<ParseOfferResult | null>(null);

  const analyzeOffer = useCallback(async (platform: 'uber_eats' | 'doordash') => {
    setStatus('picking');
    setResult(null);

    // Request permission
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== 'granted') {
      setStatus('error');
      Alert.alert(
        'Photos Access Required',
        'Driver Copilot needs access to your photos to analyze offer screenshots.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setStatus('idle') },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings();
              setStatus('idle');
            },
          },
        ],
      );
      return;
    }

    // Open image picker
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      // Show most recent first
      orderedSelection: false,
    });

    if (pickerResult.canceled || !pickerResult.assets[0]) {
      setStatus('idle');
      return;
    }

    setStatus('compressing');

    // Compress: resize to max 800px width, JPEG 80%
    const asset = pickerResult.assets[0];
    const compressed = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: Math.min(asset.width ?? 800, 800) } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );

    if (!compressed.base64) {
      setStatus('error');
      Alert.alert('Error', 'Could not process image. Please try again.');
      return;
    }

    setStatus('parsing');

    const parseResult = await parseOffer(compressed.base64, platform);
    setResult(parseResult);
    setStatus(parseResult.error ? 'error' : 'done');

    if (parseResult.error === 'network_error') {
      Alert.alert(
        'Connection Error',
        'Could not reach the analysis server. Check your connection and try again.',
      );
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
  }, []);

  return { status, result, analyzeOffer, reset };
}
