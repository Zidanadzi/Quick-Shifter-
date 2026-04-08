import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileProps {
  userName: string;
  onLogout: () => void;
}

export default function ProfileScreen({ userName, onLogout }: ProfileProps) {
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to reset your partner profile?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Reset", 
          onPress: async () => {
            await AsyncStorage.removeItem('userName');
            onLogout();
          } 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile Screen</Text>
      <Text style={styles.subText}>Partner: {userName}</Text>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Reset Partner Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subText: {
    color: '#94a3b8',
    fontSize: 18,
    marginTop: 10,
    marginBottom: 30,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
