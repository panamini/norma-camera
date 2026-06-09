import { describe, expect, it } from 'vitest';
import { captureReadinessNoCandidateLine } from '../captureReadinessText';

const forbiddenSemanticWords = /object detected|person detected|face detected|AI detected|recognized subject|semantic detection/i;

describe('capture readiness no-candidate copy', () => {
  it('keeps non-native modes generic', () => {
    expect(captureReadinessNoCandidateLine({ detectionMode: 'manual', modeLabel: 'MANUAL V0' })).toBe('ARMED · no subject');
    expect(captureReadinessNoCandidateLine({ detectionMode: 'auto-placeholder', modeLabel: 'AUTO V0.2 · PLACEHOLDER' })).toBe('ARMED · no subject');
    expect(captureReadinessNoCandidateLine({ detectionMode: 'simulated-detector', modeLabel: 'SIMULATED DETECTOR' })).toBe('ARMED · no subject');
  });

  it('explains missing native candidate without semantic wording', () => {
    const line = captureReadinessNoCandidateLine({ detectionMode: 'native-heuristic', modeLabel: 'NATIVE VISUAL MASS · no strong native candidate' });

    expect(line).toBe('ARMED · no subject · no strong native candidate');
    expect(line).not.toMatch(forbiddenSemanticWords);
  });

  it('keeps stale live frame distinct from active native candidates', () => {
    const line = captureReadinessNoCandidateLine({ detectionMode: 'native-heuristic', modeLabel: 'NATIVE VISUAL MASS · stale live frame' });

    expect(line).toBe('ARMED · no subject · stale live frame');
    expect(line).not.toMatch(forbiddenSemanticWords);
  });

  it('keeps analyzer unavailable distinct from no strong native candidate', () => {
    const line = captureReadinessNoCandidateLine({ detectionMode: 'native-heuristic', modeLabel: 'NATIVE VISUAL MASS · unavailable' });

    expect(line).toBe('ARMED · no subject · native analyzer unavailable');
    expect(line).not.toMatch(forbiddenSemanticWords);
  });

  it('keeps native error distinct from unavailable', () => {
    const line = captureReadinessNoCandidateLine({ detectionMode: 'native-heuristic', modeLabel: 'NATIVE VISUAL MASS · error' });

    expect(line).toBe('ARMED · no subject · native error');
    expect(line).not.toMatch(forbiddenSemanticWords);
  });
});
