package com.normacamera.frameanalysis

internal data class HorizontalLineCandidate(
  val x1: Double,
  val y1: Double,
  val x2: Double,
  val y2: Double,
  val angleDeg: Double,
  val confidence: Double,
  val kind: String = "horizontal-line"
) {
  fun toMap(): Map<String, Any> = mapOf(
    "x1" to x1,
    "y1" to y1,
    "x2" to x2,
    "y2" to y2,
    "angleDeg" to angleDeg,
    "confidence" to confidence,
    "kind" to kind
  )
}
