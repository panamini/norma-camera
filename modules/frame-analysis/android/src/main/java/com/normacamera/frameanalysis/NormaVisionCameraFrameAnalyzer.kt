package com.normacamera.frameanalysis

import androidx.camera.core.ImageProxy
import com.margelo.nitro.camera.CameraOrientation
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.min

object NormaVisionCameraFrameAnalyzer {
  private const val TARGET_GRID_WIDTH = 32
  private const val TARGET_GRID_HEIGHT = 24
  private const val MIN_ANALYSIS_INTERVAL_MS = 250L
  private const val MIN_UNAVAILABLE_INTERVAL_MS = 1_000L

  private val busy = AtomicBoolean(false)

  @Volatile
  private var lastAnalysisAtMs = 0L

  @Volatile
  private var lastUnavailableAtMs = 0L

  @Volatile
  private var firstAnalysisAtMs = 0L

  @Volatile
  private var updateCount = 0L

  fun analyzeFrame(frame: HybridFrameSpec?): Map<String, Any?>? {
    val nowMs = System.currentTimeMillis()

    if (nowMs - lastAnalysisAtMs < MIN_ANALYSIS_INTERVAL_MS) {
      return NormaFrameAnalysisStore.getLatestAnalysis()
    }

    if (!busy.compareAndSet(false, true)) {
      return NormaFrameAnalysisStore.getLatestAnalysis()
    }

    try {
      val nativeFrame = frame as? NativeFrame ?: return recordAnalyzerUnavailable(nowMs, "frame is not a NativeFrame")
      val grid = downsampleYPlane(nativeFrame.image) ?: return recordAnalyzerUnavailable(nowMs, "Y plane downsample unavailable")
      val previousFirstAnalysisAtMs = firstAnalysisAtMs
      val nextUpdateCount = updateCount + 1
      updateCount = nextUpdateCount
      if (previousFirstAnalysisAtMs == 0L) firstAnalysisAtMs = nowMs
      lastAnalysisAtMs = nowMs

      val analysisFps = if (previousFirstAnalysisAtMs > 0L && nowMs > previousFirstAnalysisAtMs) {
        (nextUpdateCount - 1) / ((nowMs - previousFirstAnalysisAtMs) / 1000.0)
      } else {
        null
      }

      return NormaFrameAnalysisStore.analyzeDownsampledLumaGrid(
        values = grid.values,
        width = grid.width,
        height = grid.height,
        createdAtMs = nowMs,
        valueRange = LumaValueRange.BYTE,
        analysisSource = "live-frame",
        frameWidth = nativeFrame.image.width,
        frameHeight = nativeFrame.image.height,
        frameOrientation = normalizeFrameOrientation(frame.orientation),
        isMirrored = frame.isMirrored,
        updateCount = nextUpdateCount,
        analysisFps = analysisFps
      )
    } catch (_: Exception) {
      return recordAnalyzerUnavailable(nowMs, "native analyzer exception")
    } finally {
      busy.set(false)
    }
  }

  fun reset() {
    if (!busy.compareAndSet(false, true)) return
    try {
      lastAnalysisAtMs = 0L
      lastUnavailableAtMs = 0L
      firstAnalysisAtMs = 0L
      updateCount = 0L
    } finally {
      busy.set(false)
    }
  }

  private fun recordAnalyzerUnavailable(nowMs: Long, reason: String): Map<String, Any?>? {
    val latest = NormaFrameAnalysisStore.getLatestAnalysis()
    if (nowMs - lastUnavailableAtMs < MIN_UNAVAILABLE_INTERVAL_MS) {
      return latest
    }

    lastUnavailableAtMs = nowMs
    return NormaFrameAnalysisStore.recordAnalyzerUnavailable(createdAtMs = nowMs, reason = reason)
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

  private fun normalizeFrameOrientation(orientation: CameraOrientation): String {
    return when (orientation) {
      CameraOrientation.UP -> "up"
      CameraOrientation.RIGHT -> "right"
      CameraOrientation.DOWN -> "down"
      CameraOrientation.LEFT -> "left"
    }
  }

  private data class LumaGridSample(
    val values: DoubleArray,
    val width: Int,
    val height: Int
  )
}
