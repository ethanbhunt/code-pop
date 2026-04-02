import * as Font from 'expo-font';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
              'CherryBombOne': require('./../../assets/fonts/CherryBombOne-Regular.ttf'), // Adjust path as necessary
          });
      };
  
      loadFonts();
    }, []);

    const handleRegister = async () => {
    try {
      const response = await fetch(`${BASE_URL}/backend/auth/register/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ first_name, username, password, email })
      });
      navigation.navigate('Auth');
    } catch (error) {
        console.log(error);
      setMessage('Error registering user.');
    }
  };

  return (
    <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <TextInput placeholder="First Name" onChangeText={setFirstname} style={styles.input} />
        <TextInput placeholder="Username" onChangeText={setUsername} style={styles.input} />
        <TextInput placeholder="Email" onChangeText={setEmail} keyboardType="email-address" style={styles.input}/>
        <TextInput placeholder="Password" onChangeText={setPassword} secureTextEntry style={styles.input} />
        <TouchableOpacity onPress={handleRegister} style={styles.mediumButton}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
        {message ? <Text>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#1c334d',
    margin: 30,
    textAlign: 'center',
  },
  mediumButton: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1F7A8C',
    borderRadius: 15,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  input: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    borderColor: '#d6e5f3',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#243b52',
  },
});

export default CreateAccountPage;
