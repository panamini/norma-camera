package com.normacamera.frameanalysis

object NormaFrameAnalysisStore {
  @Volatile
  private var latestAnalysis: Map<String, Any?>? = null

  fun analyzeDownsampledLumaGrid(
    values: DoubleArray,
    width: Int,
    height: Int,
    createdAtMs: Long
  ): Map<String, Any?> {
    val metrics = LumaMetrics.compute(values, width, height)
    val result: Map<String, Any?> = mapOf(
      "status" to "low-confidence",
      "createdAtMs" to createdAtMs,
      "subject" to null,
      "exposure" to mapOf(
        "exposureScore" to metrics.exposure.exposureScore,
        "meanLuma" to metrics.exposure.meanLuma,
        "clippedHighlightsRatio" to metrics.exposure.clippedHighlightsRatio,
        "crushedShadowsRatio" to metrics.exposure.crushedShadowsRatio
      ),
      "sharpness" to mapOf(
        "sharpnessScore" to metrics.sharpness.sharpnessScore,
        "edgeEnergy" to metrics.sharpness.edgeEnergy
      ),
      "explanation" to "Real Android luminance quality metrics are available. Visual-mass candidate selection is deferred, and no semantic object detection is used."
    )
    latestAnalysis = result
    return result
  }

  fun getLatestAnalysis(): Map<String, Any?>? = latestAnalysis

  fun reset() {
    latestAnalysis = null
  }
}
