import { describe, expect, it } from 'vitest';
import { selectCompositionCandidate } from '../selectCompositionCandidate';

describe('selectCompositionCandidate', () => {
  it('manual mode with no tap returns no candidate', () => {
    const result = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'manual', manualSubject: null });

    expect(result.candidate).toBeNull();
    expect(result.modeLabel).toBe('MANUAL V0');
    expect(result.explanation).toContain('tap subject');
  });

  it('manual mode with tap returns manual candidate', () => {
    const result = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'manual', manualSubject: { x: 0.4, y: 0.6 } });

    expect(result.candidate?.source).toBe('manual');
    expect(result.candidate?.label).toBe('manual subject');
    expect(result.candidate?.center).toEqual({ x: 0.4, y: 0.6 });
  });

  it('auto placeholder mode returns placeholder candidate without tap', () => {
    const result = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'auto-placeholder', manualSubject: null });

    expect(result.candidate?.source).toBe('heuristic-placeholder');
    expect(result.candidate?.label).toBe('placeholder subject');
    expect(result.candidate?.center.x).toBeCloseTo(1 / 3);
    expect(result.explanation).toContain('No real object detection yet');
  });

  it('auto placeholder mode prefers manual tap if present', () => {
    const result = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'auto-placeholder', manualSubject: { x: 0.7, y: 0.2 } });

    expect(result.candidate?.source).toBe('manual');
    expect(result.candidate?.center).toEqual({ x: 0.7, y: 0.2 });
    expect(result.explanation).toContain('No real object detection yet');
  });

  it('simulated detector returns deterministic candidate', () => {
    const left = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'simulated-detector', simulatedStep: 0 });
    const center = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'simulated-detector', simulatedStep: 1 });
    const right = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'simulated-detector', simulatedStep: 2 });

    expect(left.candidate?.source).toBe('simulated-detector');
    expect(left.candidate?.center.x).toBeCloseTo(1 / 3);
    expect(center.candidate?.center.x).toBeCloseTo(1 / 2);
    expect(right.candidate?.center.x).toBeCloseTo(2 / 3);
  });
});
