import * as Haptics from 'expo-haptics';

/**
 * Haptics never block or crash the viewfinder: failures are swallowed.
 * One light tick on node lock, one selection tick on canon change.
 */
export function tickNodeLock(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function tickSelection(): void {
  Haptics.selectionAsync().catch(() => {});
}
