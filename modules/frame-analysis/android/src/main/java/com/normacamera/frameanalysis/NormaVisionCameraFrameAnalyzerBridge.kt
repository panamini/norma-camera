package com.normacamera.frameanalysis

import com.margelo.nitro.camera.HybridFrameSpec

object NormaVisionCameraFrameAnalyzerBridge {
  @JvmStatic
  fun analyze(frame: HybridFrameSpec?): Boolean {
    return NormaVisionCameraFrameAnalyzer.analyzeFrame(frame) != null
  }
}
