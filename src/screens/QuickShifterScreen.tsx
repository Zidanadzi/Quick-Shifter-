import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

interface QuickShifterProps {
  rpm: number;
  speed: number;
}

export default function QuickShifterScreen({ rpm, speed }: QuickShifterProps) {
  const [activeProfile, setActiveProfile] = useState('Street');
  const [killTimes, setKillTimes] = useState({
    3000: '85',
    6000: '80',
    9000: '75',
    12000: '70',
  });
  const [sensorThreshold, setSensorThreshold] = useState('45');
  const [minRpm, setMinRpm] = useState('3000');

  const handleProfileSelect = (profileName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Activate Profile',
      `Are you sure you want to activate the ${profileName} profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Activate', 
          onPress: () => {
            setActiveProfile(profileName);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      ]
    );
  };

  const handleKillTimeChange = (rpmVal: string, value: string) => {
    setKillTimes(prev => ({ ...prev, [rpmVal]: value }));
  };

  const handleSaveKillTimes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Save Kill Times',
      'Are you sure you want to save these kill time mappings to the device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: () => {
            // Logic to save to device would go here
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Dashboard Monitor */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dashboard Monitor</Text>
        <View style={styles.monitorRow}>
          <View style={styles.monitorItem}>
            <Text style={styles.monitorValue}>{rpm}</Text>
            <Text style={styles.monitorLabel}>RPM</Text>
          </View>
          <View style={styles.monitorItem}>
            <Text style={styles.monitorValue}>{speed}</Text>
            <Text style={styles.monitorLabel}>KM/H</Text>
          </View>
        </View>
      </View>

      {/* Profiles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profiles</Text>
        <TouchableOpacity 
          style={styles.profileRow}
          onPress={() => handleProfileSelect('Street')}
        >
          <View style={styles.profileHeader}>
            <Text style={[styles.profileName, activeProfile === 'Street' && styles.profileNameActive]}>Street</Text>
            {activeProfile === 'Street' && <Text style={styles.activeBadge}>ACTIVE</Text>}
          </View>
          <Text style={styles.profileDesc}>Smooth shifting for daily commuting.</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.profileRow}
          onPress={() => handleProfileSelect('Race')}
        >
          <View style={styles.profileHeader}>
            <Text style={[styles.profileName, activeProfile === 'Race' && styles.profileNameActive]}>Race</Text>
            {activeProfile === 'Race' && <Text style={styles.activeBadge}>ACTIVE</Text>}
          </View>
          <Text style={styles.profileDesc}>Aggressive shifting for track use.</Text>
        </TouchableOpacity>
      </View>

      {/* Kill Times Mapping */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Kill Times Mapping</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveKillTimes}>
            <Text style={styles.saveBtnText}>SAVE</Text>
          </TouchableOpacity>
        </View>
        
        {Object.entries(killTimes).map(([rpmVal, killTime]) => (
          <View key={rpmVal} style={styles.mappingRow}>
            <Text style={styles.mappingLabel}>RPM: {rpmVal}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={killTime}
                onChangeText={(val) => handleKillTimeChange(rpmVal, val)}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.inputSuffix}>ms</Text>
            </View>
          </View>
        ))}
      </View>

      {/* System Parameters */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>System Parameters</Text>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Sensor Threshold</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={sensorThreshold}
              onChangeText={setSensorThreshold}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.inputSuffix}>%</Text>
          </View>
        </View>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Minimum RPM</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={minRpm}
              onChangeText={setMinRpm}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  saveBtn: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00e5ff',
    marginBottom: 15,
  },
  saveBtnText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileRow: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileNameActive: {
    color: '#00e5ff',
  },
  activeBadge: {
    fontSize: 10,
    color: '#000',
    backgroundColor: '#00e5ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  profileDesc: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  monitorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  monitorItem: {
    alignItems: 'center',
  },
  monitorValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00e5ff',
  },
  monitorLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 5,
  },
  mappingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  mappingLabel: {
    color: '#fff',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 10,
  },
  input: {
    color: '#00e5ff',
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 8,
    minWidth: 40,
    textAlign: 'center',
  },
  inputSuffix: {
    color: '#94a3b8',
    marginLeft: 4,
    fontSize: 14,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  paramLabel: {
    color: '#94a3b8',
    fontSize: 16,
  },
});
