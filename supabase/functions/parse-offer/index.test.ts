/**
 * Unit tests for parse-offer Edge Function — decision engine
 * Run: deno test supabase/functions/parse-offer/index.test.ts
 */

import {
  assertEquals,
  assertAlmostEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { decideOffer } from './index.ts';

// ── Test fixture ──────────────────────────────────────────────

const RAW_OFFER = {
  payoutRaw: '$10.00',
  distanceRaw: '3.0 mi',
  estimatedTimeRaw: '25 min',
  storeNameRaw: "McDonald's",
  itemsRaw: null,
  platformRaw: 'Uber Eats',
};

const base = (overrides: {
  payout?: number;
  distanceMiles?: number;
  estimatedMinutes?: number;
  confidenceScore?: number;
  storeName?: string | null;
} = {}) => ({
  payout: 10,
  distanceMiles: 3,
  estimatedMinutes: 25,
  storeName: "McDonald's",
  items: [],
  platform: 'uber_eats' as const,
  confidenceScore: 0.95,
  ...overrides,
});

// ── ACCEPT cases ──────────────────────────────────────────────

Deno.test('accept: strong offer $25 / 2mi / 15min → $100/hr', () => {
  const d = decideOffer(base({ payout: 25, distanceMiles: 2, estimatedMinutes: 15 }));
  assertEquals(d.recommendation, 'accept');
  assertAlmostEquals(d.effectiveHourlyRate, 100, 0.1);
  assertEquals(d.confidence, 'high');
});

Deno.test('accept: exactly at $18/hr threshold ($9 / 30min)', () => {
  const d = decideOffer(base({ payout: 9, estimatedMinutes: 30 }));
  assertEquals(d.recommendation, 'accept');
  assertAlmostEquals(d.effectiveHourlyRate, 18, 0.1);
});

Deno.test('accept: store name appears in reasoning', () => {
  const d = decideOffer(base({ payout: 20, estimatedMinutes: 20, storeName: 'Shake Shack' }));
  assertEquals(d.recommendation, 'accept');
  const hasStoreName = d.reasoning.some(r => r.includes('Shake Shack'));
  assertEquals(hasStoreName, true);
});

// ── DECLINE cases ─────────────────────────────────────────────

Deno.test('decline: low rate $5 / 8mi / 30min → $10/hr', () => {
  const d = decideOffer(base({ payout: 5, distanceMiles: 8, estimatedMinutes: 30 }));
  assertEquals(d.recommendation, 'decline');
  assertAlmostEquals(d.effectiveHourlyRate, 10, 0.1);
});

Deno.test('decline: long-haul override — 10mi + $6 payout', () => {
  const d = decideOffer(base({ payout: 6, distanceMiles: 10, estimatedMinutes: 20 }));
  assertEquals(d.recommendation, 'decline');
  const hasDistanceReason = d.reasoning.some(r => r.includes('haul') || r.includes('Long'));
  assertEquals(hasDistanceReason, true);
});

Deno.test('decline: tiny payout < $5 triggers decline', () => {
  const d = decideOffer(base({ payout: 3, distanceMiles: 1, estimatedMinutes: 20 }));
  assertEquals(d.recommendation, 'decline');
  const hasTinyReason = d.reasoning.some(r => r.includes('$5'));
  assertEquals(hasTinyReason, true);
});

// ── CONDITIONAL cases ─────────────────────────────────────────

Deno.test('conditional: borderline $15/hr ($7.50 / 30min)', () => {
  const d = decideOffer(base({ payout: 7.5, estimatedMinutes: 30 }));
  assertEquals(d.recommendation, 'conditional');
  assertAlmostEquals(d.effectiveHourlyRate, 15, 0.1);
});

Deno.test('conditional: short distance improves conditional reasoning', () => {
  const d = decideOffer(base({ payout: 7, distanceMiles: 1.5, estimatedMinutes: 28 }));
  assertEquals(d.recommendation, 'conditional');
  const hasShortDist = d.reasoning.some(r => r.includes('Short distance') || r.includes('mi'));
  assertEquals(hasShortDist, true);
});

// ── CONFIDENCE cases ──────────────────────────────────────────

Deno.test('confidence: high when confidenceScore >= 0.9', () => {
  const d = decideOffer(base({ confidenceScore: 0.95 }));
  assertEquals(d.confidence, 'high');
});

Deno.test('confidence: medium when confidenceScore 0.6–0.89', () => {
  const d = decideOffer(base({ confidenceScore: 0.75 }));
  assertEquals(d.confidence, 'medium');
});

Deno.test('confidence: low when confidenceScore < 0.6', () => {
  const d = decideOffer(base({ confidenceScore: 0.4 }));
  assertEquals(d.confidence, 'low');
  const hasWarning = d.reasoning.some(r => r.includes('confidence') || r.includes('⚠'));
  assertEquals(hasWarning, true);
});

// ── EDGE CASES ────────────────────────────────────────────────

Deno.test('edge: zero estimatedMinutes → conditional with 0 rate', () => {
  const d = decideOffer(base({ payout: 10, estimatedMinutes: 0 }));
  assertEquals(d.recommendation, 'conditional');
  assertEquals(d.effectiveHourlyRate, 0);
  assertEquals(d.confidence, 'low');
});

Deno.test('edge: targetHourlyRate override raises accept threshold', () => {
  // At default $18/hr threshold, $9/30min = exactly accept
  // With $25/hr target, it should be conditional
  const d = decideOffer(base({ payout: 9, estimatedMinutes: 30 }), 25);
  assertEquals(d.recommendation, 'conditional');
});

Deno.test('edge: targetHourlyRate override lowers threshold', () => {
  // $7/30min = $14/hr, normally conditional; with $12/hr target → accept
  const d = decideOffer(base({ payout: 7, estimatedMinutes: 30 }), 12);
  assertEquals(d.recommendation, 'accept');
});

Deno.test('edge: all PLATFORM_OPTIONS are accepted by the type', () => {
  // Verifies the type contract — all platforms flow through without error
  for (const platform of ['uber_eats', 'doordash', 'grubhub', 'instacart'] as const) {
    const d = decideOffer({ ...base({ payout: 20, estimatedMinutes: 20 }), platform });
    assertEquals(d.recommendation, 'accept');
  }
});
