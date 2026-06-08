import type { NativeFrameAnalysisResult } from './nativeHeuristicTypes';

const TARGET_MEAN_LUMA = 0.52;
const MEAN_WEIGHT = 180;
const HIGHLIGHT_THRESHOLD = 0.96;
const SHADOW_THRESHOLD = 0.04;
const HIGHLIGHT_PENALTY = 80;
const SHADOW_PENALTY = 70;
const SHARPNESS_SCALE = 420;

export type LumaGrid = {
  width: number;
  height: number;
  values: readonly number[];
};

export type LumaMetricOptions = {
  createdAtMs?: number;
  targetMeanLuma?: number;
  sharpnessScale?: number;
};

export type LumaQualityMetrics = Pick<NativeFrameAnalysisResult, 'exposure' | 'sharpness'>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toUnitLuma(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return clamp(value > 1 ? value / 255 : value, 0, 1);
}

function assertGrid(grid: LumaGrid): void {
  if (!Number.isInteger(grid.width) || grid.width <= 0) throw new Error('Luma grid width must be positive.');
  if (!Number.isInteger(grid.height) || grid.height <= 0) throw new Error('Luma grid height must be positive.');
  if (grid.values.length !== grid.width * grid.height) throw new Error('Luma grid value count does not match width and height.');
}

export function computeLumaQualityMetrics(grid: LumaGrid, options: LumaMetricOptions = {}): LumaQualityMetrics {
  assertGrid(grid);

  let sum = 0;
  let highlightCount = 0;
  let shadowCount = 0;

  for (const raw of grid.values) {
    const value = toUnitLuma(raw);
    sum += value;
    if (value >= HIGHLIGHT_THRESHOLD) highlightCount += 1;
    if (value <= SHADOW_THRESHOLD) shadowCount += 1;
  }

  const sampleCount = grid.values.length;
  const meanLuma = sum / sampleCount;
  const clippedHighlightsRatio = highlightCount / sampleCount;
  const crushedShadowsRatio = shadowCount / sampleCount;
  const targetMeanLuma = options.targetMeanLuma ?? TARGET_MEAN_LUMA;
  const baseExposureScore = 100 - Math.abs(meanLuma - targetMeanLuma) * MEAN_WEIGHT;
  const exposureScore = clamp(baseExposureScore - clippedHighlightsRatio * HIGHLIGHT_PENALTY - crushedShadowsRatio * SHADOW_PENALTY, 0, 100);

  let edgeEnergyTotal = 0;
  let edgeSampleCount = 0;

  for (let y = 1; y < grid.height - 1; y += 1) {
    for (let x = 1; x < grid.width - 1; x += 1) {
      const center = y * grid.width + x;
      const left = toUnitLuma(grid.values[center - 1]);
      const right = toUnitLuma(grid.values[center + 1]);
      const up = toUnitLuma(grid.values[center - grid.width]);
      const down = toUnitLuma(grid.values[center + grid.width]);
      edgeEnergyTotal += Math.abs(right - left) + Math.abs(down - up);
      edgeSampleCount += 1;
    }
  }

  const edgeEnergy = edgeSampleCount === 0 ? 0 : edgeEnergyTotal / edgeSampleCount;
  const sharpnessScore = clamp(edgeEnergy * (options.sharpnessScale ?? SHARPNESS_SCALE), 0, 100);

  return {
    exposure: {
      exposureScore,
      meanLuma,
      clippedHighlightsRatio,
      crushedShadowsRatio
    },
    sharpness: {
      sharpnessScore,
      edgeEnergy
    }
  };
}

export function buildLumaQualityAnalysis(grid: LumaGrid, options: LumaMetricOptions = {}): NativeFrameAnalysisResult {
  const quality = computeLumaQualityMetrics(grid, options);

  return {
    status: 'low-confidence',
    createdAtMs: options.createdAtMs ?? Date.now(),
    subject: null,
    exposure: quality.exposure,
    sharpness: quality.sharpness,
    explanation: 'Real luminance quality metrics available; native visual-mass candidate is intentionally deferred.'
  };
}
