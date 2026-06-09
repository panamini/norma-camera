package com.normacamera.frameanalysis

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NormaFrameAnalysisModule : Module() {
  init {
    loadNitroRegistry()
  }

  override fun definition() = ModuleDefinition {
    Name("NormaFrameAnalysis")

    AsyncFunction("analyzeDownsampledLumaGrid") { values: List<Double>, width: Int, height: Int, createdAtMs: Double?, valueRange: String? ->
      val createdAt = createdAtMs?.takeIf { isFiniteDouble(it) }?.toLong() ?: System.currentTimeMillis()
      NormaFrameAnalysisStore.analyzeDownsampledLumaGrid(values.toDoubleArray(), width, height, createdAt, parseValueRange(valueRange))
    }

    AsyncFunction("getLatestAnalysis") {
      NormaFrameAnalysisStore.getLatestAnalysis()
    }

    Function("reset") {
      NormaFrameAnalysisStore.reset()
      NormaVisionCameraFrameAnalyzer.reset()
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

  private companion object {
    @Volatile
    private var nitroRegistryLoaded = false

    @Synchronized
    fun loadNitroRegistry() {
      if (nitroRegistryLoaded) return
      try {
        System.loadLibrary("NormaFrameAnalysis")
        nitroRegistryLoaded = true
      } catch (_: UnsatisfiedLinkError) {
        nitroRegistryLoaded = false
      }
    }
  }
}
