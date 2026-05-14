import { supabase } from '@/lib/supabase';
import { capture } from '@/lib/analytics';
import type { OfferDecision } from '@drivercopilot/types';

export type ParseOfferError =
  | 'permission_denied'
  | 'image_too_large'
  | 'parse_failed'
  | 'network_error'
  | 'not_configured';

export interface ParseOfferResult {
  decision: OfferDecision | null;
  error: ParseOfferError | null;
  latencyMs: number;
}

/**
 * Send a compressed base64 image to the parse-offer Edge Function.
 * Returns the OfferDecision or a typed error.
 */
export async function parseOffer(
  imageBase64: string,
  platform: 'uber_eats' | 'doordash',
): Promise<ParseOfferResult> {
  const start = Date.now();

  capture('offer_capture_started', { platform });

  try {
    const { data, error } = await supabase.functions.invoke('parse-offer', {
      body: { imageBase64, platform },
    });

    const latencyMs = Date.now() - start;

    if (error) {
      capture('offer_parse_failed', { platform, error_type: error.message, latency_ms: latencyMs });
      return { decision: null, error: 'parse_failed', latencyMs };
    }

    const decision = data as OfferDecision;

    capture('offer_parse_succeeded', {
      platform,
      latency_ms: latencyMs,
      confidence_score: decision.parsedOffer.confidenceScore,
    });

    capture('recommendation_generated', {
      recommendation: decision.recommendation,
      effective_hourly_rate: decision.effectiveHourlyRate,
      confidence: decision.confidence,
    });

    return { decision, error: null, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    capture('offer_parse_failed', {
      platform,
      error_type: err instanceof Error ? err.message : 'unknown',
      latency_ms: latencyMs,
    });
    return { decision: null, error: 'network_error', latencyMs };
  }
}
