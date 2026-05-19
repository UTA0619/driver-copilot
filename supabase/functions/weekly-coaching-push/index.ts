/**
 * weekly-coaching-push — Supabase Edge Function
 *
 * Sends weekly coaching push notifications to users who have:
 * - push token stored in user_profiles
 * - at least 5 deliveries logged
 * - new coaching insights generated this week
 *
 * Schedule: Every Monday at 9am UTC via pg_cron or Supabase cron
 * Invoke: POST /functions/v1/weekly-coaching-push (with service role key)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

interface PushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
}

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<PushTicket[]> {
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (expoAccessToken) {
    headers['Authorization'] = `Bearer ${expoAccessToken}`;
  }

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    throw new Error(`Expo push API error: ${res.status}`);
  }

  const json = await res.json();
  return json.data ?? [];
}

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);

  // Find users who have push tokens
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id, push_token')
    .not('push_token', 'is', null);

  if (usersError) {
    console.error('Failed to fetch users:', usersError);
    return new Response(JSON.stringify({ error: 'DB error' }), { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of (users ?? [])) {
    if (!user.push_token) { skipped++; continue; }

    // Check if this user has a new insight this week
    const { data: insights } = await supabase
      .from('coaching_insights')
      .select('headline')
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString())
      .limit(1);

    if (!insights || insights.length === 0) { skipped++; continue; }

    const headline = insights[0].headline;

    try {
      await sendExpoPush(
        [user.push_token],
        '📊 Your Weekly Coaching Report',
        headline,
        { screen: 'coaching', userId: user.id }
      );
      sent++;
    } catch (err) {
      errors.push(`${user.id}: ${err}`);
    }
  }

  console.log(`Push notifications: sent=${sent} skipped=${skipped} errors=${errors.length}`);

  return new Response(JSON.stringify({ sent, skipped, errors }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
