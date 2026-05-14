// ─── User ─────────────────────────────────────────────────────

export type Platform = 'uber_eats' | 'doordash' | 'both';
export type AppEnv = 'development' | 'staging' | 'production';

export interface UserProfile {
  id: string;
  email: string;
  platforms: Platform[];
  primaryCity: string;
  isPro: boolean;
  createdAt: string;
  onboardingCompletedAt: string | null;
}

// ─── Offer ────────────────────────────────────────────────────

/** Raw fields extracted by vision API — may be null if not found */
export interface RawOffer {
  payoutRaw: string | null;       // e.g. "$8.50"
  distanceRaw: string | null;     // e.g. "3.2 mi"
  estimatedTimeRaw: string | null; // e.g. "18 min"
  storeNameRaw: string | null;
  itemsRaw: string | null;
  platformRaw: string | null;
}

/** Typed, validated offer fields */
export interface ParsedOffer {
  payout: number;                 // dollars
  distanceMiles: number;
  estimatedMinutes: number;
  storeName: string | null;
  items: string[];
  platform: Platform;
  confidenceScore: number;        // 0–1, how confident the parse was
  rawOffer: RawOffer;
}

export type Recommendation = 'accept' | 'decline' | 'conditional';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface OfferDecision {
  recommendation: Recommendation;
  effectiveHourlyRate: number;    // dollars per hour
  confidence: ConfidenceLevel;
  reasoning: string[];            // human-readable bullet points
  parsedOffer: ParsedOffer;
  generatedAt: string;
}

// ─── Delivery / Earnings ─────────────────────────────────────

export interface Delivery {
  id: string;
  userId: string;
  platform: Platform;
  payout: number;
  tip: number;
  distanceMiles: number;
  durationMinutes: number;
  startedAt: string;
  endedAt: string;
  zoneH3Index: string | null;
  acceptedRecommendation: boolean | null; // null = no recommendation was made
  createdAt: string;
}

export interface EarningsSummary {
  totalEarnings: number;
  totalTips: number;
  deliveryCount: number;
  totalActiveHours: number;
  effectiveHourlyRate: number;
  periodStart: string;
  periodEnd: string;
}

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
  dailyRecommendationsLimit: number;
  heatmapEnabled: boolean;
  weeklyCoachingEnabled: boolean;
}
