import React, { useState, useEffect } from 'react';
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
  Dimensions
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { 
  Zap, 
  Settings, 
  Activity, 
  Bluetooth, 
  Save, 
  ChevronRight,
  Info,
  Cpu
} from 'lucide-react-native';
import Animated, { 
  FadeIn, 
  FadeInDown,
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const manager = new BleManager();

// UUIDs (Sesuai dengan Arduino HM-10)
const SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';
const CHAR_UUID = '0000ff01-0000-1000-8000-00805f9b34fb';

export default function App() {
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [threshold, setThreshold] = useState(45);
  const [minRpm, setMinRpm] = useState(3000);
  const [liveRpm, setLiveRpm] = useState(0);

  // Scan & Connect Logic
  const scanAndConnect = () => {
    setIsScanning(true);
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        Alert.alert("Bluetooth Error", "Pastikan Bluetooth & Lokasi aktif. " + error.message);
        setIsScanning(false);
        return;
      }

      if (device?.name?.includes('HM-10') || device?.localName?.includes('HM-10')) {
        manager.stopDeviceScan();
        device.connect()
          .then(d => d.discoverAllServicesAndCharacteristics())
          .then(d => {
            setConnectedDevice(d);
            setIsScanning(false);
            Alert.alert("Connected", "Terhubung ke Antasena Pro!");
          })
          .catch(err => {
            Alert.alert("Connection Failed", err.message);
            setIsScanning(false);
          });
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  // Sync Settings to Arduino
  const syncSettings = async () => {
    if (!connectedDevice) {
      Alert.alert("Not Connected", "Hubungkan Bluetooth terlebih dahulu.");
      return;
    }

    const payload = JSON.stringify({
      t: threshold,
      m: minRpm,
      e: isEnabled,
      k: [[3000, 85], [6000, 75], [9000, 65], [12000, 55]] // Contoh data kill times
    });

    try {
      // Base64 encoding for BLE transmission
      const base64 = btoa(payload);
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHAR_UUID,
        base64
      );
      Alert.alert("Success", "Konfigurasi berhasil dikirim ke modul!");
    } catch (err: any) {
      Alert.alert("Sync Error", err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>QUICK SHIFTER</Text>
            <View style={styles.brandRow}>
              <Text style={styles.brandName}>ANTASENA</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            onPress={connectedDevice ? () => connectedDevice.cancelConnection() : scanAndConnect}
            style={[styles.btnConnect, connectedDevice && styles.btnConnected]}
          >
            <Bluetooth color={connectedDevice ? "#00ff88" : "#fff"} size={18} />
            <Text style={[styles.btnConnectText, connectedDevice && {color: '#00ff88'}]}>
              {isScanning ? "Scanning..." : connectedDevice ? "Connected" : "Connect"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Telemetry Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Activity color="#00ff88" size={16} />
            <Text style={styles.cardTitle}>LIVE TELEMETRY</Text>
          </View>
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>ENGINE RPM</Text>
              <Text style={styles.telemetryValue}>{liveRpm} <Text style={styles.unit}>RPM</Text></Text>
            </View>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>GEAR</Text>
              <Text style={styles.telemetryValue}>N</Text>
            </View>
          </View>
        </Animated.View>

        {/* System Settings */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Cpu color="#00ff88" size={16} />
            <Text style={styles.cardTitle}>SYSTEM CONFIG</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingName}>Ignition System</Text>
              <Text style={styles.settingDesc}>Master switch for quick shifter</Text>
            </View>
            <Switch 
              value={isEnabled}
              onValueChange={setIsEnabled}
              trackColor={{ false: "#222", true: "#00ff88" }}
              thumbColor={isEnabled ? "#fff" : "#666"}
            />
          </View>

          <TouchableOpacity style={styles.settingRow}>
            <View>
              <Text style={styles.settingName}>Sensor Threshold</Text>
              <Text style={styles.settingDesc}>Sensitivity of proximity sensor</Text>
            </View>
            <View style={styles.valueBox}>
              <Text style={styles.valueText}>{threshold}%</Text>
              <ChevronRight color="#444" size={16} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View>
              <Text style={styles.settingName}>Minimum RPM</Text>
              <Text style={styles.settingDesc}>System active above this RPM</Text>
            </View>
            <View style={styles.valueBox}>
              <Text style={styles.valueText}>{minRpm}</Text>
              <ChevronRight color="#444" size={16} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Info color="#00ff88" size={16} />
          <Text style={styles.infoText}>
            Gunakan HM-10 BLE Module untuk koneksi terbaik. Pastikan firmware Arduino sudah ter-upload.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity onPress={syncSettings} style={styles.btnApply}>
          <Save color="#000" size={20} />
          <Text style={styles.btnApplyText}>APPLY TO MODULE</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  brandTitle: { color: '#fff', fontSize: 14, fontWeight: '900', fontStyle: 'italic', opacity: 0.8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: { color: '#00ff88', fontSize: 26, fontWeight: '900', fontStyle: 'italic' },
  proBadge: { backgroundColor: '#00ff8820', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWIdth: 1, borderColor: '#00ff8840' },
  proText: { color: '#00ff88', fontSize: 10, fontWeight: 'bold' },
  btnConnect: { backgroundColor: '#1a1a1a', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#333' },
  btnConnected: { borderColor: '#00ff8840', backgroundColor: '#00ff8805' },
  btnConnectText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  card: { backgroundColor: '#111', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardTitle: { color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, opacity: 0.6 },
  telemetryGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  telemetryItem: { flex: 1 },
  telemetryLabel: { color: '#555', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  telemetryValue: { color: '#fff', fontSize: 32, fontWeight: '900' },
  unit: { fontSize: 12, color: '#00ff88', fontWeight: 'bold' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  settingName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  settingDesc: { color: '#555', fontSize: 11, marginTop: 2 },
  valueBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  valueText: { color: '#00ff88', fontSize: 13, fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', gap: 12, backgroundColor: '#00ff8805', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#00ff8810', marginBottom: 25 },
  infoText: { color: '#00ff8880', fontSize: 11, flex: 1, lineHeight: 16 },
  btnApply: { backgroundColor: '#00ff88', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, shadowColor: '#00ff88', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  btnApplyText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }
});
