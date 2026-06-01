import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';
import type { LivenessChallenge as ChallengeType, LivenessResult, FaceLandmarks } from '../types';
import { LIVENESS_CHALLENGES, CONSTANTS } from '../utils/constants';
import { computeEAR, computeMAR } from '../native/FaceAuthBridge';

interface Props {
  challenges: ChallengeType[];
  landmarks: FaceLandmarks | null;
  onComplete: (result: LivenessResult) => void;
  onTimeout: () => void;
}

const { width } = Dimensions.get('window');

export const LivenessChallengeView: React.FC<Props> = ({
  challenges,
  landmarks,
  onComplete,
  onTimeout,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [passedChallenges, setPassedChallenges] = useState<ChallengeType[]>([]);
  const [failedChallenges, setFailedChallenges] = useState<ChallengeType[]>([]);
  const [timeLeft, setTimeLeft] = useState(CONSTANTS.LIVENESS_TIMEOUT_MS / 1000);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(3);
  const startTime = useRef(Date.now());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentChallenge = challenges[currentIndex];
  const config = LIVENESS_CHALLENGES.find(c => c.type === currentChallenge);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [currentIndex, pulseAnim]);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      const remaining = Math.max(0, CONSTANTS.LIVENESS_TIMEOUT_MS / 1000 - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        clearInterval(timer);
        onTimeout();
      }
    }, 200);
    return () => clearInterval(timer);
  }, [onTimeout]);

  useEffect(() => {
    setChallengeTimeLeft(3);
    const timer = setInterval(() => {
      setChallengeTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleChallengeFailed();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  useEffect(() => {
    if (!landmarks || !currentChallenge) return;
    let passed = false;
    switch (currentChallenge) {
      case 'BLINK': {
        const leftEAR = computeEAR(landmarks.leftEye);
        const rightEAR = computeEAR(landmarks.rightEye);
        passed = (leftEAR + rightEAR) / 2 < CONSTANTS.EAR_BLINK_THRESHOLD;
        break;
      }
      case 'SMILE': {
        const mar = computeMAR(landmarks.mouth);
        passed = mar > CONSTANTS.MAR_SMILE_THRESHOLD;
        break;
      }
      case 'TURN_LEFT':
        passed = landmarks.headPose.yaw < -CONSTANTS.HEAD_TURN_THRESHOLD_DEG;
        break;
      case 'TURN_RIGHT':
        passed = landmarks.headPose.yaw > CONSTANTS.HEAD_TURN_THRESHOLD_DEG;
        break;
      case 'NOD':
        passed = Math.abs(landmarks.headPose.pitch) > CONSTANTS.HEAD_NOD_THRESHOLD_DEG;
        break;
    }
    if (passed) {
      handleChallengePassed();
    }
  }, [landmarks, currentChallenge]);

  const handleChallengePassed = useCallback(() => {
    if (checkInterval.current) clearInterval(checkInterval.current);
    Vibration.vibrate(100);
    const newPassed = [...passedChallenges, currentChallenge];
    setPassedChallenges(newPassed);
    if (newPassed.length + failedChallenges.length >= challenges.length) {
      finalizeLiveness(newPassed, failedChallenges);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [currentChallenge, passedChallenges, failedChallenges, challenges]);

  const handleChallengeFailed = useCallback(() => {
    const newFailed = [...failedChallenges, currentChallenge];
    setFailedChallenges(newFailed);
    if (passedChallenges.length + newFailed.length >= challenges.length) {
      finalizeLiveness(passedChallenges, newFailed);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [currentChallenge, passedChallenges, failedChallenges, challenges]);

  const finalizeLiveness = (passed: ChallengeType[], failed: ChallengeType[]) => {
    const score = passed.length / challenges.length;
    const result: LivenessResult = {
      passed: passed.length >= Math.ceil(challenges.length * 0.5),
      challengesPassed: passed,
      challengesFailed: failed,
      score,
      durationMs: Date.now() - startTime.current,
    };
    onComplete(result);
  };

  if (!config) return null;

  return (
    <View style={styles.container}>
      <View style={styles.timerRow}>
        <Text style={styles.timerText}>⏱ {timeLeft}s</Text>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {challenges.length}
        </Text>
      </View>

      <View style={styles.dotsRow}>
        {challenges.map((ch, idx) => (
          <View
            key={ch}
            style={[
              styles.dot,
              passedChallenges.includes(ch) && styles.dotPassed,
              failedChallenges.includes(ch) && styles.dotFailed,
              idx === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <Animated.View style={[styles.challengeCard, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.challengeIcon}>{config.icon}</Text>
        <Text style={styles.challengeInstruction}>{config.instruction}</Text>
        <Text style={styles.challengeTimer}>{challengeTimeLeft}s</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 24 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  timerText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  progressText: { fontSize: 16, color: '#fff' },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotPassed: { backgroundColor: '#4CAF50' },
  dotFailed: { backgroundColor: '#f44336' },
  dotActive: { backgroundColor: '#fff' },
  challengeCard: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    minWidth: width * 0.7,
  },
  challengeIcon: { fontSize: 56, marginBottom: 16 },
  challengeInstruction: { fontSize: 22, color: '#fff', fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  challengeTimer: { fontSize: 36, color: '#FFD700', fontWeight: '800' },
});
