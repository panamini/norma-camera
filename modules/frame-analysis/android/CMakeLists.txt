project(NormaFrameAnalysis)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME NormaFrameAnalysis)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

add_library(${PACKAGE_NAME} SHARED
  src/main/cpp/cpp-adapter.cpp
  src/main/cpp/HybridNormaFrameAnalyzer.cpp
)

include_directories(
  src/main/cpp
  ../../../node_modules/react-native-vision-camera/nitrogen/generated/shared/c++
  ../../../node_modules/react-native-vision-camera/nitrogen/generated/android/c++
)

find_library(LOG_LIB log)
find_package(react-native-nitro-modules REQUIRED)
find_package(react-native-vision-camera REQUIRED)

target_link_libraries(
  ${PACKAGE_NAME}
  ${LOG_LIB}
  react-native-nitro-modules::NitroModules
  react-native-vision-camera::VisionCamera
)
