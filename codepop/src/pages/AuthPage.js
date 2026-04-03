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
    if (!username.trim() || !password) {
      Alert.alert('Please enter username and password.');
      return;
    }

    try {
      // Send credentials to the OrbitDB auth endpoint
      const response = await fetch(`${BASE_URL}/backend/auth/login/`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
      });

      const responseData = await response.json().catch(() => ({}));

       if (response.status === 200) {
         const userData = responseData.data || responseData;
         const authToken = userData.token || responseData.token;
         const userId = userData.userId || userData.user_id || responseData.userId || responseData.user_id;
         const firstName = userData.firstName || userData.first_name || responseData.firstName || responseData.first_name || '';
         const isSuperuser = Boolean(userData.isSuperuser || userData.is_superuser || userData.isAdmin || userData.is_admin);
         const isStaff = Boolean(userData.isStaff || userData.is_staff || userData.isManager || userData.is_manager);

         if (!authToken || !userId) {
           throw new Error('Login response was missing token or user id.');
         }

           // Store the token, username, and user ID in AsyncStorage
           await AsyncStorage.setItem('userToken', authToken);
           await AsyncStorage.setItem('userId', String(userId));
           await AsyncStorage.setItem('first_name', firstName);

            if(isSuperuser){
             await AsyncStorage.setItem('userRole', 'admin');
             Alert.alert('Login successful!');
             navigation.navigate('AdminDash');
           }else if(isStaff){
             await AsyncStorage.setItem('userRole', 'manager');
             Alert.alert('Login successful!');
             navigation.navigate('ManagerDash');
           } else{
             await AsyncStorage.setItem('userRole', 'user');
             Alert.alert('Login successful!');
             navigation.navigate('GeneralHome');
           }
        
      } else {
          Alert.alert(responseData.error || 'Invalid credentials, please try again.');
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
