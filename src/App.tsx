import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert,
  Animated, Dimensions, StatusBar,
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
import { EmployeeDashboard } from './screens/EmployeeDashboard';
import { EmployeeManagement } from './screens/EmployeeManagement';
import { PersonalDashboard } from './screens/PersonalDashboard';

const Stack = createStackNavigator();
const { width } = Dimensions.get('window');

const STEPS = [
  'Decrypting local database…',
  'Loading BlazeFace model…',
  'Loading MobileFaceNet…',
  'Starting network monitor…',
  'Checking sync queue…',
  'System ready.',
];

const SplashScreen: React.FC<{ step: number }> = ({ step }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.75)).current;
  const ring = useRef(new Animated.Value(1)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const statusFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1.45, duration: 1100, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.timing(bar, {
      toValue: ((step + 1) / STEPS.length) * (width - 80),
      duration: 380, useNativeDriver: false,
    }).start();
    Animated.sequence([
      Animated.timing(statusFade, { toValue: 0, duration: 80, useNativeDriver: true }),
      Animated.timing(statusFade, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [step]);

  return (
    <View style={sp.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050B18" />
      <Animated.View style={[sp.content, { opacity: fade }]}>
        <View style={sp.logoWrap}>
          <Animated.View style={[sp.ring, { transform: [{ scale: ring }], opacity: 0.22 }]} />
          <Animated.View style={[sp.logo, { transform: [{ scale }] }]}>
            <Text style={sp.logoLetter}>V</Text>
          </Animated.View>
        </View>
        <Text style={sp.appName}>VisorAI</Text>
        <Text style={sp.tagline}>VISION · IDENTITY · SECURITY</Text>
        <View style={sp.divider} />
        <View style={sp.chips}>
          {['TFLite', 'AES-256', 'SQLCipher', 'Offline-First'].map(c => (
            <View key={c} style={sp.chip}>
              <Text style={sp.chipText}>{c}</Text>
            </View>
          ))}
        </View>
        <View style={sp.progress}>
          <Animated.Text style={[sp.statusText, { opacity: statusFade }]}>
            {STEPS[Math.min(step, STEPS.length - 1)]}
          </Animated.Text>
          <View style={sp.track}>
            <Animated.View style={[sp.fill, { width: bar }]} />
          </View>
        </View>
      </Animated.View>
      <View style={sp.footer}>
        <Text style={sp.footerMain}>HACKATHON 7.0  ·  VISORAI</Text>
        <Text style={sp.footerBuilt}>Built by J Madhan</Text>
      </View>
    </View>
  );
};

const AppContent: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const dispatch = useDispatch();

  useEffect(() => {
    const init = async () => {
      try {
        setStep(0); await initDatabase();
        setStep(1); await new Promise(r => setTimeout(r, 250));
        setStep(2); await initializeFaceAuth();
        setStep(3);
        initNetworkMonitor();
        startNetworkWatcher(online => dispatch(setOnline(online)));
        subscribeToNetworkStatus(st => dispatch(setOnline(st.isOnline)));
        setStep(4);
        const sync = await getSyncStatus();
        dispatch(setPendingCount(sync.pendingCount));
        dispatch(setInitialized(true));
        setStep(5);
        await new Promise(r => setTimeout(r, 700));
        setReady(true);
      } catch (err: any) {
        Alert.alert('Boot Error', err?.message ?? 'Failed to start VisorAI', [
          { text: 'Retry', onPress: () => init() },
        ]);
      }
    };
    init();
  }, [dispatch]);

  if (!ready) return <SplashScreen step={step} />;

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
                  inputRange: [0, 1], outputRange: [layouts.screen.width, 0],
                }),
              }],
              opacity: current.progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            },
          }),
        }}
      >
        <Stack.Screen name="Home">
          {p => <HomeScreen {...p} onNavigate={sc => p.navigation.navigate(sc)} />}
        </Stack.Screen>
        <Stack.Screen name="Auth">
          {p => (
            <AuthScreen
              {...p}
              onBack={() => {
                // On successful auth, navigate to personal dashboard
                p.navigation.navigate('PersonalDashboard');
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="PersonalDashboard">
          {p => (
            <PersonalDashboard
              onLogout={() => p.navigation.goBack()}
              onNavigateToProfile={(userId) => {
                // Navigate to profile edit screen if needed
                p.navigation.navigate('Settings');
              }}
            />
          )}
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
        <Stack.Screen name="EmployeeDashboard">
          {p => (
            <EmployeeDashboard
              {...p}
              onBack={() => p.navigation.goBack()}
              employeeId={(p.route.params as { employeeId?: string } | undefined)?.employeeId ?? 'EMP-001'}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="EmployeeManagement">
          {p => (
            <EmployeeManagement
              {...p}
              onBack={() => p.navigation.goBack()}
              onViewEmployee={eid => p.navigation.navigate('EmployeeDashboard', { employeeId: eid })}
            />
          )}
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
  root: { flex: 1, backgroundColor: '#050B18', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', width: '100%', paddingHorizontal: 40 },
  logoWrap: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  ring: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: '#00D4FF',
  },
  logo: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(0,212,255,0.12)', borderWidth: 2, borderColor: 'rgba(0,212,255,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoLetter: { fontSize: 38, fontWeight: '900', color: '#00D4FF' },
  appName: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 2, marginBottom: 6 },
  tagline: { fontSize: 10, color: '#4A5568', fontWeight: '700', letterSpacing: 3, marginBottom: 28 },
  divider: { width: 40, height: 2, backgroundColor: 'rgba(0,212,255,0.3)', borderRadius: 1, marginBottom: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 36 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  progress: { width: '100%', alignItems: 'center', gap: 10 },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.38)', height: 18 },
  track: { width: width - 80, height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2 },
  fill: {
    height: 3, borderRadius: 2, backgroundColor: '#00D4FF',
    shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
  },
  footer: { position: 'absolute', bottom: 36, alignItems: 'center', gap: 3 },
  footerMain: { fontSize: 10, color: '#1E2840', fontWeight: '600', letterSpacing: 2 },
  footerBuilt: { fontSize: 12, color: '#2D3748', fontWeight: '700', letterSpacing: 0.5 },
});

export default App;
