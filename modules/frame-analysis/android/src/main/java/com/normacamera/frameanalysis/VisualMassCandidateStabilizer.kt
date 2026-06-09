package com.normacamera.frameanalysis

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

internal object VisualMassCandidateStabilizer {
  const val ACTIVATION_CONFIDENCE = 0.20
  const val RETENTION_CONFIDENCE = 0.14

  private const val MAX_RETENTION_MS = 900L
  private const val MAX_NULL_HOLD_MS = 700L
  private const val FLAT_EDGE_ENERGY_CLEAR = 0.012
  private const val NEAR_CENTER_DISTANCE = 0.22
  private const val NEAR_BOUNDS_DISTANCE = 0.28
  private const val STRONG_SMOOTH_ALPHA = 0.38
  private const val WEAK_SMOOTH_ALPHA = 0.22
  private const val HELD_CONFIDENCE_DECAY = 0.92

  private var lastCandidate: VisualMassSubjectCandidate? = null
  private var lastStrongAtMs = 0L
  private var lastUpdatedAtMs = 0L

  fun stabilize(
    rawCandidate: VisualMassSubjectCandidate?,
    metrics: LumaQualityMetrics,
    nowMs: Long
  ): VisualMassSubjectCandidate? {
    if (shouldClearImmediately(metrics)) {
      reset()
      return null
    }

    val previous = lastCandidate
    if (rawCandidate != null && rawCandidate.confidence >= ACTIVATION_CONFIDENCE) {
      val accepted = if (previous != null && isNear(previous, rawCandidate)) {
        smooth(previous, rawCandidate, STRONG_SMOOTH_ALPHA)
      } else {
        rawCandidate
      }
      accept(accepted, nowMs, strong = true)
      return accepted
    }

    if (
      rawCandidate != null &&
        rawCandidate.confidence >= RETENTION_CONFIDENCE &&
        previous != null &&
        isNear(previous, rawCandidate) &&
        nowMs - lastStrongAtMs <= MAX_RETENTION_MS
    ) {
      val retained = smooth(previous, rawCandidate, WEAK_SMOOTH_ALPHA)
      accept(retained, nowMs, strong = false)
      return retained
    }

    if (
      previous != null &&
        nowMs - lastUpdatedAtMs <= MAX_NULL_HOLD_MS &&
        nowMs - lastStrongAtMs <= MAX_RETENTION_MS
    ) {
      val held = previous.copy(
        confidence = max(RETENTION_CONFIDENCE, previous.confidence * HELD_CONFIDENCE_DECAY)
      )
      lastCandidate = held
      return held
    }

    reset()
    return null
  }

  fun reset() {
    lastCandidate = null
    lastStrongAtMs = 0L
    lastUpdatedAtMs = 0L
  }

  private fun shouldClearImmediately(metrics: LumaQualityMetrics): Boolean {
    if (metrics.sharpness.edgeEnergy <= FLAT_EDGE_ENERGY_CLEAR) return true
    if (metrics.exposure.clippedHighlightsRatio >= 0.92) return true
    if (metrics.exposure.crushedShadowsRatio >= 0.92) return true
    return false
  }

  private fun accept(candidate: VisualMassSubjectCandidate, nowMs: Long, strong: Boolean) {
    lastCandidate = candidate
    lastUpdatedAtMs = nowMs
    if (strong) lastStrongAtMs = nowMs
  }

  private fun isNear(a: VisualMassSubjectCandidate, b: VisualMassSubjectCandidate): Boolean {
    return centerDistance(a.center, b.center) <= NEAR_CENTER_DISTANCE &&
      boundsDistance(a.bounds, b.bounds) <= NEAR_BOUNDS_DISTANCE
  }

  private fun centerDistance(a: VisualMassPoint, b: VisualMassPoint): Double {
    return abs(a.x - b.x) + abs(a.y - b.y)
  }

  private fun boundsDistance(a: VisualMassBounds, b: VisualMassBounds): Double {
    return abs(a.x - b.x) + abs(a.y - b.y) + abs(a.width - b.width) + abs(a.height - b.height)
  }

  private fun smooth(
    previous: VisualMassSubjectCandidate,
    next: VisualMassSubjectCandidate,
    alpha: Double
  ): VisualMassSubjectCandidate {
    return VisualMassSubjectCandidate(
      center = VisualMassPoint(
        x = lerp(previous.center.x, next.center.x, alpha),
        y = lerp(previous.center.y, next.center.y, alpha)
      ),
      bounds = VisualMassBounds(
        x = lerp(previous.bounds.x, next.bounds.x, alpha),
        y = lerp(previous.bounds.y, next.bounds.y, alpha),
        width = lerp(previous.bounds.width, next.bounds.width, alpha),
        height = lerp(previous.bounds.height, next.bounds.height, alpha)
      ),
      confidence = min(1.0, max(RETENTION_CONFIDENCE, lerp(previous.confidence, next.confidence, alpha)))
    )
  }

  private fun lerp(from: Double, to: Double, alpha: Double): Double {
    return from + (to - from) * alpha
  }
}
