import { describe, expect, it } from 'vitest';
import { instructionForDetectionMode, statusInstructionFor } from '../candidateLabels';

const INSTRUCTION = instructionForDetectionMode('native-heuristic', false);

describe('statusInstructionFor', () => {
  it('surfaces degraded analyzer states verbatim', () => {
    expect(statusInstructionFor('NATIVE VISUAL MASS · unavailable', INSTRUCTION)).toBe('NATIVE VISUAL MASS · unavailable');
    expect(statusInstructionFor('NATIVE VISUAL MASS · error', INSTRUCTION)).toBe('NATIVE VISUAL MASS · error');
    expect(statusInstructionFor('NATIVE VISUAL MASS · stale live frame', INSTRUCTION)).toBe('NATIVE VISUAL MASS · stale live frame');
  });

  it('shows the actionable instruction for normal operating states', () => {
    expect(statusInstructionFor('NATIVE VISUAL MASS · no strong native candidate', INSTRUCTION)).toBe(INSTRUCTION);
    expect(statusInstructionFor('NATIVE VISUAL MASS · held briefly', INSTRUCTION)).toBe(INSTRUCTION);
    expect(statusInstructionFor('NATIVE VISUAL MASS · active', INSTRUCTION)).toBe(INSTRUCTION);
    expect(statusInstructionFor('NATIVE VISUAL MASS · manual fallback', INSTRUCTION)).toBe(INSTRUCTION);
    expect(statusInstructionFor('MANUAL V0', 'Tap subject point.')).toBe('Tap subject point.');
    expect(statusInstructionFor('AUTO V0.2 · PLACEHOLDER', 'Tap subject or switch Auto.')).toBe('Tap subject or switch Auto.');
  });

  it('keeps the native no-candidate instruction actionable and honest', () => {
    expect(INSTRUCTION).toBe('No dominant contrast mass. Tap your subject to score it.');
  });
});
