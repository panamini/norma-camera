import type { CanonNode, NormalizedPoint } from '../composition/types';
import type { DetectionSource } from '../detection/types';

export const NODE_LOCK_DISTANCE = 0.05;
export const NODE_LOCK_RELEASE_DISTANCE = 0.065;
export const NODE_LOCK_RELEASE_SCORE_MARGIN = 6;
export const NODE_LOCK_TICK_MIN_INTERVAL_MS = 700;

export function nearestNodeDistance(point: NormalizedPoint, nodes: CanonNode[]): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const node of nodes) {
    const distance = Math.hypot(point.x - node.point.x, point.y - node.point.y);
    if (distance < nearest) nearest = distance;
  }
  return nearest;
}

export type NodeLockTickInput = {
  wasLocked: boolean;
  score: number;
  readyThreshold: number;
  nodeDistance: number;
  source: DetectionSource;
  nowMs: number;
  lastTickAtMs: number;
};

export type NodeLockTickDecision = {
  locked: boolean;
  tick: boolean;
};

/**
 * Node lock = the frame is ready AND the subject sits on a canon power
 * point. The tick fires once on the rising edge, rate-limited, with
 * hysteresis so a score or position oscillating at the boundary does not
 * buzz. Placeholder and simulated candidates never tick.
 */
export function evaluateNodeLockTick(input: NodeLockTickInput): NodeLockTickDecision {
  const tickableSource = input.source === 'manual' || input.source === 'native-heuristic';
  const scoreFloor = input.wasLocked ? input.readyThreshold - NODE_LOCK_RELEASE_SCORE_MARGIN : input.readyThreshold;
  const distanceCeiling = input.wasLocked ? NODE_LOCK_RELEASE_DISTANCE : NODE_LOCK_DISTANCE;
  const locked = tickableSource && input.score >= scoreFloor && input.nodeDistance <= distanceCeiling;
  const tick = locked && !input.wasLocked && input.nowMs - input.lastTickAtMs >= NODE_LOCK_TICK_MIN_INTERVAL_MS;

  return { locked, tick };
}
