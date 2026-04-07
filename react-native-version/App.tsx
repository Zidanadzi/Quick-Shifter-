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
  const [userName, setUserName] = useState<string>("");
  const [showSplash, setShowSplash] = useState(true);
  const [tempName, setTempName] = useState("");
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [connectionStage, setConnectionStage] = useState<string>("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [isEditingProfile, setIsEditingProfile] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

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

  // --- Toast System ---
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
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
        ]);
        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED
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
          .then(d => {
            setConnectedDevice(d);
            setIsScanning(false);
            setConnectionStage("Connected");
            addToast(`Connected to ${d.name || 'QS Device'}`, "success");
            
            d.onDisconnected((err, disconnectedDevice) => {
              setConnectedDevice(null);
              setConnectionStage("Disconnected");
              addToast("Device disconnected", "info");
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

  const disconnectBluetooth = async () => {
    if (connectedDevice) {
      await connectedDevice.cancelConnection();
      setConnectedDevice(null);
      setConnectionStage("");
    }
  };

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
            style={[styles.toast, styles[`toast_${toast.type}` as keyof typeof styles]]}
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
          {connectedDevice ? (
            <TouchableOpacity 
              style={[styles.btnConnection, { backgroundColor: '#ef444410', borderColor: '#ef444430' }]} 
              onPress={disconnectBluetooth}
            >
              <BluetoothOff color="#ef4444" size={16} />
              <Text style={[styles.btnConnectionText, {color: '#ef4444'}]}>DISCONNECT</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.btnConnection, { backgroundColor: '#00ff8810', borderColor: '#00ff8830' }]} 
              onPress={scanAndConnect} 
              disabled={isScanning}
            >
              {isScanning ? <ActivityIndicator size="small" color="#00ff88" /> : <Bluetooth color="#00ff88" size={16} />}
              <Text style={[styles.btnConnectionText, {color: '#00ff88'}]}>{isScanning ? connectionStage.toUpperCase() : "CONNECT"}</Text>
            </TouchableOpacity>
          )}
        </View>

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
              <Text style={styles.telemetryValue}>{liveRpm.toLocaleString()}</Text>
              <Text style={styles.telemetryLabel}>RPM</Text>
            </View>
            <View style={styles.telemetryDivider} />
            <View>
              <Text style={styles.telemetryValue}>{liveSpeed}</Text>
              <Text style={styles.telemetryLabel}>KM/H</Text>
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
        <Card title="System Parameters" icon={Settings} subtitle="Core configuration">
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
        </Card>

        {/* Apply Button */}
        <TouchableOpacity style={styles.btnApply} onPress={syncSettings}>
          <Save color="#000" size={20} />
          <Text style={styles.btnApplyText}>APPLY TO MODULE</Text>
        </TouchableOpacity>

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
