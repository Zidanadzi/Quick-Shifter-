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

export default function RaceboxScreen({
  isRaceStarted,
  currentRaceTime,
  raceResults,
  startRace,
  stopRace,
  resetRace,
}: RaceboxProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Racebox Screen</Text>
      <Text style={styles.subText}>Race Started: {isRaceStarted ? 'Yes' : 'No'}</Text>
      <Text style={styles.subText}>Current Time: {currentRaceTime.toFixed(2)}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 24,
  },
  subText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 10,
  },
});
