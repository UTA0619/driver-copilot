import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ── Types ──────────────────────────────────────────────────────

interface ParsedOffer {
  payout: number;
  distanceMiles: number;
  estimatedMinutes: number;
  storeName: string | null;
  items: string[];
  platform: string;
  confidenceScore: number;
}

type Recommendation = 'accept' | 'decline' | 'conditional';

interface OfferDecision {
  recommendation: Recommendation;
  effectiveHourlyRate: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  parsedOffer: ParsedOffer;
  generatedAt: string;
}

// ── Config ─────────────────────────────────────────────────────

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const ACCEPT_THRESHOLD = 18;   // $/hr
const DECLINE_THRESHOLD = 12;  // $/hr

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// ── Handler ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set in Supabase secrets');
    return json({ error: 'Service not configured' }, 503);
  }

  let body: { imageBase64?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { imageBase64, platform } = body;
  if (!imageBase64 || !platform) {
    return json({ error: 'imageBase64 and platform are required' }, 400);
  }
  if (!['uber_eats', 'doordash'].includes(platform)) {
    return json({ error: 'platform must be uber_eats or doordash' }, 400);
  }

  try {
    const parsedOffer = await parseOfferWithVision(imageBase64, platform);
    const decision = decideOffer(parsedOffer);
    return json(decision, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('parse-offer error:', message);
    return json({ error: 'parse_failed', message }, 500);
  }
});

// ── Vision Parsing ─────────────────────────────────────────────

async function parseOfferWithVision(imageBase64: string, platform: string): Promise<ParsedOffer> {
  const platformName = platform === 'uber_eats' ? 'Uber Eats' : 'DoorDash';

  const prompt = `You are parsing a ${platformName} delivery offer screenshot.
Extract the following fields and return ONLY valid JSON (no markdown, no explanation):
{
  "payout": <number — base pay in dollars, e.g. 8.50>,
  "distanceMiles": <number — delivery distance in miles, e.g. 3.2>,
  "estimatedMinutes": <number — estimated delivery time in minutes, e.g. 18>,
  "storeName": <string — restaurant/store name, or null if not visible>,
  "items": <array of strings — order items if visible, or empty array>
}
If a numeric field is not visible, use 0. If storeName is not visible, use null.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' } },
        ],
      }],
      max_tokens: 200,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const raw = JSON.parse(data.choices[0].message.content) as {
    payout?: unknown;
    distanceMiles?: unknown;
    estimatedMinutes?: unknown;
    storeName?: unknown;
    items?: unknown;
  };

  const payout = Number(raw.payout) || 0;
  const distanceMiles = Number(raw.distanceMiles) || 0;
  const estimatedMinutes = Number(raw.estimatedMinutes) || 0;

  // Confidence: fraction of 3 core fields that are non-zero
  const coreFieldsFound = [payout, distanceMiles, estimatedMinutes].filter(v => v > 0).length;
  const confidenceScore = coreFieldsFound / 3;

  return {
    payout,
    distanceMiles,
    estimatedMinutes,
    storeName: typeof raw.storeName === 'string' ? raw.storeName : null,
    items: Array.isArray(raw.items) ? (raw.items as string[]) : [],
    platform,
    confidenceScore,
  };
}

// ── Decision Engine ────────────────────────────────────────────

function decideOffer(offer: ParsedOffer): OfferDecision {
  const reasoning: string[] = [];
  let recommendation: Recommendation;
  let confidence: 'high' | 'medium' | 'low';

  const effectiveHourlyRate =
    offer.estimatedMinutes > 0
      ? (offer.payout / offer.estimatedMinutes) * 60
      : 0;

  if (effectiveHourlyRate >= ACCEPT_THRESHOLD) {
    recommendation = 'accept';
    reasoning.push(`Strong hourly rate: $${effectiveHourlyRate.toFixed(2)}/hr`);
  } else if (effectiveHourlyRate <= DECLINE_THRESHOLD) {
    recommendation = 'decline';
    reasoning.push(`Low hourly rate: $${effectiveHourlyRate.toFixed(2)}/hr`);
  } else {
    recommendation = 'conditional';
    reasoning.push(`Marginal rate: $${effectiveHourlyRate.toFixed(2)}/hr — depends on conditions`);
  }

  if (offer.distanceMiles > 8 && offer.payout < 8) {
    recommendation = 'decline';
    reasoning.push(`Long distance (${offer.distanceMiles}mi) with low payout ($${offer.payout})`);
  }

  if (offer.payout < 5) {
    if (recommendation === 'accept') recommendation = 'conditional';
    reasoning.push(`Small payout ($${offer.payout}) — low tip potential`);
  }

  if (offer.confidenceScore >= 0.9) confidence = 'high';
  else if (offer.confidenceScore >= 0.6) confidence = 'medium';
  else {
    confidence = 'low';
    reasoning.push('Some offer details were unclear — verify manually');
  }

  return {
    recommendation,
    effectiveHourlyRate: Math.round(effectiveHourlyRate * 100) / 100,
    confidence,
    reasoning,
    parsedOffer: offer,
    generatedAt: new Date().toISOString(),
  };
}

// ── Helpers ────────────────────────────────────────────────────

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
