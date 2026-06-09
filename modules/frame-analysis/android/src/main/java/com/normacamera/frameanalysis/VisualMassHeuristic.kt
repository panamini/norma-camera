package com.normacamera.frameanalysis

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

internal data class VisualMassPoint(
  val x: Double,
  val y: Double
) {
  fun toMap(): Map<String, Any> = mapOf("x" to x, "y" to y)
}

internal data class VisualMassBounds(
  val x: Double,
  val y: Double,
  val width: Double,
  val height: Double
) {
  fun toMap(): Map<String, Any> = mapOf(
    "x" to x,
    "y" to y,
    "width" to width,
    "height" to height
  )
}

internal data class VisualMassSubjectCandidate(
  val center: VisualMassPoint,
  val bounds: VisualMassBounds,
  val confidence: Double
) {
  fun toMap(): Map<String, Any> = mapOf(
    "center" to center.toMap(),
    "bounds" to bounds.toMap(),
    "confidence" to confidence,
    "source" to "native-heuristic"
  )
}

internal object VisualMassHeuristic {
  private const val MIN_GRID_WIDTH = 4
  private const val MIN_GRID_HEIGHT = 4
  private const val EDGE_FLOOR = 0.055
  private const val LUMA_DELTA_FLOOR = 0.045
  private const val LUMA_DELTA_WEIGHT = 0.55
  private const val CLIPPED_WEIGHT_MULTIPLIER = 0.55
  private const val MIN_TOTAL_WEIGHT = 0.65
  private const val MIN_PEAK_WEIGHT = 0.09
  private const val BBOX_PEAK_FRACTION = 0.42
  private const val BBOX_ACTIVE_MEAN_MULTIPLIER = 1.15
  private const val MIN_CONFIDENCE = 0.35
  private const val MAX_CONFIDENCE = 0.86

  fun detect(
    grid: DoubleArray,
    width: Int,
    height: Int,
    valueRange: LumaValueRange = LumaValueRange.AUTO
  ): VisualMassSubjectCandidate? {
    require(width > 0) { "width must be positive" }
    require(height > 0) { "height must be positive" }
    require(grid.size == width * height) { "grid size does not match width and height" }

    if (width < MIN_GRID_WIDTH || height < MIN_GRID_HEIGHT) return null

    val resolvedRange = resolveValueRange(grid, valueRange)
    val lumaValues = DoubleArray(grid.size)
    var lumaSum = 0.0

    for (index in grid.indices) {
      val luma = toUnitLuma(grid[index], resolvedRange)
      lumaValues[index] = luma
      lumaSum += luma
    }

    val sampleCount = grid.size.toDouble()
    val meanLuma = lumaSum / sampleCount
    val weights = DoubleArray(grid.size)
    var totalWeight = 0.0
    var peakWeight = 0.0
    var activeCount = 0
    var weightedX = 0.0
    var weightedY = 0.0

    for (y in 1 until height - 1) {
      for (x in 1 until width - 1) {
        val index = y * width + x
        val center = lumaValues[index]
        val left = lumaValues[index - 1]
        val right = lumaValues[index + 1]
        val up = lumaValues[index - width]
        val down = lumaValues[index + width]
        val edgeEnergy = abs(right - left) + abs(down - up)
        val lumaSaliency = max(0.0, abs(center - meanLuma) - LUMA_DELTA_FLOOR) * LUMA_DELTA_WEIGHT
        var weight = max(0.0, edgeEnergy - EDGE_FLOOR) + lumaSaliency

        if (center <= 0.015 || center >= 0.985) {
          weight *= CLIPPED_WEIGHT_MULTIPLIER
        }

        if (weight <= 0.0) continue

        weights[index] = weight
        totalWeight += weight
        weightedX += ((x + 0.5) / width.toDouble()) * weight
        weightedY += ((y + 0.5) / height.toDouble()) * weight
        peakWeight = max(peakWeight, weight)
        activeCount += 1
      }
    }

    if (activeCount == 0 || totalWeight < MIN_TOTAL_WEIGHT || peakWeight < MIN_PEAK_WEIGHT) {
      return null
    }

    val activeMeanWeight = totalWeight / activeCount
    val bboxThreshold = max(peakWeight * BBOX_PEAK_FRACTION, activeMeanWeight * BBOX_ACTIVE_MEAN_MULTIPLIER)
    var minX = width
    var minY = height
    var maxX = -1
    var maxY = -1
    var bboxCellCount = 0

    for (y in 1 until height - 1) {
      for (x in 1 until width - 1) {
        val weight = weights[y * width + x]
        if (weight < bboxThreshold) continue

        minX = min(minX, x)
        minY = min(minY, y)
        maxX = max(maxX, x)
        maxY = max(maxY, y)
        bboxCellCount += 1
      }
    }

    if (bboxCellCount == 0) return null

    val padX = if (width >= 8) 1 else 0
    val padY = if (height >= 8) 1 else 0
    minX = max(0, minX - padX)
    minY = max(0, minY - padY)
    maxX = min(width - 1, maxX + padX)
    maxY = min(height - 1, maxY + padY)

    val bounds = VisualMassBounds(
      x = minX / width.toDouble(),
      y = minY / height.toDouble(),
      width = (maxX - minX + 1) / width.toDouble(),
      height = (maxY - minY + 1) / height.toDouble()
    )

    if (!isSaneBounds(bounds)) return null

    val center = VisualMassPoint(
      x = clamp(weightedX / totalWeight, 0.0, 1.0),
      y = clamp(weightedY / totalWeight, 0.0, 1.0)
    )

    val confidence = computeConfidence(
      peakWeight = peakWeight,
      totalWeight = totalWeight,
      activeAreaRatio = activeCount / sampleCount,
      boundsArea = bounds.width * bounds.height,
      sampleCount = sampleCount
    )

    if (confidence < MIN_CONFIDENCE) return null

    return VisualMassSubjectCandidate(
      center = center,
      bounds = bounds,
      confidence = confidence
    )
  }

  private fun computeConfidence(
    peakWeight: Double,
    totalWeight: Double,
    activeAreaRatio: Double,
    boundsArea: Double,
    sampleCount: Double
  ): Double {
    val peakScore = clamp((peakWeight - 0.08) / 0.55, 0.0, 1.0)
    val totalScore = clamp(totalWeight / (sampleCount * 0.018), 0.0, 1.0)
    val concentrationScore = clamp(1.0 - activeAreaRatio / 0.42, 0.0, 1.0)
    val boundsScore = clamp(1.0 - abs(boundsArea - 0.18) / 0.32, 0.0, 1.0)

    return clamp(
      0.08 + peakScore * 0.34 + totalScore * 0.30 + concentrationScore * 0.18 + boundsScore * 0.10,
      0.0,
      MAX_CONFIDENCE
    )
  }

  private fun isSaneBounds(bounds: VisualMassBounds): Boolean {
    val area = bounds.width * bounds.height
    return bounds.x >= 0.0 &&
      bounds.y >= 0.0 &&
      bounds.width >= 0.04 &&
      bounds.height >= 0.04 &&
      bounds.width <= 0.88 &&
      bounds.height <= 0.88 &&
      area <= 0.58 &&
      bounds.x + bounds.width <= 1.0 &&
      bounds.y + bounds.height <= 1.0
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
