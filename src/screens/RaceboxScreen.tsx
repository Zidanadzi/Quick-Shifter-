import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  const renderRow = (label: string, time: number, speed: number | null = null) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{time > 0 ? `${time.toFixed(2)}s` : '-'}</Text>
      {speed !== null && <Text style={styles.speed}>{speed > 0 ? `${Math.round(speed)} km/h` : '-'}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{currentRaceTime.toFixed(2)}s</Text>
      
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>Distance</Text>
          <Text style={styles.headerText}>Time</Text>
          <Text style={styles.headerText}>Speed</Text>
        </View>
        {renderRow('60ft', raceResults.time60ft, raceResults.maxSpeed)}
        {renderRow('0-100 km/h', raceResults.time0to100, raceResults.maxSpeed)}
        {renderRow('201m', raceResults.time201m, raceResults.maxSpeed)}
        {renderRow('402m', raceResults.time402m, raceResults.maxSpeed)}
      </View>

      <Text style={styles.maxSpeed}>Max Speed: {Math.round(raceResults.maxSpeed)} km/h</Text>

      <View style={styles.buttonContainer}>
        {!isRaceStarted ? (
          <TouchableOpacity style={[styles.button, styles.startButton]} onPress={startRace}>
            <Text style={styles.buttonText}>START RACE</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopRace}>
            <Text style={styles.buttonText}>STOP</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={resetRace}>
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
    backgroundColor: '#0f172a',
  },
  timer: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#22c55e',
    textAlign: 'center',
    marginBottom: 20,
  },
  table: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  label: {
    flex: 1,
    color: '#fff',
  },
  value: {
    flex: 1,
    color: '#fff',
    fontWeight: 'bold',
  },
  speed: {
    flex: 1,
    color: '#22c55e',
  },
  maxSpeed: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#22c55e',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  resetButton: {
    backgroundColor: '#64748b',
  },
});
