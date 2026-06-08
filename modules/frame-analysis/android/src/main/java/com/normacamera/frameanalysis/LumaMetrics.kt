package com.normacamera.frameanalysis

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

internal data class ExposureMetrics(
  val exposureScore: Double,
  val meanLuma: Double,
  val clippedHighlightsRatio: Double,
  val crushedShadowsRatio: Double
)

internal data class SharpnessMetrics(
  val sharpnessScore: Double,
  val edgeEnergy: Double
)

internal data class LumaQualityMetrics(
  val exposure: ExposureMetrics,
  val sharpness: SharpnessMetrics
)

enum class LumaValueRange {
  AUTO,
  UNIT,
  BYTE
}

internal object LumaMetrics {
  private const val TARGET_MEAN_LUMA = 0.52
  private const val MEAN_WEIGHT = 180.0
  private const val HIGHLIGHT_THRESHOLD = 0.96
  private const val SHADOW_THRESHOLD = 0.04
  private const val HIGHLIGHT_PENALTY = 80.0
  private const val SHADOW_PENALTY = 70.0
  private const val SHARPNESS_SCALE = 420.0

  fun compute(
    grid: DoubleArray,
    width: Int,
    height: Int,
    valueRange: LumaValueRange = LumaValueRange.AUTO
  ): LumaQualityMetrics {
    require(width > 0) { "width must be positive" }
    require(height > 0) { "height must be positive" }
    require(grid.size == width * height) { "grid size does not match width and height" }

    val resolvedRange = resolveValueRange(grid, valueRange)
    var sum = 0.0
    var clippedHighlights = 0
    var crushedShadows = 0

    for (value in grid) {
      val luma = toUnitLuma(value, resolvedRange)
      sum += luma
      if (luma >= HIGHLIGHT_THRESHOLD) clippedHighlights += 1
      if (luma <= SHADOW_THRESHOLD) crushedShadows += 1
    }

    val sampleCount = grid.size.toDouble()
    val meanLuma = sum / sampleCount
    val clippedHighlightsRatio = clippedHighlights / sampleCount
    val crushedShadowsRatio = crushedShadows / sampleCount
    val baseExposureScore = 100.0 - abs(meanLuma - TARGET_MEAN_LUMA) * MEAN_WEIGHT
    val exposureScore = clamp(
      baseExposureScore - clippedHighlightsRatio * HIGHLIGHT_PENALTY - crushedShadowsRatio * SHADOW_PENALTY,
      0.0,
      100.0
    )

    var edgeEnergyTotal = 0.0
    var edgeSampleCount = 0

    for (y in 1 until height - 1) {
      for (x in 1 until width - 1) {
        val center = y * width + x
        val left = toUnitLuma(grid[center - 1], resolvedRange)
        val right = toUnitLuma(grid[center + 1], resolvedRange)
        val up = toUnitLuma(grid[center - width], resolvedRange)
        val down = toUnitLuma(grid[center + width], resolvedRange)
        edgeEnergyTotal += abs(right - left) + abs(down - up)
        edgeSampleCount += 1
      }
    }

    val edgeEnergy = if (edgeSampleCount == 0) 0.0 else edgeEnergyTotal / edgeSampleCount
    val sharpnessScore = clamp(edgeEnergy * SHARPNESS_SCALE, 0.0, 100.0)

    return LumaQualityMetrics(
      exposure = ExposureMetrics(
        exposureScore = exposureScore,
        meanLuma = meanLuma,
        clippedHighlightsRatio = clippedHighlightsRatio,
        crushedShadowsRatio = crushedShadowsRatio
      ),
      sharpness = SharpnessMetrics(
        sharpnessScore = sharpnessScore,
        edgeEnergy = edgeEnergy
      )
    )
  }

  private fun resolveValueRange(grid: DoubleArray, valueRange: LumaValueRange): LumaValueRange {
    if (valueRange != LumaValueRange.AUTO) return valueRange
    for (value in grid) {
      if (value.isNaN() || value.isInfinite()) continue
      if (value > 1.0) return LumaValueRange.BYTE
    }
    return LumaValueRange.UNIT
  }

  private fun toUnitLuma(value: Double, valueRange: LumaValueRange): Double {
    if (value.isNaN() || value.isInfinite()) return 0.0
    val normalized = when (valueRange) {
      LumaValueRange.BYTE -> value / 255.0
      LumaValueRange.UNIT -> value
      LumaValueRange.AUTO -> value
    }
    return clamp(normalized, 0.0, 1.0)
  }

  private fun clamp(value: Double, minValue: Double, maxValue: Double): Double {
    return min(maxValue, max(minValue, value))
  }
}
