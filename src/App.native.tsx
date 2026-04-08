import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  PermissionsAndroid,
  Platform,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { BleManager, Device } from 'react-native-ble-plx';
import { 
  Settings, 
  Gauge, 
  Timer, 
  User,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero
} from 'lucide-react-native';
import { 
  useSharedValue, 
  withSpring, 
} from 'react-native-reanimated';

// Import Screens
import LoginSplashScreen from './screens/LoginSplashScreen';
import QuickShifterScreen from './screens/QuickShifterScreen';
import RaceboxScreen from './screens/RaceboxScreen';
import SettingsScreen from './screens/SettingsScreen';
import ProfileScreen from './screens/ProfileScreen';

const bleManager = new BleManager();

// Constants for Racebox
const DISTANCE_60FT = 18.288;
const DISTANCE_201M = 201;
const DISTANCE_402M = 402;

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'racebox' | 'settings' | 'profile'>('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [rpm, setRpm] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [rssi, setRssi] = useState<number | null>(null);
  
  // Racebox State
  const [isRaceStarted, setIsRaceStarted] = useState(false);
  const [raceStartTime, setRaceStartTime] = useState<number | null>(null);
  const [currentRaceTime, setCurrentRaceTime] = useState(0);
  const [raceResults, setRaceResults] = useState({
    time0to100: 0,
    time60ft: 0,
    time201m: 0,
    time402m: 0,
    maxSpeed: 0,
    distance: 0
  });
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  // Quick Shifter Settings
  const [killTimes, setKillTimes] = useState([65, 60, 55, 50]);
  const [minRpm, setMinRpm] = useState(3000);

  // Animation values
  const rpmValue = useSharedValue(0);

  useEffect(() => {
    // Check for saved user name
    const checkUser = async () => {
      const savedName = await AsyncStorage.getItem('userName');
      if (savedName) {
        setUserName(savedName);
        setIsAppReady(true);
      }
    };
    checkUser();

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for Racebox features.');
      }
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      bleManager.destroy();
    };
  }, []);

  const handleNameSubmit = async (name: string) => {
    await AsyncStorage.setItem('userName', name);
    setUserName(name);
    setIsAppReady(true);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && connectedDevice) {
      interval = setInterval(async () => {
        try {
          const device = await connectedDevice.readRSSI();
          setRssi(device.rssi);
        } catch (e) {
          console.log('Failed to read RSSI', e);
        }
      }, 2000);
    } else {
      setRssi(null);
    }
    return () => clearInterval(interval);
  }, [isConnected, connectedDevice]);

  useEffect(() => {
    rpmValue.value = withSpring(rpm / 12000);
  }, [rpm]);

  // Bluetooth Logic
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return granted['android.permission.BLUETOOTH_CONNECT'] === 'granted';
    }
    return true;
  };

  const scanAndConnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Bluetooth permissions are required to connect.');
      return;
    }

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
        return;
      }
      if (device?.name === 'Antasena QS' || device?.localName === 'Antasena QS') {
        bleManager.stopDeviceScan();
        device.connect()
          .then((device) => {
            setConnectedDevice(device);
            setIsConnected(true);
            Toast.show({ type: 'success', text1: 'Connected to Antasena QS' });
            
            // Auto-reconnect listener
            device.onDisconnected((error, disconnectedDevice) => {
              setIsConnected(false);
              setConnectedDevice(null);
              Toast.show({ type: 'error', text1: 'Disconnected', text2: 'Attempting to reconnect...' });
              setTimeout(scanAndConnect, 5000);
            });

            return device.discoverAllServicesAndCharacteristics();
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });
  };

  const disconnect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (connectedDevice) {
      connectedDevice.cancelConnection()
        .then(() => {
          setIsConnected(false);
          setConnectedDevice(null);
          Toast.show({ type: 'info', text1: 'Disconnected' });
        });
    }
  };

  // Racebox Logic
  const startRace = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setRaceResults({
      time0to100: 0,
      time60ft: 0,
      time201m: 0,
      time402m: 0,
      maxSpeed: 0,
      distance: 0
    });
    setCurrentRaceTime(0);
    setIsRaceStarted(true);
    setRaceStartTime(Date.now());

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 100,
        distanceInterval: 0,
      },
      (location) => {
        const currentSpeed = location.coords.speed ? location.coords.speed * 3.6 : 0;
        setSpeed(Math.round(currentSpeed));

        if (isRaceStarted && raceStartTime) {
          const elapsed = (Date.now() - raceStartTime) / 1000;
          setCurrentRaceTime(elapsed);

          setRaceResults(prev => {
            const newResults = { ...prev };
            if (currentSpeed > prev.maxSpeed) newResults.maxSpeed = currentSpeed;
            if (currentSpeed >= 100 && prev.time0to100 === 0) newResults.time0to100 = elapsed;
            
            const deltaDist = (location.coords.speed || 0) * 0.1;
            newResults.distance += deltaDist;

            if (newResults.distance >= DISTANCE_60FT && prev.time60ft === 0) newResults.time60ft = elapsed;
            if (newResults.distance >= DISTANCE_201M && prev.time201m === 0) newResults.time201m = elapsed;
            if (newResults.distance >= DISTANCE_402M && prev.time402m === 0) {
              newResults.time402m = elapsed;
              stopRace();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Toast.show({ type: 'success', text1: 'Race Finished!' });
            }
            return newResults;
          });
        }
      }
    );
    setLocationSubscription(sub);
  };

  const stopRace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRaceStarted(false);
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  const resetRace = () => {
    setCurrentRaceTime(0);
    setRaceResults({
      time0to100: 0,
      time60ft: 0,
      time201m: 0,
      time402m: 0,
      maxSpeed: 0,
      distance: 0
    });
  };

  const handleExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Exit App', 'Are you sure you want to exit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: () => BackHandler.exitApp() },
    ]);
  };

  const handleResetRace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Reset Race', 'Are you sure you want to reset race results?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: resetRace },
    ]);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <QuickShifterScreen rpm={rpm} speed={speed} />;
      case 'racebox':
        return (
          <RaceboxScreen 
            isRaceStarted={isRaceStarted}
            currentRaceTime={currentRaceTime}
            raceResults={raceResults}
            startRace={startRace}
            stopRace={stopRace}
            resetRace={handleResetRace}
          />
        );
      default:
        return <QuickShifterScreen rpm={rpm} speed={speed} />;
    }
  };

  if (!isAppReady) {
    return (
      <LoginSplashScreen 
        onNameSubmit={handleNameSubmit} 
      />
    );
  }

  const renderSignalIcon = () => {
    if (!isConnected || rssi === null) return <SignalZero size={16} color="#ef4444" />;
    if (rssi > -60) return <SignalHigh size={16} color="#22c55e" />;
    if (rssi > -80) return <SignalMedium size={16} color="#eab308" />;
    return <SignalLow size={16} color="#ef4444" />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>QUICK SHIFTER</Text>
          <Text style={styles.logoSubText}>ANTASENA <Text style={styles.proText}>PRO</Text></Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={isConnected ? disconnect : scanAndConnect}
            style={[styles.connBtn, isConnected && styles.connBtnActive]}
          >
            {renderSignalIcon()}
            <Text style={[styles.connBtnText, isConnected && styles.connBtnTextActive]}>
              {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExit} style={styles.exitBtn}>
            <Text style={styles.exitBtnText}>EXIT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          onPress={() => setActiveTab('dashboard')}
          style={[styles.tabItem, activeTab === 'dashboard' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>DASHBOARD</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('racebox')}
          style={[styles.tabItem, activeTab === 'racebox' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'racebox' && styles.tabTextActive]}>RACE BOX</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderScreen()}
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  logoContainer: {
    gap: 2,
  },
  logoText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoSubText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  proText: {
    color: '#22c55e',
  },
  connBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a0a0a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  connBtnActive: {
    borderColor: '#22c55e',
  },
  connBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  connBtnTextActive: {
    color: '#22c55e',
  },
  exitBtn: {
    backgroundColor: '#1a0a0a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  exitBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#22c55e',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#22c55e',
  },
  scrollContent: {
    padding: 20,
  },
});
