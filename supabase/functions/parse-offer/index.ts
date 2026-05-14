import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Types (inline since Edge Functions can't import from workspace packages)
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

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const ACCEPT_THRESHOLD = 18;   // $/hr
const DECLINE_THRESHOLD = 12;  // $/hr

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const { imageBase64, platform } = await req.json();

    if (!imageBase64 || !platform) {
      return new Response(JSON.stringify({ error: 'imageBase64 and platform are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call vision API
    const parsedOffer = await parseOfferWithVision(imageBase64, platform);
    const decision = decideOffer(parsedOffer);

    return new Response(JSON.stringify(decision), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('parse-offer error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function parseOfferWithVision(imageBase64: string, platform: string): Promise<ParsedOffer> {
  const prompt = `Extract delivery offer details from this ${platform} screenshot.
Return ONLY valid JSON with these exact fields:
{
  "payout": <number, dollars, e.g. 8.50>,
  "distanceMiles": <number, e.g. 3.2>,
  "estimatedMinutes": <number, e.g. 18>,
  "storeName": <string or null>,
  "items": <array of strings, or empty array>
}
If a field is not visible, use null for strings or 0 for numbers. Never omit fields.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        },
      ],
      max_tokens: 200,
    }),
  });

  const data = await response.json();
  const raw = JSON.parse(data.choices[0].message.content);

  const payout = Number(raw.payout) || 0;
  const distanceMiles = Number(raw.distanceMiles) || 0;
  const estimatedMinutes = Number(raw.estimatedMinutes) || 0;

  // Confidence: all 3 core fields present and non-zero
  const coreFieldsFound = [payout, distanceMiles, estimatedMinutes].filter(v => v > 0).length;
  const confidenceScore = coreFieldsFound / 3;

  return {
    payout,
    distanceMiles,
    estimatedMinutes,
    storeName: raw.storeName ?? null,
    items: Array.isArray(raw.items) ? raw.items : [],
    platform,
    confidenceScore,
  };
}

function decideOffer(offer: ParsedOffer): OfferDecision {
  const reasoning: string[] = [];
  let recommendation: Recommendation;
  let confidence: 'high' | 'medium' | 'low';

  const effectiveHourlyRate = offer.estimatedMinutes > 0
    ? (offer.payout / offer.estimatedMinutes) * 60
    : 0;

  // Core rate rules
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

  // Distance penalty
  if (offer.distanceMiles > 8 && offer.payout < 8) {
    recommendation = 'decline';
    reasoning.push(`Long distance (${offer.distanceMiles}mi) with low payout ($${offer.payout})`);
  }

  // Small order flag
  if (offer.payout < 5) {
    if (recommendation === 'accept') recommendation = 'conditional';
    reasoning.push(`Small payout ($${offer.payout}) — low tip potential`);
  }

  // Confidence from parse quality
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
