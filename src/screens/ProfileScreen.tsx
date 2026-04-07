import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProfileProps {
  userName: string;
}

export default function ProfileScreen({ userName }: ProfileProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile Screen</Text>
      <Text style={styles.subText}>User: {userName}</Text>
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
