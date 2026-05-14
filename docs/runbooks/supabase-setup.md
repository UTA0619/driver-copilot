# Supabase Setup Runbook

One-time setup. Takes ~30 minutes. Done once by the engineer.

---

## 1. Create Projects (browser — supabase.com)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create **two projects**:
   - Name: `driver-copilot-staging` | Region: US West (or closest to you)
   - Name: `driver-copilot-prod` | Region: US West
3. For each project, copy and save:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **Anon Key** (Settings → API → Project API keys → `anon public`)
   - **Service Role Key** (Settings → API → `service_role` — keep secret)

---

## 2. Apply Migrations

```bash
# Staging
supabase link --project-ref YOUR_STAGING_PROJECT_REF
supabase db push

# Verify in Supabase Studio (staging):
# Tables: user_profiles, deliveries, zones, zone_performance, coaching_insights
# Extensions: uuid-ossp, postgis enabled
```

For production, repeat with the prod project ref before launch.

---

## 3. Set Edge Function Secrets

```bash
# Set OpenAI key for the parse-offer function
supabase secrets set OPENAI_API_KEY=sk-... --project-ref YOUR_STAGING_PROJECT_REF
supabase secrets set OPENAI_API_KEY=sk-... --project-ref YOUR_PROD_PROJECT_REF

# Verify
supabase secrets list --project-ref YOUR_STAGING_PROJECT_REF
```

---

## 4. Deploy Edge Functions

```bash
# From repo root
supabase functions deploy parse-offer --project-ref YOUR_STAGING_PROJECT_REF

# Test the deployed function
curl -X POST https://YOUR_STAGING_PROJECT_REF.supabase.co/functions/v1/parse-offer \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "iVBORw0KGgo=", "platform": "uber_eats"}' 
# Expected: {"error":"parse_failed"} (tiny image, but function responds = working)
```

---

## 5. Configure Auth Providers (browser)

### Apple OAuth (required for iOS App Store)
1. Supabase Dashboard → Authentication → Providers → Apple
2. Enable Apple provider
3. Add: Service ID, Team ID, Key ID, Private Key
4. Redirect URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
5. In Apple Developer Console: add the redirect URL to your Service ID

### Google OAuth (optional, for Android)
1. Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider
3. Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
4. Add Client ID and Client Secret

---

## 6. Fill .env.local

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_STAGING_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # server-side only

EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
EXPO_PUBLIC_POSTHOG_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
EXPO_PUBLIC_APP_ENV=development
```

---

## 7. Add GitHub Secrets

Required for CI and EAS builds:

| Secret name | Value | Used by |
|-------------|-------|---------|
| `EXPO_TOKEN` | Expo access token from expo.dev | EAS build workflow |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token | (future: migration CI) |

Add at: `github.com/UTA0619/driver-copilot/settings/secrets/actions`

---

## 8. Verify Local Dev

```bash
# Start local Supabase stack
supabase start
# Output includes: API URL, Anon Key, DB URL, Studio URL

# Apply migrations locally
supabase db push

# Run seed data
supabase db seed

# Verify in Studio
open http://localhost:54323
# Check: all 5 tables exist, seed data visible in deliveries table

# Start mobile app
pnpm --filter mobile dev
# Sign up with a test email → should create user_profiles row
```

---

## 9. Checklist

- [ ] `driver-copilot-staging` project created
- [ ] `driver-copilot-prod` project created
- [ ] Migrations applied to staging (`supabase db push`)
- [ ] `OPENAI_API_KEY` secret set in staging
- [ ] `parse-offer` Edge Function deployed to staging
- [ ] Apple OAuth configured (staging)
- [ ] `.env.local` filled with staging values
- [ ] `EXPO_TOKEN` added to GitHub Secrets
- [ ] `supabase start` works locally
- [ ] Mobile app signs up and creates `user_profiles` row
