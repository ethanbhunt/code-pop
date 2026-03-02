import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { BASE_URL } from '../../ip_address';

const CreateAccountPage = ({ navigation }) => {
  const [first_name, setFirstname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
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

  const handleRegister = async () => {
    try {
      const response = await fetch(`${BASE_URL}/backend/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, last_name: '', username, password, email }),
      });
      if (response.ok) {
        const data = await response.json();
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', String(data.id));
        await AsyncStorage.setItem('first_name', data.first_name || '');
        await AsyncStorage.setItem(
          'userRole',
          data.is_superuser ? 'admin' : data.is_staff ? 'manager' : 'user'
        );
        if (data.is_superuser) navigation.navigate('AdminDash');
        else if (data.is_staff) navigation.navigate('ManagerDash');
        else navigation.navigate('GeneralHome');
      } else {
        const err = await response.json().catch(() => ({}));
        setMessage(err.username?.[0] || err.email?.[0] || 'Registration failed.');
      }
    } catch (error) {
      console.log(error);
      setMessage('Error registering user.');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/PinkBubbles.png')} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.overlay} />

      <View style={styles.card}>
        <Text style={styles.title}>Create your CodePop account</Text>
        <Text style={styles.subtitle}>Save your favorites and get smarter recommendations.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            placeholder="First name"
            placeholderTextColor="#64748b"
            onChangeText={setFirstname}
            value={first_name}
            style={styles.input}
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            placeholder="Choose a username"
            placeholderTextColor="#64748b"
            onChangeText={setUsername}
            value={username}
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor="#64748b"
            onChangeText={setEmail}
            value={email}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="Create a password"
            placeholderTextColor="#64748b"
            onChangeText={setPassword}
            value={password}
            secureTextEntry
            style={styles.input}
          />

          {message ? <Text style={styles.errorText}>{message}</Text> : null}

          <TouchableOpacity onPress={handleRegister} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Create account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Back to sign in</Text>
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
  title: {
    fontFamily: 'CherryBombOne',
    fontSize: 26,
    color: '#f9fafb',
    marginBottom: 4,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  form: {
    marginTop: 4,
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

export default CreateAccountPage;
