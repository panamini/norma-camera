import { FontStyle, ImageFormat, PaintStyle, Skia, type SkCanvas, type SkFont } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { canonLineSegments, canonNodePoints } from '../composition/canonGeometry';
import { canonById } from '../composition/canons';
import type { CanonDefinition } from '../composition/types';
import type { CapturedPhoto } from '../state/cameraUiStore';
import { normaColors } from '../ui/theme';
import { burnInStrokeWidth, burnInTargetSize, burnInTickHalfLength } from './burnInGeometry';
import { burnInFileName } from './constructExport';
import { cardWordmark, normaCardLayout, resonanceBarWidth } from './normaCardLayout';

/**
 * Draws the canon construction (faint lines + node ticks) over a width×height
 * area at the canvas origin — exactly the shared viewfinder geometry.
 */
function drawCanonConstruction(canvas: SkCanvas, canon: CanonDefinition, width: number, height: number): void {
  const linePaint = Skia.Paint();
  linePaint.setStyle(PaintStyle.Stroke);
  linePaint.setAntiAlias(true);
  linePaint.setColor(Skia.Color(normaColors.paper));
  linePaint.setAlphaf(0.55);
  linePaint.setStrokeWidth(burnInStrokeWidth(width));

  for (const segment of canonLineSegments(canon, width, height)) {
    canvas.drawLine(segment.x1, segment.y1, segment.x2, segment.y2, linePaint);
  }

  const tickPaint = Skia.Paint();
  tickPaint.setStyle(PaintStyle.Stroke);
  tickPaint.setAntiAlias(true);
  tickPaint.setColor(Skia.Color(normaColors.paper));
  tickPaint.setAlphaf(0.8);
  tickPaint.setStrokeWidth(burnInStrokeWidth(width));

  const tickHalfLength = burnInTickHalfLength(width);
  for (const node of canonNodePoints(canon, width, height)) {
    canvas.drawLine(node.x - tickHalfLength, node.y, node.x + tickHalfLength, node.y, tickPaint);
    canvas.drawLine(node.x, node.y - tickHalfLength, node.x, node.y + tickHalfLength, tickPaint);
  }
}

/** Band text is optional: a missing system monospace never fails the card. */
function makeCardFont(size: number): SkFont | null {
  try {
    const typeface = Skia.FontMgr.System().matchFamilyStyle('monospace', FontStyle.Normal);
    if (!typeface) return null;
    return Skia.Font(typeface, size);
  } catch {
    return null;
  }
}

/**
 * Renders the capture as a Norma card: paper mat, the photo with its canon
 * construction drawn in, a gold resonance bar along the photo's bottom edge
 * (length = score), and a caption band (wordmark · canon / score). Written
 * to the app cache on-device; the original capture is never modified.
 */
export async function renderNormaCard(photo: CapturedPhoto): Promise<string> {
  const data = await Skia.Data.fromURI(photo.uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error('Could not decode the captured photo.');
  }

  const target = burnInTargetSize(image.width(), image.height());
  if (target.width <= 0 || target.height <= 0) {
    throw new Error('Captured photo has no drawable size.');
  }

  const layout = normaCardLayout(target.width, target.height);
  const surface = Skia.Surface.Make(layout.canvasWidth, layout.canvasHeight);
  if (!surface) {
    throw new Error('Could not create the card surface.');
  }

  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color(normaColors.paper));

  const imagePaint = Skia.Paint();
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, image.width(), image.height()),
    Skia.XYWHRect(layout.photo.x, layout.photo.y, layout.photo.width, layout.photo.height),
    imagePaint
  );

  const canon = canonById(photo.canonId);
  canvas.save();
  canvas.translate(layout.photo.x, layout.photo.y);
  drawCanonConstruction(canvas, canon, layout.photo.width, layout.photo.height);
  canvas.restore();

  const barPaint = Skia.Paint();
  barPaint.setColor(Skia.Color(normaColors.accent));
  canvas.drawRect(
    Skia.XYWHRect(
      layout.photo.x,
      layout.bandTop - layout.resonanceBarHeight,
      resonanceBarWidth(photo.score, layout.photo.width),
      layout.resonanceBarHeight
    ),
    barPaint
  );

  const font = makeCardFont(layout.textSize);
  if (font) {
    const textPaint = Skia.Paint();
    textPaint.setAntiAlias(true);
    textPaint.setColor(Skia.Color(normaColors.graphite));

    const leftText = `${cardWordmark()}   ·   ${canon.name.toUpperCase()}`;
    canvas.drawText(leftText, layout.photo.x + layout.textInsetX / 4, layout.textBaselineY, textPaint, font);

    const rightText = `${Math.round(photo.score)} / 100`;
    const rightWidth = font.measureText(rightText).width;
    canvas.drawText(
      rightText,
      layout.photo.x + layout.photo.width - rightWidth - layout.textInsetX / 4,
      layout.textBaselineY,
      textPaint,
      font
    );
  }

  const snapshot = surface.makeImageSnapshot();
  const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, 92);
  if (!bytes || bytes.length === 0) {
    throw new Error('Could not encode the card image.');
  }

  const file = new File(Paths.cache, burnInFileName(photo));
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(bytes);
  return file.uri;
}
