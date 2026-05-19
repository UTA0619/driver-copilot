import { supabase } from '@/lib/supabase';
import { capture } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';
import type { DeliveryPlatform, OfferDecision } from '@drivercopilot/types';
import { z } from 'zod';

export type ParseOfferError =
  | 'permission_denied'
  | 'image_too_large'
  | 'parse_failed'
  | 'network_error'
  | 'rate_limited'
  | 'not_configured';

export interface ParseOfferResult {
  decision: OfferDecision | null;
  error: ParseOfferError | null;
  latencyMs: number;
}

// Runtime schema for the Edge Function response to prevent silent type mismatches
const OfferDecisionSchema = z.object({
  recommendation: z.enum(['accept', 'decline', 'conditional']),
  effectiveHourlyRate: z.number(),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.array(z.string()),
  parsedOffer: z.object({
    payout: z.number(),
    distanceMiles: z.number(),
    estimatedMinutes: z.number(),
    storeName: z.string().nullable(),
    items: z.array(z.string()),
    platform: z.string(),
    confidenceScore: z.number(),
    rawOffer: z.object({
      payoutRaw: z.string().nullable(),
      distanceRaw: z.string().nullable(),
      estimatedTimeRaw: z.string().nullable(),
      storeNameRaw: z.string().nullable(),
      itemsRaw: z.string().nullable(),
      platformRaw: z.string().nullable(),
    }),
  }),
  generatedAt: z.string(),
});

/**
 * Send a compressed base64 image to the parse-offer Edge Function.
 * Validates the response shape at runtime and returns a typed result.
 * Retries once on transient network errors.
 */
export async function parseOffer(
  imageBase64: string,
  platform: DeliveryPlatform,
  options?: { targetHourlyRate?: number; retryOnNetworkError?: boolean },
): Promise<ParseOfferResult> {
  const start = Date.now();
  capture('offer_capture_started', { platform });

  const attempt = async (): Promise<ParseOfferResult> => {
    const { data, error } = await supabase.functions.invoke('parse-offer', {
      body: { imageBase64, platform, targetHourlyRate: options?.targetHourlyRate },
    });

    const latencyMs = Date.now() - start;

    if (error) {
      // Map Supabase function error codes to typed errors
      const errorBody = error.context?.body;
      let parsedBody: { error?: string } | null = null;
      try {
        parsedBody = typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody;
      } catch { /* ignore */ }

      const errorCode = parsedBody?.error;

      if (errorCode === 'rate_limited') {
        capture('offer_parse_failed', { platform, error_type: 'rate_limited', latency_ms: latencyMs });
        return { decision: null, error: 'rate_limited', latencyMs };
      }

      if (errorCode === 'unauthorized') {
        capture('offer_parse_failed', { platform, error_type: 'unauthorized', latency_ms: latencyMs });
        return { decision: null, error: 'permission_denied', latencyMs };
      }

      if (errorCode === 'payload_too_large') {
        return { decision: null, error: 'image_too_large', latencyMs };
      }

      if (errorCode === 'parse_failed') {
        capture('offer_parse_failed', { platform, error_type: 'parse_failed', latency_ms: latencyMs });
        return { decision: null, error: 'parse_failed', latencyMs };
      }

      if (errorCode === 'configuration_error') {
        return { decision: null, error: 'not_configured', latencyMs };
      }

      // Generic function error
      captureError(new Error(`parse-offer function error: ${error.message}`), {
        source: 'offerService.parseOffer',
        error_code: errorCode,
      });
      capture('offer_parse_failed', { platform, error_type: 'function_error', latency_ms: latencyMs });
      return { decision: null, error: 'parse_failed', latencyMs };
    }

    // Validate response shape at runtime
    const parseResult = OfferDecisionSchema.safeParse(data);
    if (!parseResult.success) {
      captureError(new Error('Invalid Edge Function response shape'), {
        source: 'offerService.parseOffer',
        issues: JSON.stringify(parseResult.error.issues),
      });
      capture('offer_parse_failed', { platform, error_type: 'invalid_response', latency_ms: latencyMs });
      return { decision: null, error: 'parse_failed', latencyMs };
    }

    const decision = parseResult.data as OfferDecision;

    capture('offer_parse_succeeded', {
      platform,
      latency_ms: latencyMs,
      confidence_score: decision.parsedOffer.confidenceScore,
    });
    capture('recommendation_generated', {
      recommendation: decision.recommendation,
      effective_hourly_rate: decision.effectiveHourlyRate,
      confidence: decision.confidence,
      platform,
    });

    return { decision, error: null, latencyMs };
  };

  try {
    return await attempt();
  } catch (networkErr) {
    // One automatic retry on network errors
    if (options?.retryOnNetworkError !== false) {
      try {
        await new Promise((r) => setTimeout(r, 1000));
        return await attempt();
      } catch { /* fall through */ }
    }

    const latencyMs = Date.now() - start;
    captureError(
      networkErr instanceof Error ? networkErr : new Error(String(networkErr)),
      { source: 'offerService.parseOffer', platform },
    );
    capture('offer_parse_failed', { platform, error_type: 'network_error', latency_ms: latencyMs });
    return { decision: null, error: 'network_error', latencyMs };
  }
}
