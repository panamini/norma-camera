import { useCameraDevice, type CameraDevice } from 'react-native-vision-camera';

export function useCameraDeviceSafe(): CameraDevice | undefined {
  return useCameraDevice('back');
}
