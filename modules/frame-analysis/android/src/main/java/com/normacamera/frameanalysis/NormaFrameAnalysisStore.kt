package com.normacamera.frameanalysis

object NormaFrameAnalysisStore {
  @Volatile
  private var latestAnalysis: Map<String, Any?>? = null

  @Synchronized
  fun analyzeDownsampledLumaGrid(
    values: DoubleArray,
    width: Int,
    height: Int,
    createdAtMs: Long,
    valueRange: LumaValueRange = LumaValueRange.AUTO,
    analysisSource: String? = null,
    updateCount: Long? = null,
    analysisFps: Double? = null
  ): Map<String, Any?> {
    val metrics = LumaMetrics.compute(values, width, height, valueRange)
    val explanation = if (analysisSource == "live-frame") {
      "Real live Android luminance metrics from VisionCamera frames are available. Visual-mass candidate selection is deferred, and no semantic object detection is used."
    } else {
      "Real Android luminance quality metrics are available. Visual-mass candidate selection is deferred, and no semantic object detection is used."
    }
    val result = mutableMapOf<String, Any?>(
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
      "explanation" to explanation
    )

    if (analysisSource != null) result["analysisSource"] = analysisSource
    if (updateCount != null) result["updateCount"] = updateCount.toDouble()
    if (analysisFps != null) result["analysisFps"] = analysisFps

    latestAnalysis = result
    return result
  }

  @Synchronized
  fun getLatestAnalysis(): Map<String, Any?>? = latestAnalysis

  @Synchronized
  fun reset() {
    latestAnalysis = null
  }
}
