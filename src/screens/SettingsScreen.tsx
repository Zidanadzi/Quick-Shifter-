import React, { Dispatch, SetStateAction } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SettingsProps {
  killTimes: number[];
  setKillTimes: Dispatch<SetStateAction<number[]>>;
  minRpm: number;
  setMinRpm: Dispatch<SetStateAction<number>>;
}

export default function SettingsScreen({
  killTimes,
  setKillTimes,
  minRpm,
  setMinRpm,
}: SettingsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings Screen</Text>
      <Text style={styles.subText}>Min RPM: {minRpm}</Text>
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
