import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
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

const SplashScreen: React.FC<{ status: string }> = ({ status }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={splashStyles.container}>
      <Animated.View style={[splashStyles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={splashStyles.logoRing}>
          <Text style={splashStyles.logoIcon}>🔐</Text>
        </View>
        <Text style={splashStyles.appName}>TollGuard</Text>
        <Text style={splashStyles.appSubtitle}>AI  ·  Face Auth  ·  Offline</Text>

        <View style={splashStyles.divider} />

        <ActivityIndicator color="#007AFF" size="small" style={{ marginBottom: 10 }} />
        <Text style={splashStyles.statusText}>{status}</Text>

        <View style={splashStyles.badgeRow}>
          <View style={splashStyles.badge}>
            <Text style={splashStyles.badgeText}>AES-256</Text>
          </View>
          <View style={splashStyles.badge}>
            <Text style={splashStyles.badgeText}>TFLite</Text>
          </View>
          <View style={splashStyles.badge}>
            <Text style={splashStyles.badgeText}>100% Offline</Text>
          </View>
        </View>
      </Animated.View>

      <Text style={splashStyles.footerText}>HACKATHON 7.0  ·  TollGuardAI</Text>
    </View>
  );
};

const AppContent: React.FC = () => {
  const [initialized, setInitializedState] = useState(false);
  const [initStatus, setInitStatus] = useState('Initializing database…');
  const dispatch = useDispatch();

  useEffect(() => {
    const initialize = async () => {
      try {
        setInitStatus('Decrypting local database…');
        await initDatabase();

        setInitStatus('Loading face recognition models…');
        await initializeFaceAuth();

        setInitStatus('Starting network monitor…');
        initNetworkMonitor();
        startNetworkWatcher(isOnline => {
          dispatch(setOnline(isOnline));
        });
        subscribeToNetworkStatus(status => {
          dispatch(setOnline(status.isOnline));
        });

        setInitStatus('Checking sync queue…');
        const syncStatus = await getSyncStatus();
        dispatch(setPendingCount(syncStatus.pendingCount));
        dispatch(setInitialized(true));

        setInitStatus('Ready');
        setInitializedState(true);
      } catch (err: any) {
        console.error('Initialization error:', err);
        Alert.alert(
          'Initialization Failed',
          'Failed to start FaceAuth: ' + (err.message || 'Unknown error'),
          [{ text: 'Retry', onPress: () => initialize() }]
        );
      }
    };
    initialize();
  }, [dispatch]);

  if (!initialized) {
    return <SplashScreen status={initStatus} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0a0e27' },
          animationEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
        }}
      >
        <Stack.Screen name="Home">
          {props => <HomeScreen {...props} onNavigate={screen => props.navigation.navigate(screen)} />}
        </Stack.Screen>
        <Stack.Screen name="Auth">
          {props => <AuthScreen {...props} onBack={() => props.navigation.goBack()} />}
        </Stack.Screen>
        <Stack.Screen name="Enroll">
          {props => <EnrollScreen {...props} onBack={() => props.navigation.goBack()} />}
        </Stack.Screen>
        <Stack.Screen name="History">
          {props => <HistoryScreen {...props} onBack={() => props.navigation.goBack()} />}
        </Stack.Screen>
        <Stack.Screen name="Admin">
          {props => <AdminScreen {...props} onBack={() => props.navigation.goBack()} />}
        </Stack.Screen>
        <Stack.Screen name="Settings">
          {props => <SettingsScreen {...props} onBack={() => props.navigation.goBack()} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <AppContent />
      </ReduxProvider>
    </GestureHandlerRootView>
  );
};

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050914',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: { alignItems: 'center', width: '100%' },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,122,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(0,122,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: { fontSize: 44 },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#718096',
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 32,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(0,122,255,0.4)',
    borderRadius: 1,
    marginBottom: 28,
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 28,
  },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  footerText: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 1.5,
  },
});

export default App;
