// ─── Platform ─────────────────────────────────────────────────
// DeliveryPlatform: used for a single delivery record (no 'both')
export type DeliveryPlatform = 'uber_eats' | 'doordash' | 'grubhub' | 'instacart';

// UserPlatformPreference: used in user_profiles.platforms (can select multiple individually)
export type UserPlatformPreference = DeliveryPlatform;

/** @deprecated Use DeliveryPlatform or UserPlatformPreference */
export type Platform = DeliveryPlatform;

export type AppEnv = 'development' | 'staging' | 'production';

// ─── User ─────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  /** Platforms this driver uses — stored as an array of DeliveryPlatform */
  platforms: UserPlatformPreference[];
  primaryCity: string;
  isPro: boolean;
  createdAt: string;
  onboardingCompletedAt: string | null;
  displayName: string | null;
}

// ─── Offer ────────────────────────────────────────────────────

/** Raw fields extracted by vision API — may be null if not found in the screenshot */
export interface RawOffer {
  payoutRaw: string | null;        // e.g. "$8.50"
  distanceRaw: string | null;      // e.g. "3.2 mi"
  estimatedTimeRaw: string | null; // e.g. "18 min"
  storeNameRaw: string | null;
  itemsRaw: string | null;
  platformRaw: string | null;
}

/** Typed, validated offer fields */
export interface ParsedOffer {
  /** Payout in USD dollars */
  payout: number;
  distanceMiles: number;
  /** Estimated delivery time in minutes */
  estimatedMinutes: number;
  storeName: string | null;
  items: string[];
  platform: DeliveryPlatform;
  /** 0–1, how confident the parse was */
  confidenceScore: number;
  rawOffer: RawOffer;
}

export type Recommendation = 'accept' | 'decline' | 'conditional';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface OfferDecision {
  recommendation: Recommendation;
  /** Effective hourly rate in USD dollars */
  effectiveHourlyRate: number;
  confidence: ConfidenceLevel;
  /** Human-readable bullet points explaining the recommendation */
  reasoning: string[];
  parsedOffer: ParsedOffer;
  generatedAt: string;
}

// ─── Delivery / Earnings ─────────────────────────────────────

export interface Delivery {
  id: string;
  userId: string;
  platform: DeliveryPlatform;
  /** Payout in USD dollars */
  payout: number;
  /** Tip in USD dollars */
  tip: number;
  distanceMiles: number;
  durationMinutes: number;
  startedAt: string;
  endedAt: string;
  zoneH3Index: string | null;
  /** null = no recommendation was shown for this delivery */
  acceptedRecommendation: boolean | null;
  notes: string | null;
  createdAt: string;
}

export interface EarningsSummary {
  /** Total earnings (payout + tip) in USD */
  totalEarnings: number;
  totalTips: number;
  deliveryCount: number;
  /** Total active driving time in hours */
  totalActiveHours: number;
  /** effectiveHourlyRate = totalEarnings / totalActiveHours */
  effectiveHourlyRate: number;
  periodStart: string;
  periodEnd: string;
}

export type EarningsPeriod = 'today' | 'week' | 'month';

// ─── Zone / Heatmap ──────────────────────────────────────────

export type TimeOfDay = 'morning' | 'lunch' | 'dinner' | 'late_night';

export interface Zone {
  h3Index: string;
  city: string;
  label: string | null;
  geometry: GeoJSON.Polygon;
}

export interface ZonePerformance {
  h3Index: string;
  timeOfDay: TimeOfDay;
  /** Average payout in USD */
  avgPayout: number;
  avgWaitMinutes: number;
  sampleCount: number;
  updatedAt: string;
}

// ─── Coaching ────────────────────────────────────────────────

export type InsightType =
  | 'timing_suggestion'
  | 'zone_suggestion'
  | 'earnings_trend'
  | 'recommendation_follow_rate';

export interface CoachingInsight {
  id: string;
  userId: string;
  weekStart: string;
  insightType: InsightType;
  headline: string;
  body: string;
  dataSnapshot: Record<string, unknown>;
  createdAt: string;
}

// ─── Subscription ────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro';

export interface Entitlements {
  tier: SubscriptionTier;
  isPro: boolean;
  dailyRecommendationsUsed: number;
  /** -1 = unlimited */
  dailyRecommendationsLimit: number;
  heatmapEnabled: boolean;
  weeklyCoachingEnabled: boolean;
}

// ─── Analytics Event Names (type-safe) ───────────────────────

export type AnalyticsEvent =
  | 'app_opened'
  | 'user_signed_up'
  | 'user_logged_in'
  | 'user_signed_in_apple'
  | 'user_signed_out'
  | 'onboarding_completed'
  | 'offer_capture_started'
  | 'offer_parse_succeeded'
  | 'offer_parse_failed'
  | 'recommendation_generated'
  | 'delivery_logged'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'coaching_insight_viewed'
  | 'map_heatmap_viewed';
