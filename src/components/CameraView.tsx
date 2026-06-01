import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useSharedValue } from 'react-native-reanimated';

interface Props {
  onFrameCapture: (base64: string) => void;
  isActive: boolean;
  facing?: 'front' | 'back';
}

export const CameraView: React.FC<Props> = ({ onFrameCapture, isActive, facing = 'front' }) => {
  const device = useCameraDevice(facing);
  const [hasPermission, setHasPermission] = useState(false);
  const frameCount = useRef(0);
  const lastFrameTime = useRef(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
      } catch (err) {
        Alert.alert('Permission Error', 'Camera permission denied');
      }
    })();
  }, []);

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    frameCount.current += 1;
    if (frameCount.current % 5 === 0) {
      const now = Date.now();
      if (now - lastFrameTime.current > 333) {
        lastFrameTime.current = now;
        if (frame) {
          try {
            const image = frame.image;
            if (image) {
              console.log('Frame captured:', image.width, 'x', image.height);
            }
          } catch (e) {
            console.error('Error processing frame:', e);
          }
        }
      }
    }
  }, []);

  if (!hasPermission) {
    return <View style={styles.denied} />;
  }

  if (!device) {
    return <View style={styles.noCam} />;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={isActive}
        frameProcessor={frameProcessor}
        photo={true}
        video={false}
        audio={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  noCam: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
});
