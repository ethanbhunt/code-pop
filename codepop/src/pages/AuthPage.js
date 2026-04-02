import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';


const AuthPage = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadFonts = async () => {
        await Font.loadAsync({
            'CherryBombOne': require('./../../assets/fonts/CherryBombOne-Regular.ttf'), // Adjust path as necessary
        });
    };

    loadFonts();
  }, []);

  const handleRegister = async () => {
    // Registration logic... Go to CreateAccountPage
    navigation.navigate('CreateAccount');
  };

  const handleLogin = async () => {
    try {
      // Send credentials to Django backend
      const response = await fetch(`${BASE_URL}/backend/auth/login/`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
      });

      if (response.status === 200) {
           const response_data = await response.json();
           const userData = response_data.data; // Extract nested data object
           const token = userData.token; // Get token from response

           // Store the token, username, and user ID in AsyncStorage
           await AsyncStorage.setItem('userToken', userData.token);
           await AsyncStorage.setItem('userId', userData.userId.toString());  // Store user ID as string
           await AsyncStorage.setItem('first_name', userData.firstName || '');
            if(userData.isSuperuser){
             await AsyncStorage.setItem('userRole', 'admin');
             Alert.alert('Login successful!');
             navigation.navigate('AdminDash');
           }else if(userData.isStaff){
             await AsyncStorage.setItem('userRole', 'manager');
             Alert.alert('Login successful!');
             navigation.navigate('ManagerDash');
           } else{
             await AsyncStorage.setItem('userRole', 'user');
             Alert.alert('Login successful!');
             navigation.navigate('GeneralHome');
           }
        
           // Navigate to Home screen on success
      } else {
          Alert.alert('Invalid credentials, please try again.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Login failed. Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/codepop_ai_logo.png')}
        style={styles.image}
      />
      <Text style={styles.title}>CodePop</Text>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
        style={styles.input}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.mediumButton} onPress={handleRegister}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mediumButton} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
      {token && <Text>Your token: {token}</Text>}
      {message && <Text>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1c334d',
    paddingBottom: 30,
  },
  input: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#d6e5f3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    borderRadius: 15,
    backgroundColor: '#fff',
    color: '#243b52',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 6,
  },
  mediumButton: {
    margin: 6,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#1F7A8C',
    borderRadius: 15,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 15,
    marginBottom: 16,
  },
});

export default AuthPage;
