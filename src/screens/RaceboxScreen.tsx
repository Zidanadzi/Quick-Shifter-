import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Timer, Flag, Zap, Gauge } from 'lucide-react-native';

interface RaceResults {
  time0to100: number;
  speed0to100: number;
  time60ft: number;
  speed60ft: number;
  time201m: number;
  speed201m: number;
  time402m: number;
  speed402m: number;
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
  const renderMetric = (label: string, time: number, speed?: number, suffix: string = 's', icon?: React.ReactNode) => (
    <View style={styles.metricRow}>
      <View style={styles.metricLabelContainer}>
        {icon && <View style={styles.metricIcon}>{icon}</View>}
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <View style={styles.metricValueContainer}>
        <Text style={styles.metricValue}>{time > 0 ? time.toFixed(2) : '--'}{time > 0 ? suffix : ''}</Text>
        {speed !== undefined && (
          <Text style={styles.metricSpeedValue}>
            {time > 0 ? ` | ${Math.round(speed)} km/h` : ' | -- km/h'}
          </Text>
        )}
      </View>
    </View>
  );

  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    const ms = Math.floor((timeInSeconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

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

      {/* HUD Timer */}
      <View style={styles.hudContainer}>
        <Text style={styles.hudTime}>{formatTime(currentRaceTime)}</Text>
        <Text style={styles.hudLabel}>{isRaceStarted ? 'RACING...' : 'READY'}</Text>
      </View>

      {/* Metrics Card */}
      <View style={styles.card}>
        {renderMetric('0-100 km/h', raceResults.time0to100, raceResults.speed0to100, 's', <Gauge size={16} color="#00e5ff" />)}
        {renderMetric('60ft', raceResults.time60ft, raceResults.speed60ft, 's', <Timer size={16} color="#00e5ff" />)}
        {renderMetric('201m', raceResults.time201m, raceResults.speed201m, 's', <Flag size={16} color="#00e5ff" />)}
        {renderMetric('402m', raceResults.time402m, raceResults.speed402m, 's', <Flag size={16} color="#00e5ff" />)}
        {renderMetric('Top Speed', raceResults.maxSpeed, undefined, ' km/h', <Zap size={16} color="#00e5ff" />)}
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
          <Text style={styles.buttonTextSecondary}>RESET</Text>
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
    marginBottom: 20,
    marginTop: 20,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 24,
    color: '#00e5ff',
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
  hudContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 20,
  },
  hudTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00e5ff',
    fontVariant: ['tabular-nums'],
  },
  hudLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 5,
    fontWeight: 'bold',
    letterSpacing: 2,
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
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  metricLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    padding: 6,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  metricSpeedValue: {
    fontSize: 14,
    color: '#00e5ff',
    fontWeight: 'bold',
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
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#00e5ff', // Aquamarine
  },
  secondaryButton: {
    backgroundColor: '#111', // Dark gray
    borderWidth: 1,
    borderColor: '#333',
  },
});
