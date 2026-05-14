/**
 * Vision API Evaluation Script — OFFER-002
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... GEMINI_API_KEY=... npx ts-node docs/decisions/offer-parsing-test-script.ts
 *
 * Place 10 test screenshots in docs/decisions/test-screenshots/
 * Named: uber_eats_1.jpg ... uber_eats_5.jpg, doordash_1.jpg ... doordash_5.jpg
 */

import fs from 'fs';
import path from 'path';

interface ParsedOffer {
  payout: number | null;
  distanceMiles: number | null;
  estimatedMinutes: number | null;
  storeName: string | null;
}

interface TestResult {
  file: string;
  api: 'gpt4o-mini' | 'gemini-flash';
  parsed: ParsedOffer | null;
  latencyMs: number;
  error?: string;
  rawResponse?: string;
}

const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots');

async function parseWithGPT4oMini(imageBase64: string): Promise<{ result: ParsedOffer | null; latencyMs: number; raw: string }> {
  const start = Date.now();
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Extract delivery offer details. Return JSON with: payout (number, dollars), distanceMiles (number), estimatedMinutes (number), storeName (string or null). Use null if not visible.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
      max_tokens: 200,
    }),
  });
  const latencyMs = Date.now() - start;
  const data = await response.json() as any;
  const raw = data.choices?.[0]?.message?.content ?? '';
  try {
    return { result: JSON.parse(raw), latencyMs, raw };
  } catch {
    return { result: null, latencyMs, raw };
  }
}

async function parseWithGeminiFlash(imageBase64: string): Promise<{ result: ParsedOffer | null; latencyMs: number; raw: string }> {
  const start = Date.now();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Extract delivery offer details. Return ONLY valid JSON with: payout (number), distanceMiles (number), estimatedMinutes (number), storeName (string or null). No markdown.' },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 200 },
      }),
    }
  );
  const latencyMs = Date.now() - start;
  const data = await response.json() as any;
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  // Strip markdown code fences if present
  raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return { result: JSON.parse(raw), latencyMs, raw };
  } catch {
    return { result: null, latencyMs, raw };
  }
}

function scoreAccuracy(result: ParsedOffer | null, groundTruth: ParsedOffer): number {
  if (!result) return 0;
  let correct = 0;
  let total = 0;
  const fields: (keyof ParsedOffer)[] = ['payout', 'distanceMiles', 'estimatedMinutes', 'storeName'];
  for (const field of fields) {
    if (groundTruth[field] === null) continue;
    total++;
    const gt = groundTruth[field];
    const got = result[field];
    if (typeof gt === 'number' && typeof got === 'number') {
      if (Math.abs(gt - got) / gt < 0.05) correct++; // within 5%
    } else if (typeof gt === 'string' && typeof got === 'string') {
      if (got.toLowerCase().includes(gt.toLowerCase().split(' ')[0])) correct++;
    }
  }
  return total > 0 ? correct / total : 0;
}

async function main() {
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.jpg'));
  const results: TestResult[] = [];

  console.log(`Testing ${files.length} screenshots against both APIs...\n`);

  for (const file of files) {
    const imageBase64 = fs.readFileSync(path.join(SCREENSHOTS_DIR, file)).toString('base64');

    const gpt = await parseWithGPT4oMini(imageBase64);
    results.push({ file, api: 'gpt4o-mini', parsed: gpt.result, latencyMs: gpt.latencyMs, rawResponse: gpt.raw });

    const gemini = await parseWithGeminiFlash(imageBase64);
    results.push({ file, api: 'gemini-flash', parsed: gemini.result, latencyMs: gemini.latencyMs, rawResponse: gemini.raw });

    console.log(`${file}:`);
    console.log(`  GPT-4o-mini:    ${gpt.latencyMs}ms | ${gpt.result ? 'parsed' : 'FAILED'}`);
    console.log(`  Gemini Flash:   ${gemini.latencyMs}ms | ${gemini.result ? 'parsed' : 'FAILED'}`);
  }

  // Summary
  const gptResults = results.filter(r => r.api === 'gpt4o-mini');
  const geminiResults = results.filter(r => r.api === 'gemini-flash');

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const p95 = (arr: number[]) => arr.sort((a, b) => a - b)[Math.floor(arr.length * 0.95)];

  console.log('\n=== SUMMARY ===');
  console.log(`GPT-4o-mini:  P50=${avg(gptResults.map(r => r.latencyMs)).toFixed(0)}ms  P95=${p95(gptResults.map(r => r.latencyMs))}ms  Parse rate=${(gptResults.filter(r => r.parsed).length / gptResults.length * 100).toFixed(0)}%`);
  console.log(`Gemini Flash: P50=${avg(geminiResults.map(r => r.latencyMs)).toFixed(0)}ms  P95=${p95(geminiResults.map(r => r.latencyMs))}ms  Parse rate=${(geminiResults.filter(r => r.parsed).length / geminiResults.length * 100).toFixed(0)}%`);
}

main().catch(console.error);
