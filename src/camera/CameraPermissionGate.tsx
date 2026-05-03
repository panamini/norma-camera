import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';

type Props = {
  children: ReactNode;
};

export function CameraPermissionGate({ children }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();

  if (hasPermission) {
    return <>{children}</>;
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Camera permission required</Text>
      <Text style={styles.body}>norma-camera needs the app camera to show live composition guides.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Grant camera permission"
        onPress={() => {
          void requestPermission();
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Grant camera permission</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#000000',
    padding: 24
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center'
  },
  body: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  button: {
    borderRadius: 999,
    backgroundColor: '#f2b84b',
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  buttonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700'
  }
});
