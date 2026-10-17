import { describe, expect, it } from 'vitest';
import { cardWordmark, normaCardLayout, resonanceBarWidth } from '../normaCardLayout';

describe('normaCardLayout', () => {
  it('frames a portrait photo with mat and caption band', () => {
    const layout = normaCardLayout(1536, 2048);
    expect(layout.margin).toBe(64);
    expect(layout.bandHeight).toBe(192);
    expect(layout.canvasWidth).toBe(1536 + 128);
    expect(layout.canvasHeight).toBe(64 + 2048 + 192);
    expect(layout.photo).toEqual({ x: 64, y: 64, width: 1536, height: 2048 });
    expect(layout.bandTop).toBe(64 + 2048);
  });

  it('keeps the band and mat usable on small renders', () => {
    const layout = normaCardLayout(160, 120);
    expect(layout.margin).toBeGreaterThanOrEqual(8);
    expect(layout.bandHeight).toBeGreaterThanOrEqual(40);
    expect(layout.textSize).toBeGreaterThan(0);
  });

  it('places the text baseline inside the band', () => {
    const layout = normaCardLayout(2048, 1536);
    expect(layout.textBaselineY).toBeGreaterThan(layout.bandTop);
    expect(layout.textBaselineY).toBeLessThan(layout.canvasHeight);
  });
});

describe('resonanceBarWidth', () => {
  it('maps the score onto the photo width and clamps', () => {
    expect(resonanceBarWidth(82, 1000)).toBe(820);
    expect(resonanceBarWidth(0, 1000)).toBe(0);
    expect(resonanceBarWidth(150, 1000)).toBe(1000);
    expect(resonanceBarWidth(-5, 1000)).toBe(0);
  });
});

describe('cardWordmark', () => {
  it('letterspaces the brand in plain ASCII', () => {
    expect(cardWordmark()).toBe('N O R M A');
  });
});
