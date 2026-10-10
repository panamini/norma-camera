import { ImageFormat, PaintStyle, Skia } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { canonLineSegments, canonNodePoints } from '../composition/canonGeometry';
import { canonById } from '../composition/canons';
import type { CapturedPhoto } from '../state/cameraUiStore';
import { normaColors } from '../ui/theme';
import { burnInStrokeWidth, burnInTargetSize, burnInTickHalfLength } from './burnInGeometry';
import { burnInFileName } from './constructExport';

/**
 * Renders a downscaled copy of the capture with its canon construction
 * drawn in (same shared geometry as the viewfinder and review overlay),
 * writes it to the app cache, and returns the file URI. Raster surface,
 * on-device only; the original capture is never modified.
 */
export async function renderCanonBurnIn(photo: CapturedPhoto): Promise<string> {
  const data = await Skia.Data.fromURI(photo.uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error('Could not decode the captured photo.');
  }

  const target = burnInTargetSize(image.width(), image.height());
  if (target.width <= 0 || target.height <= 0) {
    throw new Error('Captured photo has no drawable size.');
  }

  const surface = Skia.Surface.Make(target.width, target.height);
  if (!surface) {
    throw new Error('Could not create the burn-in surface.');
  }

  const canvas = surface.getCanvas();
  const imagePaint = Skia.Paint();
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, image.width(), image.height()),
    Skia.XYWHRect(0, 0, target.width, target.height),
    imagePaint
  );

  const canon = canonById(photo.canonId);
  const linePaint = Skia.Paint();
  linePaint.setStyle(PaintStyle.Stroke);
  linePaint.setAntiAlias(true);
  linePaint.setColor(Skia.Color(normaColors.paper));
  linePaint.setAlphaf(0.55);
  linePaint.setStrokeWidth(burnInStrokeWidth(target.width));

  for (const segment of canonLineSegments(canon, target.width, target.height)) {
    canvas.drawLine(segment.x1, segment.y1, segment.x2, segment.y2, linePaint);
  }

  const tickPaint = Skia.Paint();
  tickPaint.setStyle(PaintStyle.Stroke);
  tickPaint.setAntiAlias(true);
  tickPaint.setColor(Skia.Color(normaColors.paper));
  tickPaint.setAlphaf(0.8);
  tickPaint.setStrokeWidth(burnInStrokeWidth(target.width));

  const tickHalfLength = burnInTickHalfLength(target.width);
  for (const node of canonNodePoints(canon, target.width, target.height)) {
    canvas.drawLine(node.x - tickHalfLength, node.y, node.x + tickHalfLength, node.y, tickPaint);
    canvas.drawLine(node.x, node.y - tickHalfLength, node.x, node.y + tickHalfLength, tickPaint);
  }

  const snapshot = surface.makeImageSnapshot();
  const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, 92);
  if (!bytes || bytes.length === 0) {
    throw new Error('Could not encode the burn-in image.');
  }

  const file = new File(Paths.cache, burnInFileName(photo));
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(bytes);
  return file.uri;
}
