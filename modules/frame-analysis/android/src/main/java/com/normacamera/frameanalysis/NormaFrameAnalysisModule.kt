package com.normacamera.frameanalysis

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NormaFrameAnalysisModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NormaFrameAnalysis")

    AsyncFunction("analyzeDownsampledLumaGrid") { values: List<Double>, width: Int, height: Int, createdAtMs: Double? ->
      val createdAt = createdAtMs?.takeIf { isFiniteDouble(it) }?.toLong() ?: System.currentTimeMillis()
      NormaFrameAnalysisStore.analyzeDownsampledLumaGrid(values.toDoubleArray(), width, height, createdAt)
    }

    AsyncFunction("getLatestAnalysis") {
      NormaFrameAnalysisStore.getLatestAnalysis()
    }

    Function("reset") {
      NormaFrameAnalysisStore.reset()
    }
  }

  private fun isFiniteDouble(value: Double): Boolean {
    return !value.isNaN() && !value.isInfinite()
  }
}
