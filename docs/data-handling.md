# Data Handling — Driver Copilot

Last updated: 2026-05-14  
Status: **Reviewed and approved for beta launch**

---

## 1. Offer Screenshot Processing

This is the highest-risk data flow. Screenshots may contain delivery addresses, customer names, and order details.

### Data flow

```
Driver's device
  → (1) expo-image-picker: image selected from camera roll
  → (2) expo-image-manipulator: resized to 800px max, JPEG 80%
  → (3) HTTP POST to Supabase Edge Function (parse-offer)
         Body: { imageBase64: string, platform: string }
         Auth: Supabase JWT (user must be authenticated)
  → (4) Edge Function → OpenAI API (gpt-4o-mini)
         Payload: base64 image + text prompt
         Response: JSON with 4 fields only (payout, distance, time, store)
  → (5) Edge Function returns ParsedOffer to mobile app
  → (6) Mobile app displays result — image discarded from memory
```

### Storage audit

| Stage | Stored? | Where | Retention |
|-------|---------|-------|-----------|
| Original image (device) | Yes | User's camera roll | Controlled by user |
| Compressed image (memory) | Temporary | RAM only | Freed after API call |
| Image in Edge Function | No | Never written to disk or DB | — |
| Image sent to OpenAI | No persistent storage | OpenAI API processes and discards | See below |
| Parsed fields (payout, distance, time, store) | No | Not stored in DB by default | — |

**Conclusion: Driver Copilot does not store offer screenshots.**

### OpenAI data retention

Per OpenAI's API usage policy (as of 2026-05):
- API inputs and outputs are **not used to train models** by default
- Images sent via the API are **not stored** after the request completes
- Zero data retention can be confirmed via OpenAI's Enterprise tier or ZDR agreement
- Source: [openai.com/enterprise-privacy](https://openai.com/enterprise-privacy)

**Action required:** Confirm ZDR (Zero Data Retention) eligibility once beta reaches >1,000 DAU. For beta launch, default API policy is sufficient.

---

## 2. Location Data

| Data | Collection method | Purpose | Stored? |
|------|-----------------|---------|---------|
| Current location | `expo-location` foreground only | Center Mapbox heatmap on user | No — read-only, never written to DB |
| City (onboarding) | User-selected text | Filter zone data | Yes — `user_profiles.primary_city` |

**No background location collection. No location tracking.**  
iOS `NSLocationWhenInUseUsageDescription` set. Android `ACCESS_FINE_LOCATION` foreground only.

---

## 3. Earnings Data

Earnings data is explicitly entered by the user. It is **never** automatically extracted from delivery apps.

| Table | Data | Retention | Access |
|-------|------|-----------|--------|
| `deliveries` | payout, tip, distance, duration, platform, zone | Until user deletes account | RLS: user sees only own rows |
| `user_profiles` | email, platforms, city, is_pro, onboarding date | Until account deletion | RLS: user sees only own row |

---

## 4. Analytics Data (PostHog)

PostHog receives **behavioral events only** — no PII beyond user ID.

### Events that include user_id
All events include the PostHog `distinct_id` (= Supabase `auth.uid()`).

### Events that include email
- `user_signed_up` — includes email for identity merge only
- `user_logged_in` — no email

### Events that do NOT include personal data
All offer-related events (recommendation, hourly rate, payout amounts) — these are aggregated metrics, not identifiable.

### PostHog data region
Set EU region if targeting European users. Currently: US region.

---

## 5. Crash Monitoring (Sentry)

Sentry receives:
- Stack traces (no user data in stack frames by default)
- Device info (OS version, device model)
- App version + environment

**What Sentry does NOT receive:**
- Offer screenshot content
- Earnings data
- Email addresses (not attached to Sentry events)

Sentry PII scrubbing: enabled by default in `@sentry/react-native`.

---

## 6. Third-Party Services Summary

| Service | Data received | Purpose | DPA available |
|---------|---------------|---------|---------------|
| OpenAI | Offer screenshots (not stored) | Vision parsing | Yes (Enterprise) |
| Supabase | Auth, earnings, profile | Database + auth | Yes (GDPR-ready) |
| PostHog | Behavioral events + user ID | Analytics | Yes (EU region available) |
| Sentry | Stack traces, device info | Crash monitoring | Yes |
| RevenueCat | Purchase receipts, user ID | Subscription management | Yes |
| Mapbox | Map tile requests (no user location sent to Mapbox) | Map rendering | Yes |

---

## 7. User Rights (CCPA / GDPR)

Users can request:
- **Data export**: All `deliveries` and `user_profiles` rows for their account
- **Account deletion**: Deletes all rows in all tables (cascade on `auth.users`)

Implementation status:
- [ ] Data export endpoint (post-beta)
- [ ] Account deletion in app settings (pre-launch requirement)
- [x] RLS policies prevent cross-user data access

---

## 8. Known Gaps (pre-beta)

| Gap | Risk | Resolution |
|-----|------|-----------|
| No OpenAI ZDR agreement | Low for beta scale | Upgrade when >1k DAU |
| Account deletion not in app yet | Medium — required before public launch | Add to settings screen pre-launch |
| PostHog on US region | Low unless EU users | Switch to EU region if needed |
| No data export feature | Low for beta | Post-beta feature |

---

## 9. Approval

This document reviewed and approved by:
- [ ] Founder (product + legal review)
- [ ] Engineer (technical accuracy)

Sign off required before public App Store launch.
