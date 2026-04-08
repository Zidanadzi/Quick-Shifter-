import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface QuickShifterProps {
  rpm: number;
  speed: number;
}

export default function QuickShifterScreen({ rpm, speed }: QuickShifterProps) {
  return (
    <ScrollView style={styles.container}>
      {/* Profiles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profiles</Text>
        <View style={styles.profileRow}>
          <Text style={styles.profileName}>Street</Text>
          <Text style={styles.profileDesc}>Smooth shifting for daily commuting.</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileName}>New Profile 2</Text>
          <Text style={styles.profileDesc}>Custom configuration profile.</Text>
        </View>
      </View>

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

      {/* Kill Times Mapping */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kill Times Mapping</Text>
        {[3000, 6000, 9000, 12000].map((rpmVal) => (
          <View key={rpmVal} style={styles.mappingRow}>
            <Text style={styles.mappingLabel}>RPM: {rpmVal}</Text>
            <Text style={styles.mappingValue}>Kill Time: 85ms</Text>
          </View>
        ))}
      </View>

      {/* System Parameters */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>System Parameters</Text>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Sensor Threshold</Text>
          <Text style={styles.paramValue}>45%</Text>
        </View>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Minimum RPM</Text>
          <Text style={styles.paramValue}>3000</Text>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  profileRow: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  profileDesc: {
    fontSize: 14,
    color: '#94a3b8',
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
    color: '#22c55e',
  },
  monitorLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 5,
  },
  mappingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  mappingLabel: {
    color: '#fff',
  },
  mappingValue: {
    color: '#22c55e',
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  paramLabel: {
    color: '#94a3b8',
  },
  paramValue: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
