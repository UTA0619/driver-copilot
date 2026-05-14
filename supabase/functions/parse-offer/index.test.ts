/**
 * Unit tests for parse-offer Edge Function logic
 * Run: deno test supabase/functions/parse-offer/index.test.ts
 */

import { assertEquals, assertAlmostEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// ── inline the decision logic for isolated testing ──────────────

type Recommendation = "accept" | "decline" | "conditional";

interface ParsedOffer {
  payout: number;
  distanceMiles: number;
  estimatedMinutes: number;
  storeName: string | null;
  items: string[];
  platform: string;
  confidenceScore: number;
}

interface OfferDecision {
  recommendation: Recommendation;
  effectiveHourlyRate: number;
  confidence: "high" | "medium" | "low";
  reasoning: string[];
}

const ACCEPT_THRESHOLD = 18;
const DECLINE_THRESHOLD = 12;

function decideOffer(offer: ParsedOffer): OfferDecision {
  const reasoning: string[] = [];
  let recommendation: Recommendation;
  let confidence: "high" | "medium" | "low";

  const effectiveHourlyRate =
    offer.estimatedMinutes > 0
      ? (offer.payout / offer.estimatedMinutes) * 60
      : 0;

  if (effectiveHourlyRate >= ACCEPT_THRESHOLD) {
    recommendation = "accept";
    reasoning.push(`Strong hourly rate: $${effectiveHourlyRate.toFixed(2)}/hr`);
  } else if (effectiveHourlyRate <= DECLINE_THRESHOLD) {
    recommendation = "decline";
    reasoning.push(`Low hourly rate: $${effectiveHourlyRate.toFixed(2)}/hr`);
  } else {
    recommendation = "conditional";
    reasoning.push(`Marginal rate: $${effectiveHourlyRate.toFixed(2)}/hr`);
  }

  if (offer.distanceMiles > 8 && offer.payout < 8) {
    recommendation = "decline";
    reasoning.push(`Long distance (${offer.distanceMiles}mi) with low payout ($${offer.payout})`);
  }

  if (offer.payout < 5) {
    if (recommendation === "accept") recommendation = "conditional";
    reasoning.push(`Small payout ($${offer.payout}) — low tip potential`);
  }

  if (offer.confidenceScore >= 0.9) confidence = "high";
  else if (offer.confidenceScore >= 0.6) confidence = "medium";
  else {
    confidence = "low";
    reasoning.push("Some offer details were unclear — verify manually");
  }

  return {
    recommendation,
    effectiveHourlyRate: Math.round(effectiveHourlyRate * 100) / 100,
    confidence,
    reasoning,
  };
}

// ── tests ────────────────────────────────────────────────────────

const baseOffer = (overrides: Partial<ParsedOffer>): ParsedOffer => ({
  payout: 10,
  distanceMiles: 3,
  estimatedMinutes: 25,
  storeName: "McDonald's",
  items: [],
  platform: "uber_eats",
  confidenceScore: 0.95,
  ...overrides,
});

Deno.test("accept: strong offer $25 / 2mi / 15min", () => {
  const decision = decideOffer(baseOffer({ payout: 25, distanceMiles: 2, estimatedMinutes: 15 }));
  assertEquals(decision.recommendation, "accept");
  assertAlmostEquals(decision.effectiveHourlyRate, 100, 1);
  assertEquals(decision.confidence, "high");
});

Deno.test("accept: exactly at threshold $18/hr", () => {
  // $9 in 30 min = $18/hr
  const decision = decideOffer(baseOffer({ payout: 9, distanceMiles: 2, estimatedMinutes: 30 }));
  assertEquals(decision.recommendation, "accept");
  assertAlmostEquals(decision.effectiveHourlyRate, 18, 0.1);
});

Deno.test("decline: bad offer $5 / 8mi / 30min", () => {
  const decision = decideOffer(baseOffer({ payout: 5, distanceMiles: 8, estimatedMinutes: 30 }));
  assertEquals(decision.recommendation, "decline");
  assertAlmostEquals(decision.effectiveHourlyRate, 10, 0.1);
});

Deno.test("decline: long distance override — 10mi + $6", () => {
  // Rate might be borderline but distance override kicks in
  const decision = decideOffer(baseOffer({ payout: 6, distanceMiles: 10, estimatedMinutes: 20 }));
  assertEquals(decision.recommendation, "decline");
  assertEquals(decision.reasoning.some(r => r.includes("Long distance")), true);
});

Deno.test("conditional: borderline $15/hr", () => {
  // $7.50 in 30min = $15/hr
  const decision = decideOffer(baseOffer({ payout: 7.5, distanceMiles: 3, estimatedMinutes: 30 }));
  assertEquals(decision.recommendation, "conditional");
  assertAlmostEquals(decision.effectiveHourlyRate, 15, 0.1);
});

Deno.test("conditional: small payout < $5 overrides accept", () => {
  // $4 in 10min = $24/hr — good rate but small payout
  const decision = decideOffer(baseOffer({ payout: 4, distanceMiles: 1, estimatedMinutes: 10 }));
  assertEquals(decision.recommendation, "conditional");
  assertEquals(decision.reasoning.some(r => r.includes("Small payout")), true);
});

Deno.test("confidence: low when confidenceScore < 0.6", () => {
  const decision = decideOffer(baseOffer({ confidenceScore: 0.4 }));
  assertEquals(decision.confidence, "low");
  assertEquals(decision.reasoning.some(r => r.includes("unclear")), true);
});

Deno.test("confidence: medium when confidenceScore 0.6–0.89", () => {
  const decision = decideOffer(baseOffer({ confidenceScore: 0.75 }));
  assertEquals(decision.confidence, "medium");
});

Deno.test("edge: zero duration returns 0 hourly rate", () => {
  const decision = decideOffer(baseOffer({ payout: 10, estimatedMinutes: 0 }));
  assertEquals(decision.effectiveHourlyRate, 0);
  assertEquals(decision.recommendation, "decline");
});

Deno.test("edge: DoorDash platform field preserved", () => {
  const offer = baseOffer({ platform: "doordash", payout: 20, estimatedMinutes: 20 });
  const decision = decideOffer(offer);
  assertEquals(decision.recommendation, "accept");
});
