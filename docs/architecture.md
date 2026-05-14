# Architecture — Driver Copilot

## System Overview

```
Driver's Phone
  └── apps/mobile (React Native + Expo)
        ├── Auth          → Supabase Auth
        ├── Offer Parse   → Edge Function: parse-offer → GPT-4o-mini Vision
        ├── Earnings      → Supabase PostgreSQL (deliveries table)
        ├── Heatmap       → Supabase RPC (PostGIS zones) → Mapbox render
        ├── Coaching      → Supabase (coaching_insights table)
        ├── Subscription  → RevenueCat → Supabase (user_profiles.is_pro)
        ├── Analytics     → PostHog
        └── Crash logs    → Sentry
```

## Offer Parsing Data Flow

```
1. Driver taps "Analyze Offer"
2. Mobile: opens image picker, user selects screenshot
3. Mobile: compresses image (max 800px, JPEG 80%)
4. Mobile: POST to Supabase Edge Function /parse-offer
   - Auth header: Supabase JWT
   - Body: { imageBase64: string, platform: 'uber_eats' | 'doordash' }
5. Edge Function: calls GPT-4o-mini Vision API (key in Supabase secrets)
6. Edge Function: parses JSON response → ParsedOffer
7. Edge Function: runs rules engine → OfferDecision
8. Edge Function: returns OfferDecision to mobile
9. Mobile: renders decision result card
10. Image is NOT stored anywhere — discarded after API call
```

## Database Schema (simplified)

```sql
user_profiles       -- extended user data, isPro, platforms, city
deliveries          -- individual delivery records
zones               -- H3-indexed geographic zones (PostGIS)
zone_performance    -- avg payout/wait per zone per time-of-day
coaching_insights   -- weekly AI-generated driver insights
```

## Performance Targets

| Flow | Target | Measurement |
|------|--------|-------------|
| Offer recommendation | < 3s P95 | PostHog: `latency_ms` on `recommendation_generated` |
| Earnings screen load | < 1s | PostHog: `latency_ms` on `earnings_screen_viewed` |
| Map render | < 2s | PostHog: `latency_ms` on `map_viewed` |
| App cold start | < 2s | Sentry Performance |

## Architecture Decisions

See `docs/decisions/` for ADRs.

- [ADR-001](decisions/ADR-001-vision-api-choice.md) — Vision API selection (GPT-4o-mini vs Gemini Flash)
