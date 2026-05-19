/**
 * Unit tests for offerService.ts
 *
 * Mocks the Supabase client so no network calls are made.
 * Run: pnpm --filter mobile test
 */

import { parseOffer } from '../offerService';

// ── Mock Supabase ─────────────────────────────────────────────

const mockInvoke = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

jest.mock('@/lib/analytics', () => ({
  capture: jest.fn(),
}));

jest.mock('@/lib/sentry', () => ({
  captureError: jest.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────

const VALID_DECISION = {
  recommendation: 'accept',
  effectiveHourlyRate: 24.0,
  confidence: 'high',
  reasoning: ['Strong rate: $24/hr'],
  parsedOffer: {
    payout: 8.0,
    distanceMiles: 2.5,
    estimatedMinutes: 20,
    storeName: "McDonald's",
    items: [],
    platform: 'uber_eats',
    confidenceScore: 0.95,
    rawOffer: {
      payoutRaw: '$8.00',
      distanceRaw: '2.5 mi',
      estimatedTimeRaw: '20 min',
      storeNameRaw: "McDonald's",
      itemsRaw: null,
      platformRaw: 'Uber Eats',
    },
  },
  generatedAt: '2026-05-19T00:00:00.000Z',
};

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  mockInvoke.mockReset();
});

describe('parseOffer', () => {
  it('returns decision on successful API call', async () => {
    mockInvoke.mockResolvedValue({ data: VALID_DECISION, error: null });

    const result = await parseOffer('base64data', 'uber_eats');

    expect(result.error).toBeNull();
    expect(result.decision).not.toBeNull();
    expect(result.decision?.recommendation).toBe('accept');
    expect(result.decision?.effectiveHourlyRate).toBe(24.0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('validates response shape — returns parse_failed on bad shape', async () => {
    // Missing required fields in response
    mockInvoke.mockResolvedValue({
      data: { recommendation: 'accept' }, // missing everything else
      error: null,
    });

    const result = await parseOffer('base64data', 'uber_eats');

    expect(result.error).toBe('parse_failed');
    expect(result.decision).toBeNull();
  });

  it('maps rate_limited error code', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Rate limit exceeded',
        context: { body: JSON.stringify({ error: 'rate_limited', message: 'Too many requests' }) },
      },
    });

    const result = await parseOffer('base64data', 'uber_eats');

    expect(result.error).toBe('rate_limited');
    expect(result.decision).toBeNull();
  });

  it('maps unauthorized error code', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Unauthorized',
        context: { body: JSON.stringify({ error: 'unauthorized' }) },
      },
    });

    const result = await parseOffer('base64data', 'doordash');

    expect(result.error).toBe('permission_denied');
  });

  it('maps payload_too_large error code', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Too large',
        context: { body: JSON.stringify({ error: 'payload_too_large' }) },
      },
    });

    const result = await parseOffer('base64data', 'uber_eats');

    expect(result.error).toBe('image_too_large');
  });

  it('retries once on network error and returns network_error after both fail', async () => {
    mockInvoke.mockRejectedValue(new Error('Network request failed'));

    const result = await parseOffer('base64data', 'uber_eats', { retryOnNetworkError: true });

    // Should have been called twice (initial + 1 retry)
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result.error).toBe('network_error');
    expect(result.decision).toBeNull();
  });

  it('does not retry when retryOnNetworkError is false', async () => {
    mockInvoke.mockRejectedValue(new Error('Network request failed'));

    const result = await parseOffer('base64data', 'uber_eats', { retryOnNetworkError: false });

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(result.error).toBe('network_error');
  });

  it('passes targetHourlyRate to the edge function body', async () => {
    mockInvoke.mockResolvedValue({ data: VALID_DECISION, error: null });

    await parseOffer('base64data', 'uber_eats', { targetHourlyRate: 22 });

    expect(mockInvoke).toHaveBeenCalledWith(
      'parse-offer',
      expect.objectContaining({
        body: expect.objectContaining({ targetHourlyRate: 22 }),
      })
    );
  });

  it('always returns a non-negative latencyMs', async () => {
    mockInvoke.mockResolvedValue({ data: VALID_DECISION, error: null });

    const result = await parseOffer('base64data', 'uber_eats');

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
