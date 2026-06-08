package com.normacamera.frameanalysis

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NormaFrameAnalysisModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NormaFrameAnalysis")

    AsyncFunction("getLatestAnalysis") {
      NormaFrameAnalysisStore.getLatestAnalysis()
    }

    Function("reset") {
      NormaFrameAnalysisStore.reset()
    }
  }
}
