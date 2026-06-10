package com.normacamera.frameanalysis

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

internal data class HorizontalLineCandidate(
  val x1: Double,
  val y1: Double,
  val x2: Double,
  val y2: Double,
  val angleDeg: Double,
  val confidence: Double,
  val kind: String = "horizontal-line"
) {
  fun toMap(): Map<String, Any> = mapOf(
    "x1" to x1,
    "y1" to y1,
    "x2" to x2,
    "y2" to y2,
    "angleDeg" to angleDeg,
    "confidence" to confidence,
    "kind" to kind
  )
}

internal object HorizontalLineHeuristic {
  private const val MIN_GRID_WIDTH = 6
  private const val MIN_GRID_HEIGHT = 6
  private const val MIN_OVERALL_EDGE_ENERGY = 0.018
  private const val MIN_PEAK_ROW_ENERGY = 0.12
  private const val MIN_PEAK_TO_AVERAGE_RATIO = 2.0
  private const val MIN_COVERAGE = 0.62
  private const val LOCAL_EDGE_FLOOR = 0.12
  private const val LOCAL_EDGE_AVERAGE_MULTIPLIER = 1.6
  private const val PEAK_PLATEAU_FRACTION = 0.92
  private const val MIN_CONFIDENCE = 0.34

  fun detect(
    grid: DoubleArray,
    width: Int,
    height: Int,
    valueRange: LumaValueRange = LumaValueRange.AUTO,
    overallEdgeEnergy: Double = 0.0
  ): HorizontalLineCandidate? {
    require(width > 0) { "width must be positive" }
    require(height > 0) { "height must be positive" }
    require(grid.size == width * height) { "grid size does not match width and height" }

    if (width < MIN_GRID_WIDTH || height < MIN_GRID_HEIGHT) return null
    if (!isFinite(overallEdgeEnergy) || overallEdgeEnergy < MIN_OVERALL_EDGE_ENERGY) return null

    val resolvedRange = resolveValueRange(grid, valueRange)
    val lumaValues = DoubleArray(grid.size)
    for (index in grid.indices) {
      lumaValues[index] = toUnitLuma(grid[index], resolvedRange)
    }

    val rowEnergies = DoubleArray(height)
    var totalRowEnergy = 0.0
    var peakRowEnergy = 0.0
    var peakRow = -1
    val rowCount = height - 2

    for (y in 1 until height - 1) {
      var energyTotal = 0.0
      for (x in 0 until width) {
        val up = lumaValues[(y - 1) * width + x]
        val down = lumaValues[(y + 1) * width + x]
        energyTotal += abs(down - up)
      }

      val rowEnergy = energyTotal / width.toDouble()
      rowEnergies[y] = rowEnergy
      totalRowEnergy += rowEnergy
      if (rowEnergy > peakRowEnergy) {
        peakRowEnergy = rowEnergy
        peakRow = y
      }
    }

    if (peakRow < 0 || peakRowEnergy < MIN_PEAK_ROW_ENERGY) return null

    val averageRowEnergy = totalRowEnergy / rowCount.toDouble()
    if (averageRowEnergy <= 0.0) return null

    val peakToAverageRatio = peakRowEnergy / averageRowEnergy
    if (peakToAverageRatio < MIN_PEAK_TO_AVERAGE_RATIO) return null

    val localEdgeThreshold = max(LOCAL_EDGE_FLOOR, averageRowEnergy * LOCAL_EDGE_AVERAGE_MULTIPLIER)
    val coverage = computeCoverage(lumaValues, width, peakRow, localEdgeThreshold)
    if (coverage < MIN_COVERAGE) return null

    val weightedRow = weightedPlateauRow(rowEnergies, peakRowEnergy)
    val y = clamp((weightedRow + 0.5) / height.toDouble(), 0.0, 1.0)
    val confidence = computeConfidence(
      peakRowEnergy = peakRowEnergy,
      coverage = coverage,
      peakToAverageRatio = peakToAverageRatio,
      overallEdgeEnergy = overallEdgeEnergy
    )

    if (confidence < MIN_CONFIDENCE) return null

    return HorizontalLineCandidate(
      x1 = 0.0,
      y1 = y,
      x2 = 1.0,
      y2 = y,
      angleDeg = 0.0,
      confidence = confidence
    )
  }

  private fun computeCoverage(lumaValues: DoubleArray, width: Int, row: Int, threshold: Double): Double {
    var covered = 0
    for (x in 0 until width) {
      val up = lumaValues[(row - 1) * width + x]
      val down = lumaValues[(row + 1) * width + x]
      if (abs(down - up) >= threshold) covered += 1
    }
    return covered / width.toDouble()
  }

  private fun weightedPlateauRow(rowEnergies: DoubleArray, peakRowEnergy: Double): Double {
    val plateauThreshold = peakRowEnergy * PEAK_PLATEAU_FRACTION
    var weightedRowTotal = 0.0
    var rowWeightTotal = 0.0

    for (y in 1 until rowEnergies.size - 1) {
      val rowEnergy = rowEnergies[y]
      if (rowEnergy < plateauThreshold) continue
      weightedRowTotal += y.toDouble() * rowEnergy
      rowWeightTotal += rowEnergy
    }

    return if (rowWeightTotal > 0.0) weightedRowTotal / rowWeightTotal else 0.0
  }

  private fun computeConfidence(
    peakRowEnergy: Double,
    coverage: Double,
    peakToAverageRatio: Double,
    overallEdgeEnergy: Double
  ): Double {
    val peakScore = clamp((peakRowEnergy - MIN_PEAK_ROW_ENERGY) / 0.38, 0.0, 1.0)
    val coverageScore = clamp((coverage - MIN_COVERAGE) / (1.0 - MIN_COVERAGE), 0.0, 1.0)
    val ratioScore = clamp((peakToAverageRatio - MIN_PEAK_TO_AVERAGE_RATIO) / 4.0, 0.0, 1.0)
    val overallScore = clamp((overallEdgeEnergy - MIN_OVERALL_EDGE_ENERGY) / 0.08, 0.0, 1.0)

    return clamp(0.12 + peakScore * 0.40 + coverageScore * 0.30 + ratioScore * 0.14 + overallScore * 0.04, 0.0, 1.0)
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
      LumaValueRange.AUTO -> error("toUnitLuma called with unresolved AUTO range")
    }
    return clamp(normalized, 0.0, 1.0)
  }

  private fun isFinite(value: Double): Boolean {
    return !value.isNaN() && !value.isInfinite()
  }

  private fun clamp(value: Double, minValue: Double, maxValue: Double): Double {
    return min(maxValue, max(minValue, value))
  }
}
