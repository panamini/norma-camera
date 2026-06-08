package com.normacamera.frameanalysis

object NormaFrameAnalysisStore {
  @Volatile
  private var latestAnalysis: Map<String, Any?>? = null

  fun getLatestAnalysis(): Map<String, Any?>? = latestAnalysis

  fun reset() {
    latestAnalysis = null
  }
}
