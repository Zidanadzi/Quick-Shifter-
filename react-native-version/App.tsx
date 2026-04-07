import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  StyleSheet, 
  Alert, 
  StatusBar,
  SafeAreaView,
  Dimensions,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
  PermissionsAndroid
} from 'react-native';
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { 
  Zap, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2,
  Activity,
  ChevronRight,
  Bluetooth,
  BluetoothOff,
  Info,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  User,
  Heart,
  LogOut,
  Edit3,
  X,
  Settings
} from 'lucide-react-native';
import Animated, { 
  FadeIn, 
  FadeInDown,
  FadeOut,
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const manager = new BleManager();

// --- Types ---
interface KillTimePoint {
  id: string;
  rpm: number;
  ms: number;
}

interface QSSettings {
  threshold: number;
  minRpm: number;
  killTimes: KillTimePoint[];
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Profile {
  id: string;
  name: string;
  description: string;
  settings: QSSettings;
  createdAt: number;
}

// --- Constants ---
const INITIAL_SETTINGS: QSSettings = {
  threshold: 45,
  minRpm: 3000,
  killTimes: [
    { id: '1', rpm: 3000, ms: 85 },
    { id: '2', rpm: 6000, ms: 75 },
    { id: '3', rpm: 9000, ms: 65 },
    { id: '4', rpm: 12000, ms: 55 },
  ],
};

const SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';
const CHAR_UUID = '0000ff01-0000-1000-8000-00805f9b34fb';

// --- Components ---

const Card = ({ children, title, icon: Icon, subtitle, action }: { children: React.ReactNode, title?: string, icon?: any, subtitle?: string, action?: React.ReactNode }) => (
  <View style={styles.card}>
    {title && (
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardIconBox}>
            {Icon && <Icon color="#00ff88" size={16} />}
          </View>
          <View>
            <Text style={styles.cardTitle}>{title}</Text>
            {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        {action && <View>{action}</View>}
      </View>
    )}
    {children}
  </View>
);

export default function App() {
  const [settings, setSettings] = useState<QSSettings>(INITIAL_SETTINGS);
  const [liveRpm, setLiveRpm] = useState(0);
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null); // New
  const [rpmOffset, setRpmOffset] = useState<number>(0);
  const [raceHistory, setRaceHistory] = useState<any[]>([]); // New

  // Load persisted data on startup
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const savedOffset = await AsyncStorage.getItem('qs_rpm_offset');
        if (savedOffset) setRpmOffset(parseInt(savedOffset, 10));

        const savedHistory = await AsyncStorage.getItem('qs_race_history');
        if (savedHistory) setRaceHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load persisted data", e);
      }
    };
    loadPersistedData();
  }, []);

  const updateRpmOffset = async (newOffset: number) => {
    setRpmOffset(newOffset);
    await AsyncStorage.setItem('qs_rpm_offset', newOffset.toString());
  };

  const saveRaceHistory = async () => {
    if (raceData['0-100'] === 0 && raceData['402m'] === 0) {
      addToast("No valid race data to save", "error");
      return;
    }
    const newItem = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      '0-100': raceData['0-100'],
      '60ft': raceData['60ft'],
      '201m': raceData['201m'],
      '402m': raceData['402m']
    };
    const newHistory = [newItem, ...raceHistory].slice(0, 20); // Keep last 20
    setRaceHistory(newHistory);
    await AsyncStorage.setItem('qs_race_history', JSON.stringify(newHistory));
    addToast("Race saved to history", "success");
  };

  const clearRaceHistory = async () => {
    setRaceHistory([]);
    await AsyncStorage.removeItem('qs_race_history');
    addToast("History cleared", "info");
  };
  const [userName, setUserName] = useState<string>("");
  const [showSplash, setShowSplash] = useState(true);
  const [tempName, setTempName] = useState("");
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [connectionStage, setConnectionStage] = useState<string>("");
  const [isQuickShifting, setIsQuickShifting] = useState(false); // New
  const [lastDeviceId, setLastDeviceId] = useState<string | null>(null); // New
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'racebox'>('dashboard');
  const [isEditingProfile, setIsEditingProfile] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [raceData, setRaceData] = useState({
    '0-100': 0,
    '60ft': 0,
    '201m': 0,
    '402m': 0,
    startTime: 0,
    isRacing: false,
    distance: 0,
    lastSpeedKmh: 0
  });

  // --- Persistence ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedName = await AsyncStorage.getItem('qs_user_name');
        if (savedName) setUserName(savedName);

        const savedProfiles = await AsyncStorage.getItem('qs_profiles');
        if (savedProfiles) {
          const parsed = JSON.parse(savedProfiles);
          setProfiles(parsed);
          setActiveProfileId(parsed[0]?.id || '');
          setSettings(parsed[0]?.settings || INITIAL_SETTINGS);
        } else {
          const defaultProfiles: Profile[] = [
            {
              id: 'default-street',
              name: 'Street Mode',
              description: 'Smooth shifting for daily commuting.',
              settings: INITIAL_SETTINGS,
              createdAt: Date.now()
            },
            {
              id: 'default-track',
              name: 'Track Day',
              description: 'Aggressive kill times for circuit use.',
              settings: {
                ...INITIAL_SETTINGS,
                killTimes: INITIAL_SETTINGS.killTimes.map(p => ({ ...p, ms: p.ms - 10 }))
              },
              createdAt: Date.now()
            }
          ];
          setProfiles(defaultProfiles);
          setActiveProfileId(defaultProfiles[0].id);
          setSettings(defaultProfiles[0].settings);
          await AsyncStorage.setItem('qs_profiles', JSON.stringify(defaultProfiles));
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setIsAppReady(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isAppReady) {
      AsyncStorage.setItem('qs_profiles', JSON.stringify(profiles));
    }
  }, [profiles, isAppReady]);

  // --- Location Logic ---
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        addToast("Location permission denied", "error");
        return;
      }

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          const speedKmh = (location.coords.speed || 0) * 3.6;
          setLiveSpeed(Math.round(speedKmh));
          setGpsAccuracy(location.coords.accuracy); // Track accuracy

          // Race Logic
          if (raceData.isRacing) {
            const elapsed = (Date.now() - raceData.startTime) / 1000;
            const avgSpeedMps = ((speedKmh + raceData.lastSpeedKmh) / 2) / 3.6;
            const newDistance = raceData.distance + avgSpeedMps; // 1 second interval
            
            setRaceData(prev => ({ 
              ...prev, 
              distance: newDistance, 
              lastSpeedKmh: speedKmh,
              '0-100': (speedKmh >= 100 && prev['0-100'] === 0) ? elapsed : prev['0-100'],
              '60ft': (newDistance >= 18.288 && prev['60ft'] === 0) ? elapsed : prev['60ft'],
              '201m': (newDistance >= 201 && prev['201m'] === 0) ? elapsed : prev['201m'],
              '402m': (newDistance >= 402 && prev['402m'] === 0) ? elapsed : prev['402m']
            }));
          } else {
            setRaceData(prev => ({ ...prev, lastSpeedKmh: speedKmh }));
          }
        }
      );
    })();
  }, []);

  // Request permissions on app start
  useEffect(() => {
    requestBluetoothPermissions();
  }, []);

  // Auto-reconnect logic
  useEffect(() => {
    const subscription = manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        AsyncStorage.getItem('qs_last_device').then((deviceId) => {
          if (deviceId && !connectedDevice) {
            // Attempt to reconnect to last device
            manager.connectToDevice(deviceId)
              .then(d => d.discoverAllServicesAndCharacteristics())
              .then(d => {
                setConnectedDevice(d);
                setLastDeviceId(d.id);
                addToast("Auto-reconnected to device", "success");
                
                d.onDisconnected((err, disconnectedDevice) => {
                  setConnectedDevice(null);
                  addToast("Device disconnected", "error");
                });
              })
              .catch(err => console.log("Auto-reconnect failed", err));
          }
        });
      }
    }, true);
    return () => subscription.remove();
  }, [connectedDevice]);
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // --- Bluetooth Logic ---
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  };

  const scanAndConnect = async () => {
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      addToast("Bluetooth permissions denied", "error");
      return;
    }

    setIsScanning(true);
    setConnectionStage("Scanning...");
    
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        addToast("Bluetooth Error: " + error.message, "error");
        setIsScanning(false);
        setConnectionStage("");
        return;
      }

      if (device?.name?.includes('HM-10') || device?.localName?.includes('HM-10')) {
        manager.stopDeviceScan();
        setConnectionStage("Connecting...");
        
        device.connect()
          .then(d => d.discoverAllServicesAndCharacteristics())
          .then(async d => {
            setConnectedDevice(d);
            setLastDeviceId(d.id);
            await AsyncStorage.setItem('qs_last_device', d.id);
            setIsScanning(false);
            setConnectionStage("Connected");
            addToast(`Connected to ${d.name || 'QS Device'}`, "success");
            
            // Monitor for Quick Shift Feedback
            d.monitorCharacteristicForService(SERVICE_UUID, CHAR_UUID, (error, characteristic) => {
              if (characteristic?.value) {
                const val = atob(characteristic.value);
                if (val === 'QS_ACTIVE') {
                  setIsQuickShifting(true);
                  setTimeout(() => setIsQuickShifting(false), 500);
                }
              }
            });

            d.onDisconnected((err, disconnectedDevice) => {
              setConnectedDevice(null);
              setConnectionStage("Disconnected");
              addToast("Device disconnected. Reconnecting...", "info");
              setTimeout(attemptReconnect, 3000); // Auto-reconnect
            });
          })
          .catch(err => {
            addToast("Connection Failed: " + err.message, "error");
            setIsScanning(false);
            setConnectionStage("");
          });
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
      if (!connectedDevice) {
        setIsScanning(false);
        setConnectionStage("");
        addToast("No device found", "info");
      }
    }, 10000);
  };

  const attemptReconnect = async () => {
    const lastId = await AsyncStorage.getItem('qs_last_device');
    if (lastId) {
      setConnectionStage("Reconnecting...");
      manager.connectToDevice(lastId)
        .then(d => d.discoverAllServicesAndCharacteristics())
        .then(async d => {
          setConnectedDevice(d);
          setConnectionStage("Connected");
          addToast("Reconnected to device", "success");
          
          // Monitor for Quick Shift Feedback
          d.monitorCharacteristicForService(SERVICE_UUID, CHAR_UUID, (error, characteristic) => {
            if (characteristic?.value) {
              const val = atob(characteristic.value);
              if (val === 'QS_ACTIVE') {
                setIsQuickShifting(true);
                setTimeout(() => setIsQuickShifting(false), 500);
              }
            }
          });

          d.onDisconnected((err, disconnectedDevice) => {
            setConnectedDevice(null);
            setConnectionStage("Disconnected");
            addToast("Device disconnected. Reconnecting...", "info");
            setTimeout(attemptReconnect, 3000);
          });
        })
        .catch(err => {
          addToast("Reconnection Failed: " + err.message, "error");
          setConnectionStage("Disconnected");
          setTimeout(attemptReconnect, 5000);
        });
    }
  };

  // Auto-reconnect on startup
  useEffect(() => {
    const checkLastDevice = async () => {
      const lastId = await AsyncStorage.getItem('qs_last_device');
      if (lastId) {
        setLastDeviceId(lastId);
        attemptReconnect();
      }
    };
    checkLastDevice();
  }, []);

  // --- Sync Logic ---
  const syncSettings = async () => {
    if (!connectedDevice) {
      addToast("Not Connected", "error");
      return;
    }

    const payload = JSON.stringify({
      t: settings.threshold,
      m: settings.minRpm,
      k: settings.killTimes.map(p => [p.rpm, p.ms])
    });

    try {
      const base64 = btoa(payload);
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHAR_UUID,
        base64
      );
      addToast("Configuration applied!", "success");
    } catch (err: any) {
      addToast("Sync Error: " + err.message, "error");
    }
  };

  // --- Profile Logic ---
  const loadProfile = (profile: Profile) => {
    setSettings(JSON.parse(JSON.stringify(profile.settings)));
    setActiveProfileId(profile.id);
    addToast(`Loaded ${profile.name}`, "info");
  };

  const saveNewProfile = () => {
    const newProfile: Profile = {
      id: Math.random().toString(36).substr(2, 9),
      name: `New Profile ${profiles.length + 1}`,
      description: 'Custom configuration profile.',
      settings: JSON.parse(JSON.stringify(settings)),
      createdAt: Date.now()
    };
    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
    addToast("New profile created", "success");
  };

  const deleteProfile = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;
    if (profiles.length <= 1) {
      addToast("Cannot delete the last profile", "error");
      return;
    }
    setProfileToDelete(profile);
  };

  const confirmDelete = () => {
    if (!profileToDelete) return;
    const id = profileToDelete.id;
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) {
      setActiveProfileId(profiles.find(p => p.id !== id)?.id || '');
    }
    setProfileToDelete(null);
    addToast("Profile deleted", "info");
  };

  const startEditing = (profile: Profile) => {
    setIsEditingProfile(profile.id);
    setEditName(profile.name);
    setEditDesc(profile.description);
  };

  const updateProfileInfo = () => {
    if (!isEditingProfile) return;
    setProfiles(prev => prev.map(p => p.id === isEditingProfile ? { ...p, name: editName, description: editDesc } : p));
    setIsEditingProfile(null);
    addToast("Profile updated", "success");
  };

  const resetToDefault = () => {
    Alert.alert(
      "Reset to Default",
      "Are you sure you want to reset all settings to factory defaults?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => setSettings(JSON.parse(JSON.stringify(INITIAL_SETTINGS))) }
      ]
    );
  };

  // --- UI Handlers ---
  const handleNameSubmit = async () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      await AsyncStorage.setItem('qs_user_name', tempName.trim());
    }
  };

  const handleExit = async () => {
    setUserName("");
    await AsyncStorage.removeItem('qs_user_name');
    setShowSplash(true);
    setTempName("");
  };

  const updatePoint = (id: string, field: 'rpm' | 'ms', value: number) => {
    setSettings(prev => ({
      ...prev,
      killTimes: prev.killTimes.map(p => p.id === id ? { ...p, [field]: value } : p)
        .sort((a, b) => a.rpm - b.rpm)
    }));
  };

  const addPoint = () => {
    const lastPoint = settings.killTimes[settings.killTimes.length - 1];
    const newRpm = lastPoint ? lastPoint.rpm + 1000 : 3000;
    if (newRpm > 15000) {
      addToast("Maximum RPM limit reached", "error");
      return;
    }
    const newPoint: KillTimePoint = {
      id: Math.random().toString(36).substr(2, 9),
      rpm: newRpm,
      ms: 60
    };
    setSettings(prev => ({
      ...prev,
      killTimes: [...prev.killTimes, newPoint].sort((a, b) => a.rpm - b.rpm)
    }));
  };

  const removePoint = (id: string) => {
    if (settings.killTimes.length <= 2) {
      addToast("Minimum 2 points required", "error");
      return;
    }
    setSettings(prev => ({
      ...prev,
      killTimes: prev.killTimes.filter(p => p.id !== id)
    }));
  };

  // --- Splash Timer ---
  useEffect(() => {
    if (userName && showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [userName, showSplash]);

  if (!isAppReady) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Splash Screen Modal */}
      <Modal visible={showSplash} transparent animationType="fade">
        <View style={styles.splashContainer}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.splashContent}>
            <View style={styles.splashIconBox}>
              <Zap color="#00ff88" size={64} fill="#00ff8820" />
            </View>

            {!userName ? (
              <View style={styles.loginForm}>
                <Text style={styles.splashTitle}>QUICK SHIFTER{'\n'}<Text style={{color: '#00ff88'}}>ANTASENA</Text></Text>
                <Text style={styles.splashSubtitle}>YOUR PERFORMANCE PARTNER</Text>
                
                <View style={styles.inputContainer}>
                  <User color="#444" size={20} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="What should I call you?"
                    placeholderTextColor="#444"
                    value={tempName}
                    onChangeText={setTempName}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.btnPrimary, !tempName.trim() && {opacity: 0.5}]}
                  onPress={handleNameSubmit}
                  disabled={!tempName.trim()}
                >
                  <Text style={styles.btnPrimaryText}>LET'S RIDE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.welcomeBox}>
                <Text style={styles.welcomeText}>Welcome back, <Text style={{color: '#00ff88'}}>{userName}</Text>!</Text>
                <View style={styles.heartRow}>
                  <Heart color="#ef4444" size={16} fill="#ef4444" />
                  <Text style={styles.readyText}>Ready for a new adventure?</Text>
                </View>
                <ActivityIndicator color="#00ff88" style={{marginTop: 30}} />
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Toast Overlay */}
      <View style={styles.toastContainer}>
        {toasts.map(toast => (
          <Animated.View 
            key={toast.id} 
            entering={FadeInDown} 
            exiting={FadeOut}
            style={[styles.toast, styles[`toast_${toast.type}` as keyof typeof styles]] as any}
          >
            {toast.type === 'success' ? <CheckCircle2 color="#00ff88" size={16} /> :
             toast.type === 'error' ? <AlertCircle color="#ef4444" size={16} /> :
             <Info color="#3b82f6" size={16} />}
            <Text style={styles.toastText}>{toast.message}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!profileToDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AlertCircle color="#ef4444" size={24} />
              <View>
                <Text style={styles.modalTitle}>Confirm Deletion</Text>
                <Text style={styles.modalSubtitle}>Action cannot be undone</Text>
              </View>
            </View>
            <Text style={styles.modalBody}>
              Are you sure you want to delete <Text style={{color: '#fff', fontWeight: 'bold'}}>"{profileToDelete?.name}"</Text>?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setProfileToDelete(null)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDanger} onPress={confirmDelete}>
                <Text style={styles.btnDangerText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <Zap color="#00ff88" size={24} fill="#00ff8820" />
            </View>
            <View>
              <Text style={styles.headerBrand}>QUICK SHIFTER</Text>
              <View style={styles.headerBrandRow}>
                <Text style={styles.headerName}>ANTASENA</Text>
                <View style={styles.proBadge}><Text style={styles.proText}>PRO</Text></View>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.btnExit} onPress={handleExit}>
            <LogOut color="#ef4444" size={18} />
            <Text style={styles.btnExitText}>EXIT</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Bar */}
        <View style={styles.connectionBar}>
          <TouchableOpacity 
            style={[styles.btnConnection, { flex: 1, backgroundColor: connectedDevice ? '#00ff8820' : '#ef444420', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12 }]}
            onPress={connectedDevice ? () => connectedDevice.cancelConnection() : scanAndConnect}
          >
            {connectedDevice ? <Bluetooth color="#00ff88" size={20} /> : <BluetoothOff color="#ef4444" size={20} />}
            <Text style={{color: connectedDevice ? '#00ff88' : '#ef4444', fontWeight: 'bold', marginLeft: 10}}>
              {connectedDevice ? 'CONNECTED' : 'DISCONNECTED'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.connectionBar}>
          <TouchableOpacity 
            style={[styles.btnConnection, { flex: 1, backgroundColor: activeScreen === 'dashboard' ? '#00ff8820' : '#111' }]}
            onPress={() => setActiveScreen('dashboard')}
          >
            <Text style={{color: activeScreen === 'dashboard' ? '#00ff88' : '#555', fontWeight: 'bold'}}>DASHBOARD</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.btnConnection, { flex: 1, backgroundColor: activeScreen === 'racebox' ? '#00ff8820' : '#111' }]}
            onPress={() => setActiveScreen('racebox')}
          >
            <Text style={{color: activeScreen === 'racebox' ? '#00ff88' : '#555', fontWeight: 'bold'}}>RACE BOX</Text>
          </TouchableOpacity>
        </View>

        {activeScreen === 'dashboard' ? (
          <>
            {/* Profiles Card */}
            <Card title="Profiles" icon={LayoutGrid} subtitle="Save and load presets">
              <View style={styles.profileList}>
                {profiles.map(profile => (
                  <View 
                    key={profile.id} 
                    style={[styles.profileItem, activeProfileId === profile.id && styles.profileItemActive]}
                  >
                    <TouchableOpacity style={{flex: 1}} onPress={() => loadProfile(profile)}>
                      <Text style={[styles.profileName, activeProfileId === profile.id && {color: '#00ff88'}]}>{profile.name}</Text>
                      <Text style={styles.profileDesc} numberOfLines={1}>{profile.description}</Text>
                    </TouchableOpacity>
                    <View style={styles.profileActions}>
                      <TouchableOpacity onPress={() => startEditing(profile)}><Edit3 color="#555" size={16} /></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteProfile(profile.id)}><Trash2 color="#ef4444" size={16} /></TouchableOpacity>
                    </View>

                    {isEditingProfile === profile.id && (
                      <View style={styles.editProfileForm}>
                        <TextInput 
                          style={styles.editInput} 
                          value={editName} 
                          onChangeText={setEditName} 
                          placeholder="Name" 
                          placeholderTextColor="#444" 
                        />
                        <TextInput 
                          style={[styles.editInput, {height: 60}]} 
                          value={editDesc} 
                          onChangeText={setEditDesc} 
                          placeholder="Description" 
                          placeholderTextColor="#444" 
                          multiline 
                        />
                        <View style={styles.editActions}>
                          <TouchableOpacity style={styles.btnSmall} onPress={() => setIsEditingProfile(null)}><Text style={styles.btnSmallText}>Cancel</Text></TouchableOpacity>
                          <TouchableOpacity style={[styles.btnSmall, {backgroundColor: '#00ff88'}]} onPress={updateProfileInfo}><Text style={[styles.btnSmallText, {color: '#000'}]}>Save</Text></TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.btnAddProfile} onPress={saveNewProfile}>
                  <Plus color="#555" size={16} />
                  <Text style={styles.btnAddProfileText}>Create New Profile</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Telemetry Card */}
            <Card title="Dashboard Monitor" icon={Activity} subtitle="Real-time engine data">
              <View style={styles.telemetryRow}>
                <View>
                  <Text style={styles.telemetryValue}>{Math.max(0, liveRpm + rpmOffset).toLocaleString()}</Text>
                  <Text style={styles.telemetryLabel}>RPM</Text>
                  {isQuickShifting && (
                    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.qsIndicator}>
                      <Text style={styles.qsIndicatorText}>SHIFT!</Text>
                    </Animated.View>
                  )}
                </View>
                <View style={styles.telemetryDivider} />
                <View>
                  <Text style={styles.telemetryValue}>{liveSpeed}</Text>
                  <Text style={styles.telemetryLabel}>KM/H</Text>
                  {gpsAccuracy !== null && (
                    <Text style={[styles.telemetryLabel, {fontSize: 8, color: gpsAccuracy > 15 ? '#ef4444' : '#00ff88'}]}>
                      {gpsAccuracy > 15 ? 'LOW ACC' : 'HIGH ACC'}
                    </Text>
                  )}
                </View>
              </View>

              {/* Dynamic Segmented Sporty RPM Bar */}
              <View style={styles.rpmBarContainer}>
                {Array.from({ length: 30 }).map((_, i) => {
                  const maxDisplayRpm = 15000;
                  const segmentRpm = (i / 30) * maxDisplayRpm;
                  const currentPercentage = (liveRpm / maxDisplayRpm) * 100;
                  const isActive = (i / 30) * 100 <= currentPercentage;
                  
                  const sortedPoints = [...settings.killTimes].sort((a, b) => a.rpm - b.rpm);
                  const lastPoint = sortedPoints[sortedPoints.length - 1];
                  const secondLastPoint = sortedPoints[sortedPoints.length - 2];
                  
                  let activeColor = "#00ff88"; // brand-primary
                  
                  if (lastPoint && segmentRpm >= lastPoint.rpm) {
                    activeColor = "#ef4444"; // red-500
                  } else if (secondLastPoint && segmentRpm >= secondLastPoint.rpm) {
                    activeColor = "#facc15"; // yellow-400
                  }
                  
                  return (
                    <View 
                      key={i}
                      style={[
                        styles.rpmSegment,
                        { backgroundColor: activeColor },
                        isActive ? styles.rpmSegmentActive : styles.rpmSegmentInactive
                      ]}
                    />
                  );
                })}
              </View>
            </Card>

            {/* Kill Times Card */}
            <Card 
              title="Kill Times Mapping" 
              icon={Zap} 
              subtitle="Fine-tune ignition cut duration"
              action={
                <TouchableOpacity onPress={addPoint} style={styles.btnAddPoint}>
                  <Plus color="#00ff88" size={14} />
                  <Text style={styles.btnAddPointText}>Add Point</Text>
                </TouchableOpacity>
              }
            >
              <View style={styles.pointsList}>
                {settings.killTimes.map((point) => (
                  <View key={point.id} style={styles.pointItem}>
                    <View style={styles.pointControlsWrapper}>
                      {/* RPM Control */}
                      <View style={styles.pointControlHalf}>
                        <Text style={styles.pointControlLabel}>ENGINE RPM</Text>
                        <View style={styles.controlGroup}>
                          <TouchableOpacity onPress={() => updatePoint(point.id, 'rpm', Math.max(1000, point.rpm - 500))} style={styles.btnControl}>
                            <Text style={styles.btnControlText}>-</Text>
                          </TouchableOpacity>
                          <TextInput 
                            style={styles.pointInput}
                            value={point.rpm.toString()}
                            onChangeText={(val) => updatePoint(point.id, 'rpm', parseInt(val) || 0)}
                            keyboardType="numeric"
                            maxLength={5}
                          />
                          <TouchableOpacity onPress={() => updatePoint(point.id, 'rpm', Math.min(16000, point.rpm + 500))} style={styles.btnControl}>
                            <Text style={styles.btnControlText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* MS Control */}
                      <View style={styles.pointControlHalf}>
                        <Text style={styles.pointControlLabel}>KILL TIME (ms)</Text>
                        <View style={styles.controlGroup}>
                          <TouchableOpacity onPress={() => updatePoint(point.id, 'ms', Math.max(10, point.ms - 5))} style={styles.btnControl}>
                            <Text style={styles.btnControlText}>-</Text>
                          </TouchableOpacity>
                          <TextInput 
                            style={styles.pointInput}
                            value={point.ms.toString()}
                            onChangeText={(val) => updatePoint(point.id, 'ms', parseInt(val) || 0)}
                            keyboardType="numeric"
                            maxLength={3}
                          />
                          <TouchableOpacity onPress={() => updatePoint(point.id, 'ms', Math.min(200, point.ms + 5))} style={styles.btnControl}>
                            <Text style={styles.btnControlText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    
                    <TouchableOpacity onPress={() => removePoint(point.id)} style={styles.btnRemovePoint}>
                      <Trash2 color="#ef4444" size={16} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </Card>

            {/* General Settings */}
            <Card 
              title="System Parameters" 
              icon={Settings} 
              subtitle="Core configuration"
              action={
                <TouchableOpacity onPress={resetToDefault} style={styles.btnSmall}>
                  <RefreshCw color="#ef4444" size={14} />
                  <Text style={[styles.btnSmallText, {color: '#ef4444'}]}>Reset</Text>
                </TouchableOpacity>
              }
            >
              <View style={styles.settingItem}>
                <View>
                  <Text style={styles.settingLabel}>Sensor Threshold</Text>
                  <Text style={styles.settingHint}>Sensitivity of the shift sensor</Text>
                </View>
                <View style={styles.settingValueRow}>
                  <TouchableOpacity onPress={() => setSettings({...settings, threshold: Math.max(10, settings.threshold - 5)})} style={styles.btnControl}><Text style={styles.btnControlText}>-</Text></TouchableOpacity>
                  <Text style={styles.settingValueText}>{settings.threshold}%</Text>
                  <TouchableOpacity onPress={() => setSettings({...settings, threshold: Math.min(100, settings.threshold + 5)})} style={styles.btnControl}><Text style={styles.btnControlText}>+</Text></TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingItem}>
                <View>
                  <Text style={styles.settingLabel}>Minimum RPM</Text>
                  <Text style={styles.settingHint}>System active above this RPM</Text>
                </View>
                <View style={styles.settingValueRow}>
                  <TouchableOpacity onPress={() => setSettings({...settings, minRpm: Math.max(1000, settings.minRpm - 500)})} style={styles.btnControl}><Text style={styles.btnControlText}>-</Text></TouchableOpacity>
                  <Text style={styles.settingValueText}>{settings.minRpm}</Text>
                  <TouchableOpacity onPress={() => setSettings({...settings, minRpm: Math.min(10000, settings.minRpm + 500)})} style={styles.btnControl}><Text style={styles.btnControlText}>+</Text></TouchableOpacity>
                </View>
              </View>

              <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={styles.settingLabel}>RPM Calibration</Text>
                  <Text style={styles.settingHint}>Offset to match physical tachometer</Text>
                </View>
                <View style={styles.settingValueRow}>
                  <TouchableOpacity onPress={() => updateRpmOffset(rpmOffset - 100)} style={styles.btnControl}><Text style={styles.btnControlText}>-</Text></TouchableOpacity>
                  <Text style={styles.settingValueText}>{rpmOffset > 0 ? `+${rpmOffset}` : rpmOffset}</Text>
                  <TouchableOpacity onPress={() => updateRpmOffset(rpmOffset + 100)} style={styles.btnControl}><Text style={styles.btnControlText}>+</Text></TouchableOpacity>
                </View>
              </View>
            </Card>

            {/* Apply Button */}
            <TouchableOpacity style={styles.btnApply} onPress={syncSettings}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12}}>
                <Save color="#000" size={20} />
                <Text style={styles.btnApplyText}>SAVE</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <Card title="Race Box" icon={Zap} subtitle="Performance metrics">
            <View style={styles.raceDataContainer}>
              <View style={styles.raceDataRow}>
                <Text style={styles.raceDataLabel}>0-100 km/h</Text>
                <Text style={styles.raceDataValue}>{raceData['0-100'].toFixed(2)}s</Text>
              </View>
              <View style={styles.raceDataRow}>
                <Text style={styles.raceDataLabel}>60ft</Text>
                <Text style={styles.raceDataValue}>{raceData['60ft'].toFixed(2)}s</Text>
              </View>
              <View style={styles.raceDataRow}>
                <Text style={styles.raceDataLabel}>201m</Text>
                <Text style={styles.raceDataValue}>{raceData['201m'].toFixed(2)}s</Text>
              </View>
              <View style={styles.raceDataRow}>
                <Text style={styles.raceDataLabel}>402m</Text>
                <Text style={styles.raceDataValue}>{raceData['402m'].toFixed(2)}s</Text>
              </View>
              <View style={{flexDirection: 'row', gap: 10, marginTop: 20}}>
                <TouchableOpacity 
                  style={[styles.btnPrimary, {flex: 1, backgroundColor: raceData.isRacing ? '#ef4444' : '#00ff88'}]} 
                  onPress={() => {
                    if (raceData.isRacing) {
                      setRaceData(prev => ({...prev, isRacing: false}));
                    } else {
                      setRaceData(prev => ({...prev, isRacing: true, startTime: Date.now(), distance: 0, '0-100': 0, '60ft': 0, '201m': 0, '402m': 0}));
                    }
                  }}
                >
                  <Text style={styles.btnPrimaryText}>{raceData.isRacing ? 'STOP' : 'GET STARTED'}</Text>
                </TouchableOpacity>
                {!raceData.isRacing && (raceData['0-100'] > 0 || raceData['402m'] > 0) ? (
                  <TouchableOpacity 
                    style={[styles.btnPrimary, {flex: 1, backgroundColor: '#3b82f6'}]} 
                    onPress={saveRaceHistory}
                  >
                    <Text style={[styles.btnPrimaryText, {color: '#fff'}]}>SAVE</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.btnPrimary, {flex: 1, backgroundColor: '#222'}]} 
                    onPress={() => setRaceData(prev => ({...prev, isRacing: false, distance: 0, '0-100': 0, '60ft': 0, '201m': 0, '402m': 0}))}
                  >
                    <Text style={[styles.btnPrimaryText, {color: '#fff'}]}>RESET</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Race History Section */}
        {activeScreen === 'racebox' && raceHistory.length > 0 && (
          <Card 
            title="Race History" 
            icon={Activity} 
            subtitle="Previous runs"
            action={
              <TouchableOpacity onPress={clearRaceHistory} style={styles.btnSmall}>
                <Trash2 color="#ef4444" size={14} />
                <Text style={[styles.btnSmallText, {color: '#ef4444'}]}>Clear</Text>
              </TouchableOpacity>
            }
          >
            <View style={styles.historyList}>
              {raceHistory.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <Text style={styles.historyDate}>{item.date}</Text>
                  <View style={styles.historyMetrics}>
                    <View style={styles.historyMetric}>
                      <Text style={styles.historyMetricLabel}>0-100</Text>
                      <Text style={styles.historyMetricValue}>{item['0-100'].toFixed(2)}s</Text>
                    </View>
                    <View style={styles.historyMetric}>
                      <Text style={styles.historyMetricLabel}>60ft</Text>
                      <Text style={styles.historyMetricValue}>{item['60ft'].toFixed(2)}s</Text>
                    </View>
                    <View style={styles.historyMetric}>
                      <Text style={styles.historyMetricLabel}>201m</Text>
                      <Text style={styles.historyMetricValue}>{item['201m'].toFixed(2)}s</Text>
                    </View>
                    <View style={styles.historyMetric}>
                      <Text style={styles.historyMetricLabel}>402m</Text>
                      <Text style={styles.historyMetricValue}>{item['402m'].toFixed(2)}s</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  
  // Splash
  splashContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 30 },
  splashContent: { width: '100%', alignItems: 'center' },
  splashIconBox: { backgroundColor: '#00ff8810', padding: 30, borderRadius: 40, borderWidth: 1, borderColor: '#00ff8820', marginBottom: 40 },
  splashTitle: { color: '#fff', fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: -1, lineHeight: 30 },
  splashSubtitle: { color: '#444', fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginTop: 10 },
  loginForm: { width: '100%', marginTop: 40 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 20, paddingHorizontal: 20, height: 64, borderWidth: 1, borderColor: '#222', marginBottom: 20 },
  inputIcon: { marginRight: 15 },
  input: { flex: 1, color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnPrimary: { backgroundColor: '#00ff88', height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#00ff88', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  btnPrimaryText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  welcomeBox: { alignItems: 'center' },
  welcomeText: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  heartRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  readyText: { color: '#444', fontSize: 12, fontWeight: 'bold' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  logoBox: { backgroundColor: '#00ff8810', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#00ff8820' },
  headerBrand: { color: '#fff', fontSize: 12, fontWeight: '900', fontStyle: 'italic', opacity: 0.6 },
  headerBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerName: { color: '#00ff88', fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
  proBadge: { backgroundColor: '#00ff8815', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#00ff8830' },
  proText: { color: '#00ff88', fontSize: 8, fontWeight: 'bold' },
  btnExit: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef444410', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#ef444420' },
  btnExitText: { color: '#ef4444', fontSize: 10, fontWeight: '900' },

  // Connection Bar
  connectionBar: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  btnConnection: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#111', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#222' },
  btnConnectionText: { color: '#00ff88', fontSize: 11, fontWeight: 'bold' },

  // Card
  card: { backgroundColor: '#111', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconBox: { backgroundColor: '#00ff8810', padding: 8, borderRadius: 10 },
  cardTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  cardSubtitle: { color: '#444', fontSize: 9, fontWeight: 'bold', marginTop: 2 },

  // Profiles
  profileList: { gap: 12 },
  profileItem: { backgroundColor: '#161616', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#222' },
  profileItemActive: { borderColor: '#00ff8840', backgroundColor: '#00ff8805' },
  profileName: { color: '#fff', fontSize: 13, fontWeight: '900' },
  profileDesc: { color: '#444', fontSize: 10, marginTop: 4 },
  profileActions: { position: 'absolute', right: 16, top: 16, flexDirection: 'row', gap: 12 },
  btnAddProfile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#222', borderRadius: 16 },
  btnAddProfileText: { color: '#444', fontSize: 11, fontWeight: 'bold' },
  editProfileForm: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#222', gap: 10 },
  editInput: { backgroundColor: '#0a0a0a', borderRadius: 10, padding: 12, color: '#fff', fontSize: 12, borderWidth: 1, borderColor: '#222' },
  editActions: { flexDirection: 'row', gap: 10 },
  btnSmall: { flex: 1, backgroundColor: '#222', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnSmallText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // Telemetry
  telemetryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 10 },
  qsIndicator: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  qsIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  telemetryValue: { color: '#00ff88', fontSize: 42, fontWeight: '900', textAlign: 'center' },
  telemetryLabel: { color: '#444', fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginTop: 5 },
  telemetryDivider: { width: 1, height: 40, backgroundColor: '#222' },
  rpmBarContainer: { flexDirection: 'row', height: 24, width: '100%', gap: 2, marginTop: 20 },
  rpmSegment: { flex: 1, borderRadius: 2 },
  rpmSegmentActive: { opacity: 1, transform: [{ scaleY: 1.2 }] },
  rpmSegmentInactive: { opacity: 0.15 },

  // Kill Times
  btnAddPoint: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00ff8815', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  btnAddPointText: { color: '#00ff88', fontSize: 10, fontWeight: 'bold' },
  pointsList: { gap: 10 },
  pointItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161616', padding: 12, borderRadius: 16 },
  pointControlsWrapper: { flex: 1, flexDirection: 'row', gap: 10, paddingRight: 10 },
  pointControlHalf: { flex: 1 },
  pointControlLabel: { color: '#555', fontSize: 9, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  controlGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0a0a0a', padding: 4, borderRadius: 10 },
  btnControl: { width: 28, height: 28, backgroundColor: '#222', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnControlText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  pointInput: { flex: 1, color: '#fff', fontSize: 13, fontWeight: 'bold', textAlign: 'center', padding: 0 },
  btnRemovePoint: { padding: 8, backgroundColor: '#ef444415', borderRadius: 10 },

  // Settings
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  settingLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  settingHint: { color: '#444', fontSize: 10, marginTop: 2 },
  settingValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingValueText: { color: '#00ff88', fontSize: 14, fontWeight: '900', minWidth: 40, textAlign: 'center' },

  // Apply
  btnApply: { backgroundColor: '#00ff88', height: 70, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 10, shadowColor: '#00ff88', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  btnApplyText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },

  // Toast
  toastContainer: { position: 'absolute', top: 50, left: 20, right: 20, zIndex: 1000, gap: 10 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  toast_success: { backgroundColor: '#00ff8805', borderColor: '#00ff8820' },
  toast_error: { backgroundColor: '#ef444405', borderColor: '#ef444420' },
  toast_info: { backgroundColor: '#3b82f605', borderColor: '#3b82f620' },
  toastText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#111', borderRadius: 30, padding: 30, borderWidth: 1, borderColor: '#222' },
  raceDataContainer: { padding: 20 },
  raceDataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  raceDataLabel: { color: '#888', fontSize: 16 },
  raceDataValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  // History
  historyList: { gap: 10 },
  historyItem: { backgroundColor: '#161616', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#222' },
  historyDate: { color: '#888', fontSize: 10, fontWeight: 'bold', marginBottom: 10 },
  historyMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  historyMetric: { alignItems: 'center' },
  historyMetricLabel: { color: '#555', fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  historyMetricValue: { color: '#fff', fontSize: 14, fontWeight: '900' },

  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  modalSubtitle: { color: '#444', fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  modalBody: { color: '#888', fontSize: 14, lineHeight: 20, marginBottom: 30 },
  modalActions: { flexDirection: 'row', gap: 15 },
  btnSecondary: { flex: 1, backgroundColor: '#222', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  btnSecondaryText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  btnDanger: { flex: 1, backgroundColor: '#ef4444', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  btnDangerText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
