import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { CameraPermissionGate } from '../camera/CameraPermissionGate';
import { CameraScreen } from '../camera/CameraScreen';

export function AppRoot() {
  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <CameraPermissionGate>
        <CameraScreen />
      </CameraPermissionGate>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000'
  }
});
