package com.normacamera.frameanalysis

import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

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

    val weightedRow = weightedPlateauRow(rowEnergies, peakRowEnergy, peakRow)
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

  private fun weightedPlateauRow(rowEnergies: DoubleArray, peakRowEnergy: Double, peakRow: Int): Double {
    val plateauThreshold = peakRowEnergy * PEAK_PLATEAU_FRACTION
    var weightedRowTotal = 0.0
    var rowWeightTotal = 0.0

    for (y in 1 until rowEnergies.size - 1) {
      val rowEnergy = rowEnergies[y]
      if (rowEnergy < plateauThreshold) continue
      weightedRowTotal += y.toDouble() * rowEnergy
      rowWeightTotal += rowEnergy
    }

    return if (rowWeightTotal > 0.0) weightedRowTotal / rowWeightTotal else peakRow.toDouble()
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

internal data class LineSegmentCandidate(
  val x1: Double,
  val y1: Double,
  val x2: Double,
  val y2: Double,
  val angleDeg: Double,
  val lengthEuclidean: Double,
  val confidence: Double,
  val orientationKind: String,
  val src: String = "native-line-segment-spike"
) {
  fun toMap(): Map<String, Any> = mapOf(
    "x1" to x1,
    "y1" to y1,
    "x2" to x2,
    "y2" to y2,
    "angleDeg" to angleDeg,
    "lengthEuclidean" to lengthEuclidean,
    "confidence" to confidence,
    "orientationKind" to orientationKind,
    "src" to src
  )
}

internal object LineSegmentHeuristic {
  private const val MIN_GRID_WIDTH = 6
  private const val MIN_GRID_HEIGHT = 6
  private const val TOP_SEGMENT_LIMIT = 4
  private const val MIN_OVERALL_EDGE_ENERGY = 0.014
  private const val EDGE_THRESHOLD_FLOOR = 0.14
  private const val EDGE_THRESHOLD_AVERAGE_MULTIPLIER = 1.65
  private const val MIN_RUN_CELLS = 5
  private const val MIN_NORMALIZED_LENGTH = 0.18
  private const val MIN_CONFIDENCE = 0.24

  fun detect(
    grid: DoubleArray,
    width: Int,
    height: Int,
    valueRange: LumaValueRange = LumaValueRange.AUTO,
    overallEdgeEnergy: Double = 0.0
  ): List<LineSegmentCandidate> {
    require(width > 0) { "width must be positive" }
    require(height > 0) { "height must be positive" }
    require(grid.size == width * height) { "grid size does not match width and height" }

    if (width < MIN_GRID_WIDTH || height < MIN_GRID_HEIGHT) return emptyList()
    if (!isFinite(overallEdgeEnergy) || overallEdgeEnergy < MIN_OVERALL_EDGE_ENERGY) return emptyList()

    val resolvedRange = resolveValueRange(grid, valueRange)
    val lumaValues = DoubleArray(grid.size)
    for (index in grid.indices) {
      lumaValues[index] = toUnitLuma(grid[index], resolvedRange)
    }

    val averageEdge = averageInteriorEdge(lumaValues, width, height)
    if (averageEdge <= 0.0) return emptyList()
    val edgeThreshold = max(EDGE_THRESHOLD_FLOOR, averageEdge * EDGE_THRESHOLD_AVERAGE_MULTIPLIER)
    val candidates = mutableListOf<LineSegmentCandidate>()

    scanHorizontal(candidates, lumaValues, width, height, edgeThreshold)
    scanVertical(candidates, lumaValues, width, height, edgeThreshold)
    scanDiagonalDown(candidates, lumaValues, width, height, edgeThreshold)
    scanDiagonalUp(candidates, lumaValues, width, height, edgeThreshold)

    return compactTopCandidates(candidates)
  }

  private fun scanHorizontal(candidates: MutableList<LineSegmentCandidate>, lumaValues: DoubleArray, width: Int, height: Int, threshold: Double) {
    for (y in 1 until height - 1) {
      scanPath(candidates, lumaValues, width, 1, y, 1, 0, width - 2, threshold, ::horizontalEdge)
    }
  }

  private fun scanVertical(candidates: MutableList<LineSegmentCandidate>, lumaValues: DoubleArray, width: Int, height: Int, threshold: Double) {
    for (x in 1 until width - 1) {
      scanPath(candidates, lumaValues, width, x, 1, 0, 1, height - 2, threshold, ::verticalEdge)
    }
  }

  private fun scanDiagonalDown(candidates: MutableList<LineSegmentCandidate>, lumaValues: DoubleArray, width: Int, height: Int, threshold: Double) {
    for (x in 1 until width - 1) {
      scanPath(candidates, lumaValues, width, x, 1, 1, 1, min(width - x - 1, height - 2), threshold, ::diagonalDownEdge)
    }
    for (y in 2 until height - 1) {
      scanPath(candidates, lumaValues, width, 1, y, 1, 1, min(width - 2, height - y - 1), threshold, ::diagonalDownEdge)
    }
  }

  private fun scanDiagonalUp(candidates: MutableList<LineSegmentCandidate>, lumaValues: DoubleArray, width: Int, height: Int, threshold: Double) {
    for (x in 1 until width - 1) {
      scanPath(candidates, lumaValues, width, x, height - 2, 1, -1, min(width - x - 1, height - 2), threshold, ::diagonalUpEdge)
    }
    for (y in height - 3 downTo 1) {
      scanPath(candidates, lumaValues, width, 1, y, 1, -1, min(width - 2, y), threshold, ::diagonalUpEdge)
    }
  }

  private fun scanPath(
    candidates: MutableList<LineSegmentCandidate>,
    lumaValues: DoubleArray,
    width: Int,
    startX: Int,
    startY: Int,
    stepX: Int,
    stepY: Int,
    pathCells: Int,
    threshold: Double,
    edgeAt: (DoubleArray, Int, Int, Int) -> Double
  ) {
    if (pathCells <= 0) return

    var runStartX = 0
    var runStartY = 0
    var runEndX = 0
    var runEndY = 0
    var runCells = 0
    var runEnergy = 0.0
    var x = startX
    var y = startY

    repeat(pathCells) {
      val edge = edgeAt(lumaValues, width, x, y)
      if (edge >= threshold) {
        if (runCells == 0) {
          runStartX = x
          runStartY = y
        }
        runEndX = x
        runEndY = y
        runCells += 1
        runEnergy += edge
      } else if (runCells > 0) {
        addCandidate(candidates, width, lumaValues.size / width, runStartX, runStartY, runEndX, runEndY, runCells, runEnergy, pathCells)
        runCells = 0
        runEnergy = 0.0
      }

      x += stepX
      y += stepY
    }

    if (runCells > 0) {
      addCandidate(candidates, width, lumaValues.size / width, runStartX, runStartY, runEndX, runEndY, runCells, runEnergy, pathCells)
    }
  }

  private fun addCandidate(
    candidates: MutableList<LineSegmentCandidate>,
    width: Int,
    height: Int,
    startX: Int,
    startY: Int,
    endX: Int,
    endY: Int,
    runCells: Int,
    runEnergy: Double,
    pathCells: Int
  ) {
    if (runCells < MIN_RUN_CELLS) return

    val x1 = clamp((startX + 0.5) / width.toDouble(), 0.0, 1.0)
    val y1 = clamp((startY + 0.5) / height.toDouble(), 0.0, 1.0)
    val x2 = clamp((endX + 0.5) / width.toDouble(), 0.0, 1.0)
    val y2 = clamp((endY + 0.5) / height.toDouble(), 0.0, 1.0)
    val dx = x2 - x1
    val dy = y2 - y1
    val length = sqrt(dx * dx + dy * dy)
    if (!isFinite(length) || length < MIN_NORMALIZED_LENGTH) return

    val angleDeg = atan2(dy, dx) * 180.0 / Math.PI
    val coverage = runCells / max(1.0, pathCells.toDouble())
    val contrast = runEnergy / runCells.toDouble()
    val confidence = computeConfidence(length, coverage, contrast)
    if (confidence < MIN_CONFIDENCE) return

    candidates += LineSegmentCandidate(
      x1 = x1,
      y1 = y1,
      x2 = x2,
      y2 = y2,
      angleDeg = angleDeg,
      lengthEuclidean = length,
      confidence = confidence,
      orientationKind = orientationKind(angleDeg, length)
    )
  }

  private fun compactTopCandidates(candidates: List<LineSegmentCandidate>): List<LineSegmentCandidate> {
    val selected = mutableListOf<LineSegmentCandidate>()
    for (candidate in candidates.sortedWith(compareByDescending<LineSegmentCandidate> { it.confidence }.thenByDescending { it.lengthEuclidean })) {
      if (selected.any { isSimilarSegment(it, candidate) }) continue
      selected += candidate
      if (selected.size >= TOP_SEGMENT_LIMIT) break
    }
    return selected
  }

  private fun isSimilarSegment(a: LineSegmentCandidate, b: LineSegmentCandidate): Boolean {
    if (a.orientationKind != b.orientationKind) return false

    val ax = (a.x1 + a.x2) / 2.0
    val ay = (a.y1 + a.y2) / 2.0
    val bx = (b.x1 + b.x2) / 2.0
    val by = (b.y1 + b.y2) / 2.0
    return sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)) < 0.06
  }

  private fun computeConfidence(length: Double, coverage: Double, contrast: Double): Double {
    val lengthScore = clamp((length - MIN_NORMALIZED_LENGTH) / (1.0 - MIN_NORMALIZED_LENGTH), 0.0, 1.0)
    val coverageScore = clamp(coverage, 0.0, 1.0)
    val contrastScore = clamp((contrast - EDGE_THRESHOLD_FLOOR) / 0.55, 0.0, 1.0)
    return clamp(0.12 + lengthScore * 0.38 + coverageScore * 0.34 + contrastScore * 0.16, 0.0, 1.0)
  }

  private fun averageInteriorEdge(lumaValues: DoubleArray, width: Int, height: Int): Double {
    var total = 0.0
    var count = 0
    for (y in 1 until height - 1) {
      for (x in 1 until width - 1) {
        total += max(
          max(horizontalEdge(lumaValues, width, x, y), verticalEdge(lumaValues, width, x, y)),
          max(diagonalDownEdge(lumaValues, width, x, y), diagonalUpEdge(lumaValues, width, x, y))
        )
        count += 1
      }
    }
    return if (count == 0) 0.0 else total / count.toDouble()
  }

  // A horizontal segment is found by a vertical luminance gradient across the scan row.
  private fun horizontalEdge(lumaValues: DoubleArray, width: Int, x: Int, y: Int): Double {
    return abs(lumaValues[(y + 1) * width + x] - lumaValues[(y - 1) * width + x])
  }

  // A vertical segment is found by a horizontal luminance gradient across the scan column.
  private fun verticalEdge(lumaValues: DoubleArray, width: Int, x: Int, y: Int): Double {
    return abs(lumaValues[y * width + x + 1] - lumaValues[y * width + x - 1])
  }

  private fun diagonalDownEdge(lumaValues: DoubleArray, width: Int, x: Int, y: Int): Double {
    return abs(lumaValues[(y + 1) * width + x - 1] - lumaValues[(y - 1) * width + x + 1])
  }

  private fun diagonalUpEdge(lumaValues: DoubleArray, width: Int, x: Int, y: Int): Double {
    return abs(lumaValues[(y - 1) * width + x - 1] - lumaValues[(y + 1) * width + x + 1])
  }

  private fun orientationKind(angleDeg: Double, length: Double): String {
    if (!isFinite(length) || length <= 0.0 || !isFinite(angleDeg)) return "unknown"

    val absoluteAngle = abs(angleDeg)
    val horizontalDistance = min(absoluteAngle, abs(180.0 - absoluteAngle))
    val verticalDistance = abs(90.0 - absoluteAngle)
    return when {
      horizontalDistance <= 15.0 -> "horizontal"
      verticalDistance <= 15.0 -> "vertical"
      else -> "diagonal"
    }
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
