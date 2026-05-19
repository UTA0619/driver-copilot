/**
 * parse-offer — Supabase Edge Function
 *
 * Accepts a base64-encoded offer screenshot, runs it through GPT-4o-mini,
 * and returns a structured OfferDecision.
 *
 * Security:
 *   - Requires valid Supabase JWT (Authorization: Bearer <token>)
 *   - Per-user rate limit: 30 calls/minute
 *   - Image size capped at ~2 MB base64
 *   - Explicit input validation on all fields
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Constants ──────────────────────────────────────────────────

const ACCEPT_THRESHOLD = 18;    // $/hr
const DECLINE_THRESHOLD = 12;   // $/hr
const RATE_LIMIT_PER_MINUTE = 30;
const MAX_BASE64_LENGTH = 2_800_000; // ~2 MB raw

const ALLOWED_PLATFORMS = ['uber_eats', 'doordash', 'grubhub', 'instacart'] as const;
type AllowedPlatform = typeof ALLOWED_PLATFORMS[number];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Types ──────────────────────────────────────────────────────

interface RawOffer {
  payoutRaw: string | null;
  distanceRaw: string | null;
  estimatedTimeRaw: string | null;
  storeNameRaw: string | null;
  itemsRaw: string | null;
  platformRaw: string | null;
}

interface ParsedOffer {
  payout: number;
  distanceMiles: number;
  estimatedMinutes: number;
  storeName: string | null;
  items: string[];
  platform: AllowedPlatform;
  confidenceScore: number;
  rawOffer: RawOffer;
}

type Recommendation = 'accept' | 'decline' | 'conditional';
type ConfidenceLevel = 'high' | 'medium' | 'low';

interface OfferDecision {
  recommendation: Recommendation;
  effectiveHourlyRate: number;
  confidence: ConfidenceLevel;
  reasoning: string[];
  parsedOffer: ParsedOffer;
  generatedAt: string;
}

// ── Error Classes ──────────────────────────────────────────────

class AuthError extends Error { constructor(msg: string) { super(msg); this.name = 'AuthError'; } }
class RateLimitError extends Error { constructor(msg: string) { super(msg); this.name = 'RateLimitError'; } }

// ── Helpers ────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function err(code: string, message: string, status: number): Response {
  return json({ error: code, message }, status);
}

// ── Auth ───────────────────────────────────────────────────────

async function authenticateRequest(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or malformed Authorization header');
  }

  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase env not configured');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) throw new AuthError('Invalid or expired token');
  return data.user.id;
}

// ── Rate Limiting ──────────────────────────────────────────────

async function checkRateLimit(userId: string): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) return;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const windowStart = new Date();
  windowStart.setSeconds(0, 0);
  const windowIso = windowStart.toISOString();

  // Fetch current count for this minute window
  const { data: existing } = await supabase
    .from('edge_function_rate_limits')
    .select('call_count')
    .eq('user_id', userId)
    .eq('function_name', 'parse-offer')
    .eq('window_start', windowIso)
    .maybeSingle();

  if (existing) {
    if (existing.call_count >= RATE_LIMIT_PER_MINUTE) {
      throw new RateLimitError(`Rate limit: max ${RATE_LIMIT_PER_MINUTE} calls/minute`);
    }
    await supabase
      .from('edge_function_rate_limits')
      .update({ call_count: existing.call_count + 1 })
      .eq('user_id', userId)
      .eq('function_name', 'parse-offer')
      .eq('window_start', windowIso);
  } else {
    await supabase.from('edge_function_rate_limits').insert({
      user_id: userId,
      function_name: 'parse-offer',
      window_start: windowIso,
      call_count: 1,
    });
  }
}

// ── Decision Engine ────────────────────────────────────────────

export function decideOffer(
  parsed: Omit<ParsedOffer, 'rawOffer'>,
  targetHourlyRate?: number
): Pick<OfferDecision, 'recommendation' | 'effectiveHourlyRate' | 'confidence' | 'reasoning'> {
  const acceptRate = targetHourlyRate ?? ACCEPT_THRESHOLD;
  const declineRate = targetHourlyRate ? targetHourlyRate * 0.67 : DECLINE_THRESHOLD;
  const reasoning: string[] = [];

  if (parsed.estimatedMinutes <= 0) {
    return {
      recommendation: 'conditional',
      effectiveHourlyRate: 0,
      confidence: 'low',
      reasoning: ['Could not determine delivery time — review manually'],
    };
  }

  const effectiveHourlyRate = Math.round((parsed.payout / parsed.estimatedMinutes) * 60 * 100) / 100;
  reasoning.push(
    `Effective rate: $${effectiveHourlyRate.toFixed(2)}/hr ($${parsed.payout.toFixed(2)} ÷ ${parsed.estimatedMinutes} min)`
  );

  const longHaulLowPay = parsed.distanceMiles > 8 && parsed.payout < 8;
  const tinyPayout = parsed.payout < 5;

  const confidence: ConfidenceLevel =
    parsed.confidenceScore >= 0.9 ? 'high'
    : parsed.confidenceScore >= 0.6 ? 'medium'
    : 'low';

  let recommendation: Recommendation;

  if (longHaulLowPay) {
    recommendation = 'decline';
    reasoning.push(`Long haul (${parsed.distanceMiles.toFixed(1)} mi) for only $${parsed.payout.toFixed(2)} — not worth it`);
  } else if (tinyPayout) {
    recommendation = 'decline';
    reasoning.push('Payout under $5 — rarely worth the effort');
  } else if (effectiveHourlyRate >= acceptRate) {
    recommendation = 'accept';
    reasoning.push(`Rate exceeds your $${acceptRate}/hr target ✓`);
    if (parsed.storeName) reasoning.push(`Store: ${parsed.storeName}`);
  } else if (effectiveHourlyRate <= declineRate) {
    recommendation = 'decline';
    reasoning.push(`Rate below $${declineRate.toFixed(0)}/hr minimum`);
  } else {
    recommendation = 'conditional';
    reasoning.push(`Rate between $${declineRate.toFixed(0)}/hr–$${acceptRate}/hr — use your judgment`);
    if (parsed.distanceMiles > 0 && parsed.distanceMiles <= 2) {
      reasoning.push(`Short distance (${parsed.distanceMiles.toFixed(1)} mi) improves value`);
    }
  }

  if (confidence === 'low') {
    reasoning.push('⚠ Low parse confidence — double-check the screenshot');
  }

  return { recommendation, effectiveHourlyRate, confidence, reasoning };
}

// ── Vision Parsing ─────────────────────────────────────────────

async function parseOfferWithAI(imageBase64: string, platform: AllowedPlatform): Promise<ParsedOffer> {
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) throw new Error('OPENAI_API_KEY not configured');

  const platformLabel = { uber_eats: 'Uber Eats', doordash: 'DoorDash', grubhub: 'Grubhub', instacart: 'Instacart' }[platform];

  const prompt = `You are a delivery offer data extractor for ${platformLabel}.
Analyze this screenshot and return ONLY valid JSON (no markdown, no explanation):
{
  "payout": <number in USD>,
  "distanceMiles": <number>,
  "estimatedMinutes": <integer>,
  "storeName": <string or null>,
  "items": [<string>, ...],
  "confidenceScore": <0.0-1.0>,
  "payoutRaw": <string as shown or null>,
  "distanceRaw": <string as shown or null>,
  "estimatedTimeRaw": <string as shown or null>,
  "storeNameRaw": <string as shown or null>,
  "itemsRaw": <string as shown or null>,
  "platformRaw": <platform label as shown or null>
}
Rules: include tip in payout total, estimatedMinutes must be positive integer, confidenceScore 0.9+ only if all main fields clearly visible.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' } },
        ],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);
  }

  const aiResponse = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = aiResponse.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  // deno-lint-ignore no-explicit-any
  const d = JSON.parse(content) as Record<string, any>;

  const rawOffer: RawOffer = {
    payoutRaw: typeof d.payoutRaw === 'string' ? d.payoutRaw : null,
    distanceRaw: typeof d.distanceRaw === 'string' ? d.distanceRaw : null,
    estimatedTimeRaw: typeof d.estimatedTimeRaw === 'string' ? d.estimatedTimeRaw : null,
    storeNameRaw: typeof d.storeNameRaw === 'string' ? d.storeNameRaw : null,
    itemsRaw: typeof d.itemsRaw === 'string' ? d.itemsRaw : null,
    platformRaw: typeof d.platformRaw === 'string' ? d.platformRaw : null,
  };

  const payout = typeof d.payout === 'number' ? d.payout : 0;
  const distanceMiles = typeof d.distanceMiles === 'number' ? d.distanceMiles : 0;
  const estimatedMinutes = typeof d.estimatedMinutes === 'number' ? Math.max(0, Math.round(d.estimatedMinutes)) : 0;
  let confidenceScore = typeof d.confidenceScore === 'number' ? Math.max(0, Math.min(1, d.confidenceScore)) : 0.5;

  // Downgrade confidence if payout is 0 (likely parse failure)
  if (payout === 0) confidenceScore = Math.min(confidenceScore, 0.3);

  return {
    payout,
    distanceMiles,
    estimatedMinutes,
    storeName: typeof d.storeName === 'string' ? d.storeName : null,
    items: Array.isArray(d.items) ? d.items.filter((i: unknown) => typeof i === 'string') : [],
    platform,
    confidenceScore,
    rawOffer,
  };
}

// ── Main Handler ───────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return err('method_not_allowed', 'POST required', 405);

  // 1. Authenticate
  let userId: string;
  try {
    userId = await authenticateRequest(req);
  } catch (e) {
    if (e instanceof AuthError) return err('unauthorized', e.message, 401);
    console.error('Auth error:', e);
    return err('server_error', 'Authentication failed', 503);
  }

  // 2. Parse body
  let body: { imageBase64?: unknown; platform?: unknown; targetHourlyRate?: unknown };
  try {
    body = await req.json();
  } catch {
    return err('bad_request', 'Invalid JSON body', 400);
  }

  const { imageBase64, platform, targetHourlyRate } = body;

  // 3. Validate
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return err('bad_request', 'imageBase64 is required and must be a string', 400);
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return err('payload_too_large', 'Image must be under 2 MB', 413);
  }
  if (!platform || !ALLOWED_PLATFORMS.includes(platform as AllowedPlatform)) {
    return err('bad_request', `platform must be one of: ${ALLOWED_PLATFORMS.join(', ')}`, 400);
  }
  const targetRate = typeof targetHourlyRate === 'number' ? targetHourlyRate : undefined;
  if (targetRate !== undefined && (targetRate < 5 || targetRate > 100)) {
    return err('bad_request', 'targetHourlyRate must be 5–100', 400);
  }

  // 4. Rate limit
  try {
    await checkRateLimit(userId);
  } catch (e) {
    if (e instanceof RateLimitError) return err('rate_limited', e.message, 429);
  }

  // 5. Check config
  if (!Deno.env.get('OPENAI_API_KEY')) {
    console.error('OPENAI_API_KEY not set');
    return err('configuration_error', 'Vision service not configured', 503);
  }

  // 6. Parse
  let parsed: ParsedOffer;
  try {
    parsed = await parseOfferWithAI(imageBase64, platform as AllowedPlatform);
  } catch (e) {
    console.error('AI parse error:', e);
    return err('parse_failed', 'Could not parse the offer screenshot', 422);
  }

  // 7. Decide
  const decision = decideOffer(parsed, targetRate);

  const offerDecision: OfferDecision = {
    ...decision,
    parsedOffer: parsed,
    generatedAt: new Date().toISOString(),
  };

  return json(offerDecision);
});
