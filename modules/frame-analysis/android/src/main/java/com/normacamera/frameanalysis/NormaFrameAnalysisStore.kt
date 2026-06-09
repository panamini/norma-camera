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
    val subject = VisualMassHeuristic.detect(values, width, height, valueRange)
    val explanation = when {
      analysisSource == "live-frame" && subject != null ->
        "Real live Android luminance metrics and a coarse native visual-mass candidate are available. This is not semantic object detection."
      analysisSource == "live-frame" ->
        "Real live Android luminance metrics are available, but no strong visual-mass candidate passed the confidence threshold. No semantic object detection is used."
      subject != null ->
        "Real Android luminance metrics and a coarse native visual-mass candidate are available. This is not semantic object detection."
      else ->
        "Real Android luminance metrics are available, but no strong visual-mass candidate passed the confidence threshold. No semantic object detection is used."
    }
    val result = mutableMapOf<String, Any?>(
      "status" to "low-confidence",
      "createdAtMs" to createdAtMs,
      "subject" to subject?.toMap(),
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
  fun recordAnalyzerUnavailable(createdAtMs: Long, reason: String): Map<String, Any?> {
    val result = mapOf<String, Any?>(
      "status" to "unavailable",
      "createdAtMs" to createdAtMs,
      "subject" to null,
      "exposure" to null,
      "sharpness" to null,
      "analysisSource" to "analyzer-unavailable",
      "explanation" to "Native analyzer unavailable: $reason."
    )
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
