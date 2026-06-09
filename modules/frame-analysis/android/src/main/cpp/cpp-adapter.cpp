#include <fbjni/fbjni.h>
#include <jni.h>

namespace normacamera::frameanalysis {
void registerNormaFrameAnalyzerHybridObject();
}

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    normacamera::frameanalysis::registerNormaFrameAnalyzerHybridObject();
  });
}
