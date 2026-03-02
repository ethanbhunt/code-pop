import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';

const AuthPage = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadFonts = async () => {
      await Font.loadAsync({
        CherryBombOne: require('./../../assets/fonts/CherryBombOne-Regular.ttf'),
      });
    };
    loadFonts();
  }, []);

  const handleRegister = () => {
    navigation.navigate('CreateAccount');
  };

  const handleLogin = async () => {
    try {
      const response = await fetch(`${BASE_URL}/backend/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.status === 200) {
        const data = await response.json();
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.user_id.toString());
        await AsyncStorage.setItem('first_name', data.first_name);
        const role = data.role || (data.is_admin ? 'admin' : data.is_manager ? 'manager' : 'user');
        await AsyncStorage.setItem('userRole', role);
        if (data.is_admin || role === 'super') {
          navigation.navigate('AdminDash');
        } else if (data.is_manager || role === 'manager' || role === 'logistics' || role === 'repair') {
          navigation.navigate('ManagerDash');
        } else {
          navigation.navigate('GeneralHome');
        }
      } else {
        Alert.alert('Invalid credentials', 'Please check your username and password.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Login failed', 'Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/PinkBubbles.png')} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.overlay} />

      <View style={styles.card}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/robot-with-soda.png')} style={styles.logoImage} />
          <View>
            <Text style={styles.appName}>CodePop</Text>
            <Text style={styles.appTagline}>Sign in to build your perfect drink.</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            placeholder="Enter your username"
            placeholderTextColor="#64748b"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#64748b"
            value={password}
            secureTextEntry
            onChangeText={setPassword}
            style={styles.input}
          />

          {message ? <Text style={styles.errorText}>{message}</Text> : null}

          <TouchableOpacity onPress={handleLogin} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRegister} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  card: {
    width: '88%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 22,
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
    marginRight: 14,
  },
  appName: {
    fontFamily: 'CherryBombOne',
    fontSize: 28,
    color: '#f9fafb',
  },
  appTagline: {
    marginTop: 2,
    fontSize: 12,
    color: '#94a3b8',
  },
  form: {
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    color: '#cbd5f5',
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    width: '100%',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: 'rgba(15,23,42,0.9)',
    color: '#e5e7eb',
    fontSize: 14,
  },
  errorText: {
    color: '#f97373',
    fontSize: 12,
    marginTop: 6,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#022c22',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
  },
});

export default AuthPage;
