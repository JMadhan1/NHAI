import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { setOnline, setPendingCount } from './store/syncSlice';
import { setInitialized } from './store/authSlice';
import { store } from './store/store';
import { initDatabase } from './services/StorageService';
import { initializeFaceAuth } from './services/AuthService';
import { initNetworkMonitor, subscribeToNetworkStatus } from './services/NetworkMonitor';
import { getSyncStatus, startNetworkWatcher } from './services/SyncService';
import { HomeScreen } from './screens/HomeScreen';
import { AuthScreen } from './screens/AuthScreen';
import { EnrollScreen } from './screens/EnrollScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { AdminScreen } from './screens/AdminScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const Stack = createStackNavigator();
const { width } = Dimensions.get('window');

const INIT_STEPS = [
  'Decrypting secure database…',
  'Loading BlazeFace model…',
  'Loading MobileFaceNet…',
  'Starting network monitor…',
  'Verifying sync queue…',
  'System ready.',
];

const SplashScreen: React.FC<{ step: number }> = ({ step }) => {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const statusFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, { toValue: 1.4, duration: 1200, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: ((step + 1) / INIT_STEPS.length) * (width - 80),
      duration: 350,
      useNativeDriver: false,
    }).start();

    Animated.sequence([
      Animated.timing(statusFade, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(statusFade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [step]);

  return (
    <View style={sp.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050B18" />

      <Animated.View style={[sp.content, { opacity: fadeIn }]}>

        <View style={sp.logoWrap}>
          <Animated.View style={[sp.ring, { transform: [{ scale: ringScale }], opacity: 0.25 }]} />
          <Animated.View style={[sp.logoCircle, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <Text style={sp.logoLetter}>V</Text>
          </Animated.View>
        </View>

        <Text style={sp.appName}>VisorAI</Text>
        <Text style={sp.appTagline}>VISION · IDENTITY · SECURITY</Text>

        <View style={sp.divider} />

        <View style={sp.chips}>
          {['TFLite', 'AES-256', 'SQLCipher', '100% Offline'].map(c => (
            <View key={c} style={sp.chip}>
              <Text style={sp.chipText}>{c}</Text>
            </View>
          ))}
        </View>

        <View style={sp.progressSection}>
          <Animated.Text style={[sp.statusText, { opacity: statusFade }]}>
            {INIT_STEPS[Math.min(step, INIT_STEPS.length - 1)]}
          </Animated.Text>
          <View style={sp.progressTrack}>
            <Animated.View style={[sp.progressBar, { width: barWidth }]} />
          </View>
        </View>

      </Animated.View>

      <Text style={sp.footerText}>HACKATHON 7.0  ·  VISORAI TEAM</Text>
    </View>
  );
};

const AppContent: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [initStep, setInitStep] = useState(0);
  const dispatch = useDispatch();

  useEffect(() => {
    const init = async () => {
      try {
        setInitStep(0); await initDatabase();
        setInitStep(1); await new Promise(r => setTimeout(r, 300));
        setInitStep(2); await initializeFaceAuth();
        setInitStep(3);
        initNetworkMonitor();
        startNetworkWatcher(online => dispatch(setOnline(online)));
        subscribeToNetworkStatus(s => dispatch(setOnline(s.isOnline)));
        setInitStep(4);
        const sync = await getSyncStatus();
        dispatch(setPendingCount(sync.pendingCount));
        dispatch(setInitialized(true));
        setInitStep(5);
        await new Promise(r => setTimeout(r, 600));
        setReady(true);
      } catch (err: any) {
        Alert.alert('Boot Error', err?.message ?? 'Failed to start VisorAI', [
          { text: 'Retry', onPress: () => init() },
        ]);
      }
    };
    init();
  }, [dispatch]);

  if (!ready) return <SplashScreen step={initStep} />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#050B18' },
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [{
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              }],
              opacity: current.progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
            },
          }),
        }}
      >
        <Stack.Screen name="Home">
          {p => <HomeScreen {...p} onNavigate={s => p.navigation.navigate(s)} />}
        </Stack.Screen>
        <Stack.Screen name="Auth">
          {p => <AuthScreen {...p} onBack={() => p.navigation.goBack()} />}
        </Stack.Screen>
        <Stack.Screen name="Enroll">
          {p => <EnrollScreen {...p} onBack={() => p.navigation.goBack()} />}
        </Stack.Screen>
        <Stack.Screen name="History">
          {p => <HistoryScreen {...p} onBack={() => p.navigation.goBack()} />}
        </Stack.Screen>
        <Stack.Screen name="Admin">
          {p => <AdminScreen {...p} onBack={() => p.navigation.goBack()} />}
        </Stack.Screen>
        <Stack.Screen name="Settings">
          {p => <SettingsScreen {...p} onBack={() => p.navigation.goBack()} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App: React.FC = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <ReduxProvider store={store}>
      <AppContent />
    </ReduxProvider>
  </GestureHandlerRootView>
);

const sp = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#050B18',
    justifyContent: 'center', alignItems: 'center',
  },
  content: { alignItems: 'center', width: '100%', paddingHorizontal: 40 },

  logoWrap: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  ring: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: '#00D4FF',
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderWidth: 2, borderColor: 'rgba(0,212,255,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoLetter: { fontSize: 38, fontWeight: '900', color: '#00D4FF' },

  appName: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 2, marginBottom: 6 },
  appTagline: { fontSize: 10, color: '#4A5568', fontWeight: '700', letterSpacing: 3, marginBottom: 28 },

  divider: { width: 40, height: 2, backgroundColor: 'rgba(0,212,255,0.3)', borderRadius: 1, marginBottom: 24 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 40 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },

  progressSection: { width: '100%', alignItems: 'center', gap: 12 },
  statusText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', height: 20 },
  progressTrack: {
    width: width - 80, height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2,
  },
  progressBar: {
    height: 3, borderRadius: 2,
    backgroundColor: '#00D4FF',
    shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6,
  },

  footerText: {
    position: 'absolute', bottom: 40,
    fontSize: 10, color: '#1E2840', fontWeight: '600', letterSpacing: 2,
  },
});

export default App;
