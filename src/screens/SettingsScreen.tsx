import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';

interface SettingsProps {
  killTimes: number[];
  setKillTimes: React.Dispatch<React.SetStateAction<number[]>>;
  minRpm: number;
  setMinRpm: React.Dispatch<React.SetStateAction<number>>;
}

export default function SettingsScreen({
  killTimes,
  setKillTimes,
  minRpm,
  setMinRpm,
}: SettingsProps) {
  const [tempKillTimes, setTempKillTimes] = useState(killTimes.map(String));

  const handleSave = () => {
    setKillTimes(tempKillTimes.map(Number));
    // Also save minRpm here if needed
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tuning Settings</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Minimum RPM</Text>
        <TextInput
          style={styles.input}
          value={String(minRpm)}
          onChangeText={(text) => setMinRpm(Number(text))}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Kill Times (ms)</Text>
        {tempKillTimes.map((time, index) => (
          <TextInput
            key={index}
            style={styles.input}
            value={time}
            onChangeText={(text) => {
              const newTimes = [...tempKillTimes];
              newTimes[index] = text;
              setTempKillTimes(newTimes);
            }}
            keyboardType="numeric"
          />
        ))}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.buttonText}>Save Settings</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  label: {
    color: '#94a3b8',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: '#22c55e',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
