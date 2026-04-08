import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface RaceResults {
  time0to100: number;
  time60ft: number;
  time201m: number;
  time402m: number;
  maxSpeed: number;
  distance: number;
}

interface RaceboxProps {
  isRaceStarted: boolean;
  currentRaceTime: number;
  raceResults: RaceResults;
  startRace: () => Promise<void>;
  stopRace: () => void;
  resetRace: () => void;
}

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface RaceResults {
  time0to100: number;
  time60ft: number;
  time201m: number;
  time402m: number;
  maxSpeed: number;
  distance: number;
}

interface RaceboxProps {
  isRaceStarted: boolean;
  currentRaceTime: number;
  raceResults: RaceResults;
  startRace: () => Promise<void>;
  stopRace: () => void;
  resetRace: () => void;
}

export default function RaceboxScreen({
  isRaceStarted,
  currentRaceTime,
  raceResults,
  startRace,
  stopRace,
  resetRace,
}: RaceboxProps) {
  const renderMetric = (label: string, value: number) => (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value.toFixed(2)}s</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>⚡</Text>
        </View>
        <View>
          <Text style={styles.title}>Race Box</Text>
          <Text style={styles.subtitle}>Performance metrics</Text>
        </View>
      </View>

      {/* Metrics Card */}
      <View style={styles.card}>
        {renderMetric('0-100 km/h', raceResults.time0to100)}
        {renderMetric('60ft', raceResults.time60ft)}
        {renderMetric('201m', raceResults.time201m)}
        {renderMetric('402m', raceResults.time402m)}
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={isRaceStarted ? stopRace : startRace}
        >
          <Text style={styles.buttonText}>
            {isRaceStarted ? 'STOP' : 'GET STARTED'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={resetRace}>
          <Text style={styles.buttonText}>RESET</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000', // Deep black background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#1a2e22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 24,
    color: '#22c55e',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 30,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  metricLabel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  primaryButton: {
    backgroundColor: '#22c55e', // Neon green
  },
  secondaryButton: {
    backgroundColor: '#222', // Dark gray
  },
});
