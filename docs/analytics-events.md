# Analytics Events — Driver Copilot

All events are tracked via PostHog React Native SDK.

## Naming Convention

`noun_verb` — snake_case, past tense where possible.

Example: `offer_parse_succeeded`, `paywall_viewed`, `delivery_logged`

## Required Properties (all events)

| Property | Type | Notes |
|----------|------|-------|
| `user_id` | string | PostHog distinct ID |
| `platform` | `ios` \| `android` | Device platform |
| `app_version` | string | e.g. `0.1.0-beta.1` |
| `app_env` | string | `development` \| `staging` \| `production` |

---

## App Lifecycle

| Event | Trigger | Extra Properties |
|-------|---------|-----------------|
| `app_opened` | App foreground | `is_cold_start: boolean` |
| `user_signed_up` | New account created | `auth_method: email\|apple\|google` |
| `user_logged_in` | Existing user signs in | `auth_method` |
| `onboarding_completed` | Onboarding flow finished | `platforms: string[]`, `city: string` |

---

## Offer Decision Flow

| Event | Trigger | Extra Properties |
|-------|---------|-----------------|
| `offer_capture_started` | Tapped "Analyze Offer" button | — |
| `offer_parse_succeeded` | Vision API returned successfully | `driver_platform: uber_eats\|doordash`, `latency_ms: number`, `confidence_score: number` |
| `offer_parse_failed` | Vision API error | `error_type: string` |
| `recommendation_generated` | Decision engine returned result | `recommendation: accept\|decline\|conditional`, `effective_hourly_rate: number`, `confidence: high\|medium\|low` |
| `recommendation_viewed` | Result card shown to user | `recommendation`, `effective_hourly_rate` |

---

## Earnings Tracking

| Event | Trigger | Extra Properties |
|-------|---------|-----------------|
| `delivery_logged` | User submitted delivery form | `driver_platform`, `payout: number`, `duration_minutes: number` |
| `earnings_screen_viewed` | Earnings tab opened | `daily_total: number`, `weekly_total: number`, `hourly_rate: number` |

---

## Heatmap

| Event | Trigger | Extra Properties |
|-------|---------|-----------------|
| `map_viewed` | Map/Heatmap tab opened | — |
| `time_filter_changed` | User changed time of day filter | `time_of_day: morning\|lunch\|dinner\|late_night` |
| `zone_tapped` | User tapped a zone on map | `h3_index: string`, `avg_payout: number` |

---

## Coaching

| Event | Trigger | Extra Properties |
|-------|---------|-----------------|
| `coaching_insight_viewed` | Insight card visible on screen | `insight_type: string`, `week_start: string` |

---

## Subscription & Paywall

| Event | Trigger | Extra Properties |
|-------|---------|-----------------|
| `paywall_viewed` | Paywall screen shown | `trigger_source: string` (e.g. `offer_limit_hit`, `heatmap_locked`, `manual_upgrade`) |
| `purchase_started` | User tapped upgrade CTA | `product_id: string`, `billing_period: monthly\|annual` |
| `purchase_completed` | Purchase successful | `product_id`, `billing_period`, `revenue_usd: number` |
| `purchase_failed` | Purchase failed or cancelled | `error_type: string` |
| `entitlement_check_failed` | Free user hit a Pro limit | `feature: string` |
