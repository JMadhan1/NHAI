import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, Animated, Dimensions, StatusBar,
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
import { getCurrentSession, logout } from './services/SessionService';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { EnrollScreen } from './screens/EnrollScreen';
import { PersonalDashboard } from './screens/PersonalDashboard';
import { HomeScreen } from './screens/HomeScreen';
import { AuthScreen } from './screens/AuthScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { AdminScreen } from './screens/AdminScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { EmployeeDashboard } from './screens/EmployeeDashboard';
import { EmployeeManagement } from './screens/EmployeeManagement';

const Stack = createStackNavigator();
const { width } = Dimensions.get('window');

const INIT_STEPS = [
  'Initializing database…',
  'Loading face recognition models…',
  'Starting system…',
  'Checking authentication…',
  'System ready.',
];

const SplashScreen: React.FC<{ step: number }> = ({ step }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={sp.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050B18" />
      <Animated.View style={[sp.content, { opacity: fade }]}>
        <Animated.View style={[sp.logo, { transform: [{ scale }] }]}>
          <Text style={sp.logoLetter}>V</Text>
        </Animated.View>
        <Text style={sp.appName}>VisorAI</Text>
        <Text style={sp.tagline}>SECURE AUTHENTICATION</Text>
        <View style={sp.progress}>
          <Text style={sp.statusText}>{INIT_STEPS[Math.min(step, INIT_STEPS.length - 1)]}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const AppContent: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const init = async () => {
      try {
        setStep(0);
        await initDatabase();

        setStep(1);
        await new Promise(r => setTimeout(r, 250));
        await initializeFaceAuth();

        setStep(2);
        initNetworkMonitor();
        startNetworkWatcher(online => dispatch(setOnline(online)));
        subscribeToNetworkStatus(st => dispatch(setOnline(st.isOnline)));

        setStep(3);
        // Check if user is already logged in
        const session = await getCurrentSession();
        if (session) {
          setIsLoggedIn(true);
          setCurrentUserId(session.userId);
        }

        const sync = await getSyncStatus();
        dispatch(setPendingCount(sync.pendingCount));
        dispatch(setInitialized(true));

        setStep(4);
        await new Promise(r => setTimeout(r, 700));
        setReady(true);
      } catch (err: any) {
        Alert.alert('Startup Error', err?.message ?? 'Failed to start VisorAI', [
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
        {!isLoggedIn ? (
          <>
            {/* Authentication Flow */}
            <Stack.Screen
              name="Login"
              options={{ animationEnabled: false }}
            >
              {(props) => (
                <LoginScreen
                  onLoginSuccess={(userId) => {
                    setCurrentUserId(userId);
                    setIsLoggedIn(true);
                  }}
                  onNavigateToEnroll={() => props.navigation.navigate('EnrollPublic')}
                />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="EnrollPublic"
              options={{ animationEnabled: true }}
            >
              {(props) => (
                <EnrollScreen
                  onEnrollSuccess={(userId) => {
                    setCurrentUserId(userId);
                    setIsLoggedIn(true);
                    props.navigation.navigate('Dashboard');
                  }}
                  onBack={() => props.navigation.goBack()}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          <>
            {/* Authenticated Flow */}
            <Stack.Screen
              name="Dashboard"
              options={{ animationEnabled: false }}
            >
              {(props) => (
                <PersonalDashboard
                  onLogout={() => {
                    setIsLoggedIn(false);
                    setCurrentUserId(null);
                    props.navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                  }}
                  onNavigateToProfile={(userId) => {
                    props.navigation.navigate('Profile', { userId });
                  }}
                />
              )}
            </Stack.Screen>

            {/* Optional: Additional authenticated screens */}
            <Stack.Screen name="Home">
              {(p) => <HomeScreen {...p} onNavigate={sc => p.navigation.navigate(sc)} />}
            </Stack.Screen>
            <Stack.Screen name="Auth">
              {(p) => <AuthScreen {...p} onBack={() => p.navigation.goBack()} />}
            </Stack.Screen>
            <Stack.Screen name="Enroll">
              {(p) => <EnrollScreen {...p} onBack={() => p.navigation.goBack()} />}
            </Stack.Screen>
            <Stack.Screen name="History">
              {(p) => <HistoryScreen {...p} onBack={() => p.navigation.goBack()} />}
            </Stack.Screen>
            <Stack.Screen name="Admin">
              {(p) => <AdminScreen {...p} onBack={() => p.navigation.goBack()} />}
            </Stack.Screen>
            <Stack.Screen name="Settings">
              {(p) => <SettingsScreen {...p} onBack={() => p.navigation.goBack()} />}
            </Stack.Screen>
            <Stack.Screen name="EmployeeDashboard">
              {(p) => (
                <EmployeeDashboard
                  {...p}
                  onBack={() => p.navigation.goBack()}
                  employeeId={(p.route.params as { employeeId?: string } | undefined)?.employeeId ?? currentUserId ?? 'EMP-001'}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="EmployeeManagement">
              {(p) => (
                <EmployeeManagement
                  {...p}
                  onBack={() => p.navigation.goBack()}
                  onViewEmployee={eid => p.navigation.navigate('EmployeeDashboard', { employeeId: eid })}
                />
              )}
            </Stack.Screen>
          </>
        )}
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
  logo: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(0,212,255,0.12)', borderWidth: 2, borderColor: 'rgba(0,212,255,0.4)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  logoLetter: { fontSize: 38, fontWeight: '900', color: '#00D4FF' },
  appName: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 2, marginBottom: 6 },
  tagline: { fontSize: 10, color: '#4A5568', fontWeight: '700', letterSpacing: 3, marginBottom: 28 },
  progress: { width: '100%', alignItems: 'center', gap: 10, marginTop: 30 },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.38)', height: 18 },
});

export default App;
