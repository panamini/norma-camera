export const BURN_IN_MAX_DIMENSION = 2048;

export type BurnInSize = {
  width: number;
  height: number;
};

/**
 * Burn-in renders a downscaled copy (never the original file): cap the
 * longest side to keep memory bounded on-device.
 */
export function burnInTargetSize(width: number, height: number, maxDimension = BURN_IN_MAX_DIMENSION): BurnInSize {
  if (width <= 0 || height <= 0 || maxDimension <= 0) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

export function burnInStrokeWidth(targetWidth: number): number {
  return Math.max(2, Math.round(targetWidth / 500));
}

export function burnInTickHalfLength(targetWidth: number): number {
  return Math.max(8, Math.round(targetWidth / 80));
}
