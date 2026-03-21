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
        body: JSON.stringify({ firstName: first_name, username, password, email })
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
    backgroundColor: '#C6C8EE'
  },
  title: {
    fontFamily: 'CherryBombOne',
    fontSize: 32,
    margin: 30,
    textAlign: 'center',
  },
  mediumButton: {
    margin: 20,
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
  input: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFA686',
  },
});

export default CreateAccountPage;
