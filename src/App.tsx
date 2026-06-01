import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
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

const Stack = createStackNavigator();

const AppContent: React.FC = () => {
  const [initialized, setInitializedState] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        const faceAuthReady = await initializeFaceAuth();
        initNetworkMonitor();
        startNetworkWatcher(isOnline => {
          dispatch(setOnline(isOnline));
        });
        subscribeToNetworkStatus(status => {
          dispatch(setOnline(status.isOnline));
        });
        const syncStatus = await getSyncStatus();
        dispatch(setPendingCount(syncStatus.pendingCount));
        dispatch(setInitialized(true));
        setInitializedState(true);
      } catch (err: any) {
        console.error('Initialization error:', err);
        Alert.alert('Error', 'Failed to initialize app: ' + err.message);
      }
    };
    initialize();
  }, [dispatch]);

  if (!initialized) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#1a1a2e' },
          animationEnabled: true,
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

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
});

export default App;
