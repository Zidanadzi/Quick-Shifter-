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
} from 'react-native';
import * as Location from 'expo-location';
import { BleManager, Device } from 'react-native-ble-plx';
import { 
  Bluetooth, 
  BluetoothOff, 
  Settings, 
  Gauge, 
  Timer, 
  User
} from 'lucide-react-native';
import { 
  useSharedValue, 
  withSpring, 
} from 'react-native-reanimated';

// Import Screens
import LoginSplashScreen from './src/screens/LoginSplashScreen';
import QuickShifterScreen from './src/screens/QuickShifterScreen';
import RaceboxScreen from './src/screens/RaceboxScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

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

  useEffect(() => {
    rpmValue.value = withSpring(rpm / 12000);
  }, [rpm]);

  // Bluetooth Logic
  const scanAndConnect = () => {
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
            return device.discoverAllServicesAndCharacteristics();
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });
  };

  const disconnect = () => {
    if (connectedDevice) {
      connectedDevice.cancelConnection()
        .then(() => {
          setIsConnected(false);
          setConnectedDevice(null);
        });
    }
  };

  // Racebox Logic
  const startRace = async () => {
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
            }
            return newResults;
          });
        }
      }
    );
    setLocationSubscription(sub);
  };

  const stopRace = () => {
    setIsRaceStarted(false);
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  const resetRace = () => {
    stopRace();
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

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <QuickShifterScreen rpm={rpm} speed={speed} rpmValue={rpmValue} />;
      case 'racebox':
        return (
          <RaceboxScreen 
            isRaceStarted={isRaceStarted}
            currentRaceTime={currentRaceTime}
            raceResults={raceResults}
            startRace={startRace}
            stopRace={stopRace}
            resetRace={resetRace}
          />
        );
      case 'settings':
        return (
          <SettingsScreen 
            killTimes={killTimes}
            setKillTimes={setKillTimes}
            minRpm={minRpm}
            setMinRpm={setMinRpm}
          />
        );
      case 'profile':
        return <ProfileScreen userName={userName} />;
      default:
        return <QuickShifterScreen rpm={rpm} speed={speed} rpmValue={rpmValue} />;
    }
  };

  if (!isAppReady) {
    return (
      <LoginSplashScreen 
        onNameSubmit={(name) => {
          setUserName(name);
          setIsAppReady(true);
        }} 
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Antasena Pro</Text>
          <Text style={styles.userName}>{activeTab === 'racebox' ? 'Racebox' : 'Quick Shifter'}</Text>
        </View>
        <TouchableOpacity 
          onPress={isConnected ? disconnect : scanAndConnect}
          style={[styles.connBtn, isConnected && styles.connBtnActive]}
        >
          {isConnected ? (
            <Bluetooth size={20} color="#fff" />
          ) : (
            <BluetoothOff size={20} color="#94a3b8" />
          )}
          <Text style={[styles.connBtnText, isConnected && styles.connBtnTextActive]}>
            {isConnected ? 'Connected' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderScreen()}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          onPress={() => setActiveTab('dashboard')}
          style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
        >
          <Gauge size={24} color={activeTab === 'dashboard' ? '#22c55e' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'dashboard' && styles.navTextActive]}>QS Dash</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('settings')}
          style={[styles.navItem, activeTab === 'settings' && styles.navItemActive]}
        >
          <Settings size={24} color={activeTab === 'settings' ? '#22c55e' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'settings' && styles.navTextActive]}>Tuning</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('racebox')}
          style={[styles.navItem, activeTab === 'racebox' && styles.navItemActive]}
        >
          <Timer size={24} color={activeTab === 'racebox' ? '#22c55e' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'racebox' && styles.navTextActive]}>Racebox</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('profile')}
          style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
        >
          <User size={24} color={activeTab === 'profile' ? '#22c55e' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  connBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  connBtnActive: {
    backgroundColor: '#22c55e20',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  connBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  connBtnTextActive: {
    color: '#22c55e',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#22c55e',
  },
  navText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#22c55e',
  },
});
