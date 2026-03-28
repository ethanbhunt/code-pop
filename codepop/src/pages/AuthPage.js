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
        source={require('../../assets/robot-with-soda.png')}
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
    backgroundColor: '#C6C8EE',
  },
  title: {
    fontFamily: 'CherryBombOne',
    fontSize: 52,
    paddingBottom: 30,
  },
  input: {
    marginBottom: 10,
    borderWidth: 1,
    padding: 5,
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#FFA686',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  mediumButton: {
    margin: 10,
    padding: 15,
    backgroundColor: '#8df1d3',
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    fontSize: 16,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
});

export default AuthPage;
