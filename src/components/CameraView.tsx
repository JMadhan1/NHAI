import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

interface Props {
  onFrameCapture?: (base64: string) => void;
  isActive: boolean;
  facing?: 'front' | 'back';
}

export const CameraView: React.FC<Props> = ({ isActive, facing = 'front' }) => {
  const device = useCameraDevice(facing);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    Camera.requestCameraPermission().then(status => {
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Permission Error', 'Camera permission denied');
      }
    });
  }, []);

  if (!hasPermission || !device) {
    return <View style={styles.denied} />;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={isActive}
        photo={true}
        video={false}
        audio={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  denied: { flex: 1, backgroundColor: '#000' },
});
