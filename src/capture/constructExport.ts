import type { CapturedPhoto } from '../state/cameraUiStore';

/**
 * Contract with Norma Construct (norma.science/app): the camera opens this
 * URL so Construct can offer a photo import primed with the canon context.
 * The photo file itself travels through the system share sheet; only canon
 * metadata rides the URL. Nothing else leaves the device.
 */
export const CONSTRUCT_IMPORT_BASE_URL = 'https://norma.science/app';

export function constructExportUrl(photo: CapturedPhoto): string {
  // Built by hand: Hermes' URL/URLSearchParams support is incomplete.
  const params: Array<[string, string]> = [
    ['construct_import', '1'],
    ['canon', photo.canonId],
    ['score', String(Math.round(photo.score))],
    ['label', photo.label],
    ['captured_at_ms', String(photo.createdAtMs)]
  ];
  const query = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');

  return `${CONSTRUCT_IMPORT_BASE_URL}?${query}`;
}

export function burnInFileName(photo: CapturedPhoto): string {
  return `norma-${photo.canonId}-${Math.round(photo.score)}-${photo.createdAtMs}.jpg`;
}
