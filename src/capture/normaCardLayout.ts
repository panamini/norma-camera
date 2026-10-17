export type NormaCardLayout = {
  canvasWidth: number;
  canvasHeight: number;
  margin: number;
  bandHeight: number;
  photo: { x: number; y: number; width: number; height: number };
  bandTop: number;
  textSize: number;
  textBaselineY: number;
  textInsetX: number;
  resonanceBarHeight: number;
};

/**
 * The Norma card: the capture as a print — paper mat around the photo,
 * caption band below. Proportions are editorial and fixed: mat = width/24,
 * band = width/8 (an octave of the width). All derived from the photo
 * width so every card reads the same regardless of aspect.
 */
export function normaCardLayout(photoWidth: number, photoHeight: number): NormaCardLayout {
  const safeWidth = Math.max(1, Math.round(photoWidth));
  const safeHeight = Math.max(1, Math.round(photoHeight));
  const margin = Math.max(8, Math.round(safeWidth / 24));
  const bandHeight = Math.max(40, Math.round(safeWidth / 8));
  const textSize = Math.round(bandHeight * 0.3);
  const bandTop = margin + safeHeight;

  return {
    canvasWidth: safeWidth + margin * 2,
    canvasHeight: margin + safeHeight + bandHeight,
    margin,
    bandHeight,
    photo: { x: margin, y: margin, width: safeWidth, height: safeHeight },
    bandTop,
    textSize,
    textBaselineY: bandTop + Math.round(bandHeight / 2 + textSize * 0.35),
    textInsetX: margin,
    resonanceBarHeight: Math.max(3, Math.round(margin / 3))
  };
}

/** The score drawn as a gold bar along the photo's bottom edge. */
export function resonanceBarWidth(score: number, photoWidth: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  return Math.round((clamped / 100) * Math.max(0, photoWidth));
}

export function cardWordmark(): string {
  return 'NORMA'.split('').join(' ');
}
