package com.normacamera.frameanalysis

import androidx.camera.core.ImageProxy
import com.margelo.nitro.camera.public.NativeFrame
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max
import kotlin.math.min

object NormaVisionCameraFrameAnalyzer {
  private const val TARGET_GRID_WIDTH = 32
  private const val TARGET_GRID_HEIGHT = 24
  private const val MIN_ANALYSIS_INTERVAL_MS = 250L

  private val busy = AtomicBoolean(false)

  @Volatile
  private var lastAnalysisAtMs = 0L

  @Volatile
  private var firstAnalysisAtMs = 0L

  @Volatile
  private var updateCount = 0L

  fun analyzeFrame(frame: Any?): Map<String, Any?>? {
    val nativeFrame = frame as? NativeFrame ?: return null
    val nowMs = System.currentTimeMillis()

    if (nowMs - lastAnalysisAtMs < MIN_ANALYSIS_INTERVAL_MS) {
      return NormaFrameAnalysisStore.getLatestAnalysis()
    }

    if (!busy.compareAndSet(false, true)) {
      return NormaFrameAnalysisStore.getLatestAnalysis()
    }

    try {
      val image = nativeFrame.image
      val grid = downsampleYPlane(image) ?: return null
      val nextUpdateCount = updateCount + 1
      updateCount = nextUpdateCount
      if (firstAnalysisAtMs == 0L) firstAnalysisAtMs = nowMs
      lastAnalysisAtMs = nowMs

      val elapsedSeconds = max(0.001, (nowMs - firstAnalysisAtMs) / 1000.0)
      val analysisFps = nextUpdateCount / elapsedSeconds

      return NormaFrameAnalysisStore.analyzeDownsampledLumaGrid(
        values = grid.values,
        width = grid.width,
        height = grid.height,
        createdAtMs = nowMs,
        valueRange = LumaValueRange.BYTE,
        analysisSource = "live-frame",
        updateCount = nextUpdateCount,
        analysisFps = analysisFps
      )
    } catch (_: Throwable) {
      return null
    } finally {
      busy.set(false)
    }
  }

  @Synchronized
  fun reset() {
    lastAnalysisAtMs = 0L
    firstAnalysisAtMs = 0L
    updateCount = 0L
  }

  private fun downsampleYPlane(image: ImageProxy): LumaGridSample? {
    if (image.width <= 0 || image.height <= 0) return null
    val yPlane = image.planes.firstOrNull() ?: return null
    val gridWidth = min(TARGET_GRID_WIDTH, image.width)
    val gridHeight = min(TARGET_GRID_HEIGHT, image.height)
    if (gridWidth <= 0 || gridHeight <= 0) return null

    val values = DoubleArray(gridWidth * gridHeight)
    val buffer = yPlane.buffer.duplicate()
    val rowStride = yPlane.rowStride
    val pixelStride = yPlane.pixelStride
    val bufferLimit = buffer.limit()

    for (gridY in 0 until gridHeight) {
      val sourceY = min(image.height - 1, ((gridY + 0.5) * image.height / gridHeight).toInt())
      for (gridX in 0 until gridWidth) {
        val sourceX = min(image.width - 1, ((gridX + 0.5) * image.width / gridWidth).toInt())
        val byteIndex = sourceY * rowStride + sourceX * pixelStride
        val lumaByte = if (byteIndex in 0 until bufferLimit) buffer.get(byteIndex).toInt() and 0xff else 0
        values[gridY * gridWidth + gridX] = lumaByte.toDouble()
      }
    }

    return LumaGridSample(values = values, width = gridWidth, height = gridHeight)
  }

  private data class LumaGridSample(
    val values: DoubleArray,
    val width: Int,
    val height: Int
  )
}
