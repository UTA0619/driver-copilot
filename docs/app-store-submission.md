# App Store & Google Play Submission Guide

## Prerequisites

### Apple App Store
1. Apple Developer Account ($99/year) — https://developer.apple.com
2. Create app record in App Store Connect — https://appstoreconnect.apple.com
3. Note your: Apple ID (email), ASC App ID (numeric), Team ID

### Google Play Store  
1. Google Play Developer Account ($25 one-time) — https://play.google.com/console
2. Create app record
3. Download service account JSON key from Google Cloud Console

## Environment Variables (set in EAS dashboard or .env.local)

```
APPLE_ID=your@email.com
ASC_APP_ID=1234567890
APPLE_TEAM_ID=ABCDEFGHIJ
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
EXPO_PUBLIC_POSTHOG_KEY=phc_xxxxx
EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Build & Submit Commands

```bash
# 1. Login to EAS
eas login

# 2. Configure project (first time only)
eas build:configure

# 3. Build for both platforms
eas build --platform all --profile production

# 4. Submit to both stores
eas submit --platform all --profile production

# Or submit separately:
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

## TestFlight / Internal Testing (before App Store review)

```bash
# iOS — builds go to TestFlight automatically via EAS Submit
# Invite testers in App Store Connect > TestFlight

# Android — builds go to Internal Testing track
# Add testers in Google Play Console > Internal Testing
```

## App Store Listing Checklist

- [ ] Screenshots (6.7" iPhone, 5.5" iPhone, iPad if supported)
- [ ] App icon 1024×1024px
- [ ] Description (see metadata/en-US/description.txt)
- [ ] Keywords (see metadata/en-US/keywords.txt)
- [ ] Privacy policy URL: https://drivercopilot.app/privacy
- [ ] Support URL: https://drivercopilot.app/support
- [ ] Category: Productivity (primary), Finance (secondary)
- [ ] Age rating: 4+ (no objectionable content)
- [ ] Price: Free (with In-App Purchase for Pro)

## In-App Purchase Setup

### App Store Connect
1. Go to your app → In-App Purchases → Create New
2. Type: Auto-Renewable Subscription
3. Product ID: `dc_pro_monthly`
4. Price: $6.99/month with 7-day free trial
5. Product ID: `dc_pro_annual`  
6. Price: $49.99/year with 7-day free trial

### Google Play Console
1. Go to Monetize → Products → Subscriptions
2. Create subscription group "Driver Copilot Pro"
3. Add base plans matching App Store prices

## Landing Page Deployment

```bash
# Deploy to Vercel
vercel --cwd apps/web

# Or connect GitHub repo to Vercel dashboard
# Set root directory to: apps/web
```
