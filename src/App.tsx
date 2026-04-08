import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Modal, 
  Platform, 
  StatusBar,
  SafeAreaView,
  Dimensions,
  Alert
} from 'react-native';
import { 
  Zap, 
  LogOut, 
  Bluetooth, 
  BluetoothOff, 
  LayoutGrid, 
  Activity, 
  Plus, 
  Minus, 
  Trash2, 
  Edit2, 
  RotateCcw, 
  Save,
  Check,
  AlertTriangle,
  X
} from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Note: react-native-ble-plx only works on real devices.
// For the web preview, we'll use a mock or Web Bluetooth if available.
let BleManager: any;
if (Platform.OS !== 'web') {
  try {
    const { BleManager: RealBleManager } = require('react-native-ble-plx');
    BleManager = new RealBleManager();
  } catch (e) {
    console.warn("BleManager not available");
  }
}

const { width } = Dimensions.get('window');

// --- Components ---

const Card = ({ children, title, icon: Icon, action, description = "Real-time data" }: any) => (
  <View style={styles.card}>
    {(title || Icon) && (
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {Icon && (
            <View style={styles.iconContainer}>
              <Icon size={18} color="#00FFD4" />
            </View>
          )}
          {title && (
            <View>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSubtitle}>{description}</Text>
            </View>
          )}
        </View>
        {action}
      </View>
    )}
    {children}
  </View>
);

const ControlButton = ({ icon: Icon, onClick, style }: any) => (
  <TouchableOpacity 
    onPress={onClick}
    style={[styles.controlButton, style]}
  >
    <Icon size={16} color="white" />
  </TouchableOpacity>
);

const ParameterRow = ({ label, value, onIncrement, onDecrement, unit, color = "#00FFD4" }: any) => (
  <View style={styles.paramRow}>
    <View>
      <Text style={styles.paramLabel}>{label}</Text>
      <Text style={styles.paramSublabel}>Configuration</Text>
    </View>
    <View style={styles.paramControls}>
      <ControlButton icon={Minus} onClick={onDecrement} />
      <View style={styles.valueDisplay}>
        <Text style={[styles.valueText, { color }]}>{value}</Text>
        {unit && <Text style={[styles.unitText, { color }]}>{unit}</Text>}
      </View>
      <ControlButton icon={Plus} onClick={onIncrement} />
    </View>
  </View>
);

