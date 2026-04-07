import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SharedValue } from 'react-native-reanimated';

interface QuickShifterProps {
  rpm: number;
  speed: number;
  rpmValue: SharedValue<number>;
}

export default function QuickShifterScreen({ rpm, speed, rpmValue }: QuickShifterProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Quick Shifter Screen</Text>
      <Text style={styles.subText}>RPM: {rpm}</Text>
      <Text style={styles.subText}>Speed: {speed}</Text>
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
