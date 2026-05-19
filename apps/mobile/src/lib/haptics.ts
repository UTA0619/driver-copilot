/**
 * Haptic feedback helpers — gracefully no-ops if expo-haptics not available.
 *
 * Accept → heavy (positive confirmation)
 * Decline → notification error (negative)
 * Conditional → light (soft tap)
 * Button tap → selection (subtle)
 */
import * as Haptics from 'expo-haptics';

function safe(fn: () => Promise<void>): void {
  fn().catch(() => {/* silently ignore — haptics may be unavailable */});
}

export function hapticSuccess(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticError(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

export function hapticWarning(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function hapticLight(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticMedium(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticHeavy(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

export function hapticSelection(): void {
  safe(() => Haptics.selectionAsync());
}

/** Fire the appropriate haptic for a recommendation result */
export function hapticForRecommendation(rec: 'accept' | 'decline' | 'conditional'): void {
  if (rec === 'accept') hapticSuccess();
  else if (rec === 'decline') hapticError();
  else hapticWarning();
}
