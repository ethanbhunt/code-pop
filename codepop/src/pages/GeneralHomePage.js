import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Font from 'expo-font';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../ip_address';
import NavBar from '../components/NavBar';
import SeasonalCarousel from '../components/SeasonalCarousel';

const GeneralHomePage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [name, setName] = useState(null);
  const [activeOrderNum, setActiveOrderNum] = useState(null);
  const navigation = useNavigation();

  // Check login status when the screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      const checkLoginStatus = async () => {
        try {
          const storedName = await AsyncStorage.getItem('first_name');
          const token = await AsyncStorage.getItem('userToken');
          const userRole = await AsyncStorage.getItem('userRole');
          const orderNum = await AsyncStorage.getItem('orderNum');
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
          setActiveOrderNum(orderNum);
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
    navigation.navigate('CreateDrink', { fromGenerateButton: true });
  }

  const goToTrackOrder = () => {
    if (!activeOrderNum) {
      Alert.alert('No active order yet', 'Place an order first, then track your progress in real time.');
      return;
    }
    navigation.navigate('PostCheckout');
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/PinkBubbles.png')}
        style={styles.image}
        resizeMode="cover"
      />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>CodePop AI</Text>
          <Text style={styles.heroTitle}>Build your next drink from a prompt</Text>
          <Text style={styles.heroDescription}>
            Describe your mood and let the AI generate a custom soda blend with ingredients, size, and ice presets.
          </Text>
          <TouchableOpacity onPress={generateDrinks} style={styles.primaryAction}>
            <Icon name="sparkles" size={20} color="#fff" />
            <Text style={styles.primaryActionText}>Start AI Drink Builder</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionCard} onPress={goToTrackOrder}>
            <Icon name="locate" size={22} color="#0e5f8a" />
            <Text style={styles.quickActionTitle}>Track Order</Text>
            <Text style={styles.quickActionBody}>
              {activeOrderNum ? `Order #${activeOrderNum}` : 'No active order'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Cart')}>
            <Icon name="cart" size={22} color="#0e5f8a" />
            <Text style={styles.quickActionTitle}>Cart</Text>
            <Text style={styles.quickActionBody}>Review drinks before checkout</Text>
          </TouchableOpacity>
        </View>

        {isLoggedIn ? (
          <View style={styles.accountCard}>
            {name ? <Text style={styles.greeting}>Welcome back, {name}</Text> : null}
            <TouchableOpacity onPress={handleLogout} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Logout</Text>
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity onPress={goToAdminDash} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Admin Dashboard</Text>
              </TouchableOpacity>
            )}
            {isManager && (
              <TouchableOpacity onPress={goToManDash} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Manager Dashboard</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.accountCard}>
            <Text style={styles.greeting}>Sign in to save preferences and reorder faster.</Text>
            <TouchableOpacity onPress={goToLoginPage} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.carouselShell}>
          <Text style={styles.carouselTitle}>Seasonal favorites</Text>
          <SeasonalCarousel style={styles.carousel} />
        </View>
        <NavBar />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '150%',
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#fffaf5',
    zIndex: 2,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 120,
  },
  heroCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(19, 41, 61, 0.9)',
    padding: 18,
    shadowColor: '#0f2538',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  heroEyebrow: {
    color: '#89d6ff',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroDescription: {
    color: '#d8efff',
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryAction: {
    marginTop: 16,
    backgroundColor: '#ff6a3d',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    marginLeft: 8,
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  quickActionsRow: {
    width: '100%',
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d6e8f5',
  },
  quickActionTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#1b2f45',
  },
  quickActionBody: {
    marginTop: 4,
    fontSize: 13,
    color: '#47627d',
    fontWeight: '600',
  },
  accountCard: {
    width: '100%',
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 245, 237, 0.96)',
    padding: 14,
    borderWidth: 1,
    borderColor: '#ffd8c9',
  },
  greeting: {
    fontSize: 16,
    color: '#1b2f45',
    fontWeight: '700',
    marginBottom: 8,
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0e5f8a',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  carouselShell: {
    width: '100%',
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingBottom: 8,
  },
  carousel: {
    margin: 0,
    padding: 0,
  },
  carouselTitle: {
    paddingTop: 14,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#1b2f45',
  },
});

export default GeneralHomePage;
