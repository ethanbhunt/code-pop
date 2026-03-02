import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Font from 'expo-font';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { BASE_URL } from '../../ip_address';
import NavBar from '../components/NavBar';
import SeasonalCarousel from '../components/SeasonalCarousel';

const GeneralHomePage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [name, setName] = useState(null);
  const navigation = useNavigation();

  // Check login status when the screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      const checkLoginStatus = async () => {
        try {
          const storedName = await AsyncStorage.getItem('first_name');
          const token = await AsyncStorage.getItem('userToken');
          const userRole = await AsyncStorage.getItem('userRole');
          if (token && storedName) {
            setIsLoggedIn(true);  // User is logged in
            setName(storedName);  // Set username for display
          } else {
            setIsLoggedIn(false);  // No user is logged in
          }
          if (userRole == 'admin'){
            setIsAdmin(true);
          }else if(userRole == 'manager'){
            setIsManager(true);
          }else{
            setIsAdmin(false);
            setIsManager(false);
          }
        } catch (error) {
          console.error('Error checking login status:', error);
        }
      };
  
      checkLoginStatus();
    }, [])  // The empty array ensures this only runs when the screen is focused
  );

  useEffect(() => {
    const loadFonts = async () => {
        await Font.loadAsync({
            'CherryBombOne': require('./../../assets/fonts/CherryBombOne-Regular.ttf'), // Adjust path as necessary
        });
    };

    loadFonts();
  }, []);

  useEffect(() => {
    // Retrieve the username from AsyncStorage when the component mounts
    const checkUserLogin = async () => {
      try {
        const storedName = await AsyncStorage.getItem('first_name');
        if (storedName) {
          setName(storedName); // If a username is found, set it in the state
        }
      } catch (error) {
        console.error('Error retrieving username:', error);
      }
    };

    checkUserLogin(); // Call the function when the component mounts
  }, []);

  // Logout function
  const handleLogout = async () => {
    try {
      // Send logout request to the backend
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/backend/auth/logout/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        // Clear AsyncStorage
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('first_name');
        await AsyncStorage.removeItem('userRole');
        
        setIsLoggedIn(false);
        setName(null);
        
        Alert.alert('Logout successful!');
      } else {
        Alert.alert('Logout failed, please try again.');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Logout failed, please try again later.');
    }
  };

  // Login button press
  const goToLoginPage = () => {
    navigation.navigate('Auth');  // Navigate to the login page
  };

  const goToAdminDash = () => {
    navigation.navigate('AdminDash');  // Navigate to the login page
  };

  const goToManDash = () => {
    navigation.navigate('ManagerDash');  // Navigate to the login page
  };

  // Generate drinks button press
  const generateDrinks = () => {
    console.log('generating drinks...');
    navigation.navigate('CreateDrink', {fromGenerateButton: true} );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/PinkBubbles.png')}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.hero}>
          <Text style={styles.logoText}>CodePop</Text>
          {name ? (
            <Text style={styles.greeting}>Welcome back, {name}</Text>
          ) : (
            <Text style={styles.greeting}>Craft your perfect drink.</Text>
          )}
          <Text style={styles.subtitle}>
            Smart recommendations, custom creations, and a smoother soda run.
          </Text>
        </View>

        <SeasonalCarousel style={styles.carousel} />

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={generateDrinks} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Generate drink with AI</Text>
          </TouchableOpacity>

          {isLoggedIn ? (
            <TouchableOpacity onPress={handleLogout} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Logout</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={goToLoginPage} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Sign in</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoggedIn && (isAdmin || isManager) && (
          <View style={styles.adminRow}>
            {isAdmin && (
              <TouchableOpacity onPress={goToAdminDash} style={styles.chipButton}>
                <Text style={styles.chipText}>Admin dashboard</Text>
              </TouchableOpacity>
            )}
            {isManager && (
              <TouchableOpacity onPress={goToManDash} style={styles.chipButton}>
                <Text style={styles.chipText}>Manager dashboard</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <NavBar />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  image: {
    width: '100%',
    height: '100%',
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 90,
  },
  hero: {
    width: '100%',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 36,
    color: '#f9fafb',
    fontFamily: 'CherryBombOne',
    letterSpacing: 1,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 20,
    color: '#e5e7eb',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  carousel: {
    width: '100%',
    marginBottom: 24,
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  primaryButtonText: {
    color: '#022c22',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  adminRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chipButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(37,99,235,0.9)',
  },
  chipText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default GeneralHomePage;
