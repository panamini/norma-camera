#include "HybridNormaFrameAnalyzer.hpp"

#include <NitroModules/HybridObjectRegistry.hpp>
#include <fbjni/fbjni.h>
#include <memory>

#include "JHybridFrameSpec.hpp"

namespace normacamera::frameanalysis {

namespace jni = facebook::jni;
using margelo::nitro::Prototype;
using margelo::nitro::registerHybrids;

struct NormaVisionCameraFrameAnalyzerBridge : jni::JavaClass<NormaVisionCameraFrameAnalyzerBridge> {
  static constexpr auto kJavaDescriptor = "Lcom/normacamera/frameanalysis/NormaVisionCameraFrameAnalyzerBridge;";

  static bool analyze(const jni::alias_ref<margelo::nitro::camera::JHybridFrameSpec::JavaPart>& frame) {
    static const auto method = javaClassStatic()->getStaticMethod<jboolean(jni::alias_ref<margelo::nitro::camera::JHybridFrameSpec::JavaPart>)>("analyze");
    return method(javaClassStatic(), frame) == JNI_TRUE;
  }
};

HybridNormaFrameAnalyzer::HybridNormaFrameAnalyzer() : HybridObject("NormaFrameAnalyzer") {}

bool HybridNormaFrameAnalyzer::analyze(const std::shared_ptr<margelo::nitro::camera::HybridFrameSpec>& frame) {
  if (frame == nullptr) return false;

  auto javaFrame = std::dynamic_pointer_cast<margelo::nitro::camera::JHybridFrameSpec>(frame);
  if (javaFrame == nullptr) return false;

  return jni::ThreadScope::WithClassLoader([&]() -> bool {
    return NormaVisionCameraFrameAnalyzerBridge::analyze(javaFrame->getJavaPart());
  });
}

void HybridNormaFrameAnalyzer::loadHybridMethods() {
  HybridObject::loadHybridMethods();
  registerHybrids(this, [](Prototype& prototype) {
    prototype.registerHybridMethod("analyze", &HybridNormaFrameAnalyzer::analyze);
  });
}

void registerNormaFrameAnalyzerHybridObject() {
  margelo::nitro::HybridObjectRegistry::registerHybridObjectConstructor(
    "NormaFrameAnalyzer",
    []() -> std::shared_ptr<margelo::nitro::HybridObject> {
      return std::make_shared<HybridNormaFrameAnalyzer>();
    }
  );
}

} // namespace normacamera::frameanalysis
