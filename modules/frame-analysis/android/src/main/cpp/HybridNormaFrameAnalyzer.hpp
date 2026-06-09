#pragma once

#include <NitroModules/HybridObject.hpp>
#include <memory>

namespace margelo::nitro::camera {
class HybridFrameSpec;
}

namespace normacamera::frameanalysis {

class HybridNormaFrameAnalyzer final : public margelo::nitro::HybridObject {
public:
  HybridNormaFrameAnalyzer();
  ~HybridNormaFrameAnalyzer() override = default;

  bool analyze(const std::shared_ptr<margelo::nitro::camera::HybridFrameSpec>& frame);

protected:
  void loadHybridMethods() override;
};

} // namespace normacamera::frameanalysis
