# Driver Copilot

AI copilot for delivery drivers. Real-time offer decisions, earnings tracking, and zone intelligence.

Built for Uber Eats and DoorDash drivers. One metric: effective hourly earnings.

---

## Why this exists

Every delivery app shows you an offer. None tell you if it's worth taking.

Driver Copilot parses the offer, estimates your effective hourly rate, and returns a clear **Accept / Decline / Consider** recommendation before the 30-second clock runs out.

---

## Core Features (MVP)

| Feature | What it does |
|---------|-------------|
| **Offer Decision** | Parses offer screenshot → recommends Accept / Decline / Conditional |
| **Earnings Tracking** | Logs deliveries, calculates true hourly rate |
| **Heatmap** | Shows high-value zones by time of day |
| **Weekly Coaching** | Identifies patterns, suggests better timing and zones |
| **Pro Subscription** | Unlocks unlimited recommendations + heatmap + coaching |

---

## Architecture

```
apps/
  mobile/       React Native + Expo (iOS + Android)
  landing/      Waitlist and marketing page
packages/
  types/        Shared TypeScript types
  config/       Shared ESLint + Prettier config
supabase/
  migrations/   PostgreSQL schema (PostGIS enabled)
  functions/    Edge Functions (offer parsing, decision engine)
docs/
  architecture.md
  analytics-events.md
  decisions/    Architecture Decision Records
```

**Offer parsing flow:**
```
Screenshot → Mobile (compress) → Edge Function → GPT-4o-mini → ParsedOffer → Rules Engine → Decision → UI
```
Images are never stored. Discarded after the API call.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo, TypeScript |
| Backend | Supabase (PostgreSQL + PostGIS) |
| Auth | Supabase Auth |
| AI Parsing | GPT-4o-mini Vision API |
| Maps | Mapbox |
| Subscriptions | RevenueCat |
| Analytics | PostHog |
| Crash monitoring | Sentry |
| CI/CD | GitHub Actions + Expo EAS |

---

## Local Setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [EAS CLI](https://docs.expo.dev/eas/) (`npm install -g eas-cli`)

### Steps

```bash
# 1. Clone and install
git clone https://github.com/UTA0619/driver-copilot
cd driver-copilot
pnpm install

# 2. Environment
cp .env.example .env.local
# Fill in values (ask for staging keys)

# 3. Start local Supabase
supabase start
supabase db push

# 4. Start mobile dev server
pnpm --filter mobile dev
```

### Run on device

```bash
pnpm --filter mobile ios      # iOS simulator
pnpm --filter mobile android  # Android emulator
eas build --profile preview   # Physical device via EAS
```

---

## Environment Variables

All documented in [.env.example](.env.example).

Key variables:
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- `EXPO_PUBLIC_POSTHOG_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`

---

## Branch Strategy

- `main` — protected, requires CI pass + PR review
- `feature/short-description` — feature branches
- `fix/short-description` — bug fixes
- `chore/short-description` — infrastructure

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

---

## Status

Active development. Beta target: Week 6.

[GitHub Project Board](https://github.com/UTA0619/driver-copilot/projects)
