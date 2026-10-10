export type FittedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Where a contain-fitted image actually sits inside a box; the canon
 * overlay on the review screen must cover exactly this rectangle.
 */
export function fitContainRect(contentWidth: number, contentHeight: number, boxWidth: number, boxHeight: number): FittedRect {
  if (contentWidth <= 0 || contentHeight <= 0 || boxWidth <= 0 || boxHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const scale = Math.min(boxWidth / contentWidth, boxHeight / contentHeight);
  const width = contentWidth * scale;
  const height = contentHeight * scale;

  return {
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
    width,
    height
  };
}