const MappingRow = ({ rpm, time, onRpmChange, onTimeChange, onDelete }: any) => (
  <View style={styles.mappingRow}>
    <View style={styles.mappingInputGroup}>
      <Text style={styles.inputLabel}>Engine RPM</Text>
      <View style={styles.inputWrapper}>
        <TouchableOpacity onPress={() => onRpmChange(rpm - 100)}><Minus size={12} color="#8E8E8E" /></TouchableOpacity>
        <TextInput 
          keyboardType="numeric"
          value={rpm.toString()}
          onChangeText={(val) => onRpmChange(parseInt(val) || 0)}
          style={styles.textInput}
        />
        <TouchableOpacity onPress={() => onRpmChange(rpm + 100)}><Plus size={12} color="#8E8E8E" /></TouchableOpacity>
      </View>
    </View>
    <View style={styles.mappingInputGroup}>
      <Text style={styles.inputLabel}>Kill Time (ms)</Text>
      <View style={styles.inputWrapper}>
        <TouchableOpacity onPress={() => onTimeChange(time - 1)}><Minus size={12} color="#8E8E8E" /></TouchableOpacity>
        <TextInput 
          keyboardType="numeric"
          value={time.toString()}
          onChangeText={(val) => onTimeChange(parseInt(val) || 0)}
          style={styles.textInput}
        />
        <TouchableOpacity onPress={() => onTimeChange(time + 1)}><Plus size={12} color="#8E8E8E" /></TouchableOpacity>
      </View>
    </View>
    <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
      <Trash2 size={16} color="#FF5252" />
    </TouchableOpacity>
  </View>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [rpm, setRpm] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [syncStatus, setSyncStatus] = useState('idle');
  
  const [mapping, setMapping] = useState([
    { rpm: 3000, time: 85 },
    { rpm: 6000, time: 75 },
    { rpm: 9000, time: 65 },
    { rpm: 12000, time: 55 },
  ]);

  const [params, setParams] = useState({
    threshold: 45,
    minRpm: 3000,
    calibration: 0
  });

  const [profiles, setProfiles] = useState([
    { id: 1, name: 'Street', description: 'Smooth shifting for daily commuting.' },
    { id: 2, name: 'New Profile 2', description: 'Custom configuration profile.' },
  ]);

  const [selectedProfileId, setSelectedProfileId] = useState(1);
  const [isRaceStarted, setIsRaceStarted] = useState(false);
  const [raceTime, setRaceTime] = useState(0);

  // BLE Refs
  const bleDeviceRef = useRef<any>(null);

  // --- Persistence ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedParams = await AsyncStorage.getItem('antasena_params');
        const savedMapping = await AsyncStorage.getItem('antasena_mapping');
        const savedProfiles = await AsyncStorage.getItem('antasena_profiles');
        
        if (savedParams) setParams(JSON.parse(savedParams));
        if (savedMapping) setMapping(JSON.parse(savedMapping));
        if (savedProfiles) setProfiles(JSON.parse(savedProfiles));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('antasena_params', JSON.stringify(params));
    AsyncStorage.setItem('antasena_mapping', JSON.stringify(mapping));
    AsyncStorage.setItem('antasena_profiles', JSON.stringify(profiles));
  }, [params, mapping, profiles]);

  // --- Bluetooth Logic ---
  const connectBluetooth = async () => {
    if (Platform.OS === 'web') {
      // Web Bluetooth Implementation (Fallback for preview)
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] }],
          optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb']
        });
        const server = await device.gatt.connect();
        setIsConnected(true);
        bleDeviceRef.current = device;
      } catch (e) {
        console.error(e);
      }
    } else {
      // Native BLE Implementation
      // This would use BleManager.startDeviceScan, etc.
      setIsConnected(true);
    }
  };

  const disconnectBluetooth = () => {
    setIsConnected(false);
    if (Platform.OS === 'web' && bleDeviceRef.current) {
      bleDeviceRef.current.gatt.disconnect();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Zap size={24} color="#00FFD4" />
            </View>
            <View>
              <Text style={styles.headerSubtitle}>Quick Shifter</Text>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>ANTASENA</Text>
                <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.exitButton}>
            <LogOut size={16} color="#FF5252" />
            <Text style={styles.exitButtonText}>EXIT</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Status */}
        <TouchableOpacity 
          onPress={() => isConnected ? disconnectBluetooth() : connectBluetooth()}
          style={[
            styles.connectButton,
            isConnected ? styles.connectedButton : styles.disconnectedButton
          ]}
        >
          {isConnected ? <Bluetooth size={20} color="#00FFD4" /> : <BluetoothOff size={20} color="#FF5252" />}
          <Text style={[styles.connectButtonText, { color: isConnected ? "#00FFD4" : "#FF5252" }]}>
            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </TouchableOpacity>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity 
            onPress={() => setActiveTab('dashboard')}
            style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>DASHBOARD</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('racebox')}
            style={[styles.tab, activeTab === 'racebox' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'racebox' && styles.activeTabText]}>RACE BOX</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'dashboard' ? (
          <View style={styles.tabContent}>
            <Card title="Profiles" icon={LayoutGrid}>
              {profiles.map((profile) => (
                <TouchableOpacity 
                  key={profile.id}
                  onPress={() => setSelectedProfileId(profile.id)}
                  style={[styles.profileItem, selectedProfileId === profile.id && styles.selectedProfileItem]}
                >
                  <View>
                    <Text style={[styles.profileName, selectedProfileId === profile.id && { color: '#00FFD4' }]}>{profile.name}</Text>
                    <Text style={styles.profileDesc}>{profile.description}</Text>
                  </View>
                  <View style={styles.profileActions}>
                    <TouchableOpacity><Edit2 size={16} color="#8E8E8E" /></TouchableOpacity>
                    <TouchableOpacity><Trash2 size={16} color="#FF5252" /></TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.createProfileButton}>
                <Plus size={16} color="#404040" />
                <Text style={styles.createProfileText}>CREATE NEW PROFILE</Text>
              </TouchableOpacity>
            </Card>

            <Card title="Dashboard Monitor" icon={Activity}>
              <View style={styles.monitorRow}>
                <View style={styles.monitorItem}>
                  <Text style={styles.monitorValue}>{rpm}</Text>
                  <Text style={styles.monitorLabel}>RPM</Text>
                </View>
                <View style={styles.monitorDivider} />
                <View style={styles.monitorItem}>
                  <Text style={styles.monitorValue}>{speed}</Text>
                  <Text style={styles.monitorLabel}>KM/H</Text>
                </View>
              </View>
              <View style={styles.rpmBar}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.rpmSegment, 
                      (rpm / 12000) * 24 > i ? { backgroundColor: i > 18 ? '#FF0000' : i > 14 ? '#FF8C00' : '#00FFD4' } : { backgroundColor: '#1E1E1E' }
                    ]} 
                  />
                ))}
              </View>
            </Card>

            <Card title="Kill Times Mapping" icon={Zap}>
              {mapping.map((item, idx) => (
                <MappingRow 
                  key={idx}
                  rpm={item.rpm}
                  time={item.time}
                  onRpmChange={(val: number) => {
                    const next = [...mapping];
                    next[idx].rpm = val;
                    setMapping(next);
                  }}
                  onTimeChange={(val: number) => {
                    const next = [...mapping];
                    next[idx].time = val;
                    setMapping(next);
                  }}
                  onDelete={() => setMapping(mapping.filter((_, i) => i !== idx))}
                />
              ))}
            </Card>

            <Card title="System Parameters" icon={RotateCcw}>
              <ParameterRow 
                label="Sensor Threshold" 
                value={params.threshold} 
                unit="%"
                onIncrement={() => setParams({...params, threshold: Math.min(100, params.threshold + 1)})}
                onDecrement={() => setParams({...params, threshold: Math.max(0, params.threshold - 1)})}
              />
              <ParameterRow 
                label="Minimum RPM" 
                value={params.minRpm} 
                onIncrement={() => setParams({...params, minRpm: params.minRpm + 100})}
                onDecrement={() => setParams({...params, minRpm: Math.max(0, params.minRpm - 100)})}
              />
              <ParameterRow 
                label="RPM Calibration" 
                value={params.calibration} 
                onIncrement={() => setParams({...params, calibration: params.calibration + 100})}
                onDecrement={() => setParams({...params, calibration: params.calibration - 100})}
              />
            </Card>
          </View>
        ) : (
          <View style={styles.tabContent}>
            <Card title="Race Box" icon={Zap}>
              <View style={styles.raceTimer}>
                <Text style={styles.raceTimeText}>{raceTime.toFixed(2)}<Text style={styles.raceUnit}>s</Text></Text>
                <Text style={styles.raceSubtext}>Current Session</Text>
              </View>
              <View style={styles.raceActions}>
                <TouchableOpacity 
                  onPress={() => setIsRaceStarted(!isRaceStarted)}
                  style={[styles.raceButton, { backgroundColor: isRaceStarted ? '#FF5252' : '#00FFD4' }]}
                >
                  <Text style={[styles.raceButtonText, { color: isRaceStarted ? 'white' : 'black' }]}>
                    {isRaceStarted ? 'STOP RACE' : 'GET STARTED'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRaceTime(0)} style={styles.raceResetButton}>
                  <Text style={styles.raceResetText}>RESET</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Fixed Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton}>
          <Save size={20} color="black" />
          <Text style={styles.saveButtonText}>SAVE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8E8E8E',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00FFD4',
    fontStyle: 'italic',
  },
  proBadge: {
    backgroundColor: 'rgba(0,255,212,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,255,212,0.2)',
  },
  proBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#00FFD4',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30,30,30,0.5)',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  exitButtonText: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  connectButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
  },
  connectedButton: {
    backgroundColor: 'rgba(0,255,212,0.1)',
    borderColor: 'rgba(0,255,212,0.3)',
  },
  disconnectedButton: {
    backgroundColor: 'rgba(255,82,82,0.1)',
    borderColor: 'rgba(255,82,82,0.3)',
  },
  connectButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(0,255,212,0.1)',
    borderColor: 'rgba(0,255,212,0.4)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#404040',
    letterSpacing: 1,
  },
  activeTabText: {
    color: '#00FFD4',
  },
  tabContent: {
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#121212',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    padding: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#8E8E8E',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  controlButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  paramLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  paramSublabel: {
    fontSize: 10,
    color: '#8E8E8E',
    textTransform: 'uppercase',
  },
  paramControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  valueDisplay: {
    minWidth: 60,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  unitText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  mappingInputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 9,
    color: '#8E8E8E',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#262626',
  },
  textInput: {
    flex: 1,
    color: '#00FFD4',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 8,
  },
  deleteButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
  },
  profileItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  selectedProfileItem: {
    backgroundColor: 'rgba(0,255,212,0.05)',
    borderColor: 'rgba(0,255,212,0.3)',
  },
  profileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  profileDesc: {
    fontSize: 10,
    color: '#8E8E8E',
    marginTop: 2,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  createProfileButton: {
    width: '100%',
    paddingVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1E1E1E',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createProfileText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#404040',
    letterSpacing: 1,
  },
  monitorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 32,
  },
  monitorItem: {
    alignItems: 'center',
  },
  monitorValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#00FFD4',
  },
  monitorLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8E8E8E',
    marginTop: 4,
    letterSpacing: 2,
  },
  monitorDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#1E1E1E',
  },
  rpmBar: {
    flexDirection: 'row',
    height: 32,
    gap: 4,
  },
  rpmSegment: {
    flex: 1,
    borderRadius: 2,
  },
  raceTimer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  raceTimeText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#00FFD4',
  },
  raceUnit: {
    fontSize: 20,
    color: '#8E8E8E',
    marginLeft: 4,
  },
  raceSubtext: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8E8E8E',
    marginTop: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  raceActions: {
    flexDirection: 'row',
    gap: 16,
  },
  raceButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raceButtonText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  raceResetButton: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raceResetText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 24,
    backgroundColor: 'rgba(10,10,10,0.8)',
  },
  saveButton: {
    backgroundColor: '#00FFD4',
    paddingVertical: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: 'black',
    letterSpacing: 2,
  },
});
