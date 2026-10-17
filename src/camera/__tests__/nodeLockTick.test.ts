import { describe, expect, it } from 'vitest';
import { canonById } from '../../composition/canons';
import {
  NODE_LOCK_DISTANCE,
  NODE_LOCK_RELEASE_DISTANCE,
  NODE_LOCK_TICK_MIN_INTERVAL_MS,
  evaluateNodeLockTick,
  nearestNode,
  nearestNodeDistance
} from '../nodeLockTick';

const READY = 82;

function baseInput(overrides: Partial<Parameters<typeof evaluateNodeLockTick>[0]> = {}) {
  return {
    wasLocked: false,
    score: 90,
    readyThreshold: READY,
    nodeDistance: 0.01,
    source: 'native-heuristic' as const,
    nowMs: 10_000,
    lastTickAtMs: 0,
    ...overrides
  };
}

describe('nearestNodeDistance', () => {
  it('finds the closest canon node', () => {
    const thirds = canonById('thirds');
    expect(nearestNodeDistance({ x: 1 / 3, y: 1 / 3 }, thirds.nodes)).toBeCloseTo(0, 12);
    expect(nearestNodeDistance({ x: 0.5, y: 1 / 3 }, thirds.nodes)).toBeCloseTo(1 / 6, 12);
  });

  it('is infinite with no nodes', () => {
    expect(nearestNodeDistance({ x: 0.5, y: 0.5 }, [])).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns the node itself for the lock pulse', () => {
    const thirds = canonById('thirds');
    const result = nearestNode({ x: 0.3, y: 0.32 }, thirds.nodes);
    expect(result.node?.label).toBe('THIRDS_UPPER_LEFT');
    expect(result.distance).toBeGreaterThan(0);

    expect(nearestNode({ x: 0.5, y: 0.5 }, []).node).toBeNull();
  });
});

describe('evaluateNodeLockTick', () => {
  it('ticks once on the rising edge of a node lock', () => {
    const first = evaluateNodeLockTick(baseInput());
    expect(first).toEqual({ locked: true, tick: true });

    const held = evaluateNodeLockTick(baseInput({ wasLocked: true, lastTickAtMs: 10_000, nowMs: 10_250 }));
    expect(held).toEqual({ locked: true, tick: false });
  });

  it('requires both readiness and node proximity', () => {
    expect(evaluateNodeLockTick(baseInput({ score: READY - 1 })).locked).toBe(false);
    expect(evaluateNodeLockTick(baseInput({ nodeDistance: NODE_LOCK_DISTANCE + 0.001 })).locked).toBe(false);
  });

  it('applies hysteresis before releasing the lock', () => {
    const slightlyWorse = evaluateNodeLockTick(
      baseInput({ wasLocked: true, score: READY - 3, nodeDistance: NODE_LOCK_DISTANCE + 0.01 })
    );
    expect(slightlyWorse.locked).toBe(true);

    const clearlyGone = evaluateNodeLockTick(
      baseInput({ wasLocked: true, score: READY - 10, nodeDistance: NODE_LOCK_RELEASE_DISTANCE + 0.01 })
    );
    expect(clearlyGone.locked).toBe(false);
  });

  it('rate-limits repeated ticks', () => {
    const tooSoon = evaluateNodeLockTick(baseInput({ lastTickAtMs: 10_000 - NODE_LOCK_TICK_MIN_INTERVAL_MS + 1 }));
    expect(tooSoon.locked).toBe(true);
    expect(tooSoon.tick).toBe(false);
  });

  it('never ticks for placeholder or simulated candidates', () => {
    expect(evaluateNodeLockTick(baseInput({ source: 'heuristic-placeholder' })).locked).toBe(false);
    expect(evaluateNodeLockTick(baseInput({ source: 'simulated-detector' })).locked).toBe(false);
    expect(evaluateNodeLockTick(baseInput({ source: 'manual' })).locked).toBe(true);
  });
});
