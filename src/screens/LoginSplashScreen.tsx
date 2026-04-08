import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TextInput, TouchableOpacity } from 'react-native';

interface LoginSplashScreenProps {
  onNameSubmit: (name: string) => void;
}

export default function LoginSplashScreen({ onNameSubmit }: LoginSplashScreenProps) {
  const fadeAnim = new Animated.Value(0);
  const [name, setName] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      setShowInput(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  const handleSubmit = () => {
    if (name.trim()) {
      onNameSubmit(name.trim());
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <Text style={styles.logoText}>Antasena Pro</Text>
        <Text style={styles.tagline}>Your Performance Partner</Text>
      </Animated.View>

      {showInput && (
        <Animated.View style={styles.inputContainer}>
          <Text style={styles.greetingText}>Hi there! What should I call you, Partner?</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Let's Ride!</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#22c55e',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 10,
    textAlign: 'center',
  },
  greetingText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#22c55e',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
