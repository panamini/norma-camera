package com.normacamera.frameanalysis

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NormaFrameAnalysisModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NormaFrameAnalysis")

    AsyncFunction("analyzeDownsampledLumaGrid") { values: List<Double>, width: Int, height: Int, createdAtMs: Double?, valueRange: String? ->
      val createdAt = createdAtMs?.takeIf { isFiniteDouble(it) }?.toLong() ?: System.currentTimeMillis()
      NormaFrameAnalysisStore.analyzeDownsampledLumaGrid(values.toDoubleArray(), width, height, createdAt, parseValueRange(valueRange))
    }

    Function("analyzeVisionCameraFrame") { frame: Any? ->
      NormaVisionCameraFrameAnalyzer.analyzeFrame(frame)
    }

    AsyncFunction("getLatestAnalysis") {
      NormaFrameAnalysisStore.getLatestAnalysis()
    }

    Function("reset") {
      NormaVisionCameraFrameAnalyzer.reset()
      NormaFrameAnalysisStore.reset()
    }
  }

  private fun parseValueRange(valueRange: String?): LumaValueRange {
    return when (valueRange) {
      "unit" -> LumaValueRange.UNIT
      "byte" -> LumaValueRange.BYTE
      else -> LumaValueRange.AUTO
    }
  }

  private fun isFiniteDouble(value: Double): Boolean {
    return !value.isNaN() && !value.isInfinite()
  }
}
