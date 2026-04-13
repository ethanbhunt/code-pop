import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Font from 'expo-font';
import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Text, Alert, View, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AdminDash from './src/pages/AdminDash';
import AuthPage from './src/pages/AuthPage';
import CartPage from './src/pages/CartPage';
import CheckoutForm from './src/pages/CheckoutForm';
import CheckoutSuccessPage from './src/pages/CheckoutSuccessPage';
import ComplaintsPage from './src/pages/ComplaintsPage';
import CompletePage from './src/pages/CompletePage';
import CreateAccountPage from './src/pages/CreateAccountPage';
import CreateDrinkPage from './src/pages/CreateDrinkPage';
import GeneralHomePage from './src/pages/GeneralHomePage';
import ManagerDash from './src/pages/ManagerDash';
import PostCheckout from './src/pages/PostCheckout';
import PreferencesPage from './src/pages/PreferencesPage';
import StoreSelectPage from './src/pages/StoreSelectPage';
import UpdateDrink from './src/pages/UpdateDrink';
import { BASE_URL, initializeBaseURL, setStoreAndUpdateURL } from './ip_address';

const Stack = createNativeStackNavigator();
const title = 'CodePop' 


const App = () => {
  const [initialRoute, setInitialRoute] = React.useState(null);

  // initialize cart list 
  const initCart = async () => {
    try{
      // Always start with empty cart on app startup
      const initialList = [];
      await AsyncStorage.setItem("checkoutList", JSON.stringify(initialList));
      // Also clear purchased drinks from previous sessions
      await AsyncStorage.removeItem("purchasedDrinks");
      // Note: Store selection (selectedStoreId, selectedStoreName) persists between sessions
      // User can change it anytime they create/order a drink
    }catch(error){
      console.error("error with initializing cart list", error);
    }
  };

  // Check authentication status on app start
  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const selectedStoreId = await AsyncStorage.getItem('selectedStoreId');
      
      // If no store selected, go to store selection first (for everyone)
      if (!selectedStoreId) {
        console.log('[AUTH] No store selected, redirecting to StoreSelect');
        setInitialRoute('StoreSelect');
        return;
      }

      if (!token) {
        // No token = guest mode, go to GeneralHome as guest
        console.log('[AUTH] No token, entering guest mode');
        setInitialRoute('GeneralHome');
        return;
      }

      // Validate token by making a test API call with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${BASE_URL}/backend/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Token is valid and store selected
          setInitialRoute('GeneralHome');
        } else {
          // Token is invalid or expired - clear it and enter guest mode
          console.warn('Token validation failed. Clearing and entering guest mode.');
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userId');
          await AsyncStorage.removeItem('first_name');
          await AsyncStorage.removeItem('userRole');
          setInitialRoute('GeneralHome');
        }
      } catch (error) {
        console.error('Error validating token:', error);
        // Clear invalid token and enter guest mode (instead of redirecting to login)
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('first_name');
        await AsyncStorage.removeItem('userRole');
        setInitialRoute('GeneralHome');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setInitialRoute('Auth');
    }
  };
  
  useEffect(() => {
    // Initialize BASE_URL for store-aware peer selection
    initializeBaseURL();
    
    // Initialize cart
    initCart();
    
    // Check authentication status
    checkAuthStatus();
  }, []);
  useEffect(() => {
    const loadFonts = async () => {
        await Font.loadAsync({
            'CherryBombOne': require('./assets/fonts/CherryBombOne-Regular.ttf'), // Adjust path as necessary
        });
    };

    loadFonts();
  }, []);

  // Don't render navigation until initial route is determined
  if (initialRoute === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D30C7B" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#1c334d',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 22,
          },
          headerShadowVisible: false,
          headerBackVisible: false,
          contentStyle: { backgroundColor: '#ffffff' },
          animation: 'none',
          headerRight: () => <ProfileButton />,
          title: title,
        }}
      >
        <Stack.Screen name="Auth" component={AuthPage} />
        <Stack.Screen name="CreateAccount" component={CreateAccountPage} />
        <Stack.Screen name="Cart" component={CartPage} />
        <Stack.Screen name="CreateDrink" component={CreateDrinkPage} />
        <Stack.Screen name="ComplaintsPage" component={ComplaintsPage} />
        <Stack.Screen name="Preferences" component={PreferencesPage} />
        <Stack.Screen name="StoreSelect" component={StoreSelectPage} />
        <Stack.Screen name="GeneralHome" component={GeneralHomePage} />
        <Stack.Screen name="UpdateDrink" component={UpdateDrink} />
        <Stack.Screen
          name="ManagerDash"
          component={ManagerDash}
          options={{ headerRight: () => (<LogoutButton />) }}
        />
        <Stack.Screen
          name="AdminDash"
          component={AdminDash}
          options={{ headerRight: () => (<LogoutButton />) }}
        />
        <Stack.Screen name="Complete" component={CompletePage} />
        <Stack.Screen name="Checkout" component={CheckoutForm} />
        <Stack.Screen name="CheckoutSuccessPage" component={CheckoutSuccessPage} />
        <Stack.Screen name="PostCheckout" component={PostCheckout} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const ProfileButton = () => {
  const navigation = useNavigation(); // Use navigation hook

  return (
    <TouchableOpacity onPress={() => navigation.navigate('Preferences')}>
      <Icon name="person-circle-outline" size={30} color="#1c334d" />
    </TouchableOpacity>
    
  );
};

const LogoutButton = () => {
  const navigation = useNavigation();

  return(
    <TouchableOpacity onPress={() => (handleLogout(navigation))} style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#1F7A8C', borderRadius: 15 }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>Logout</Text>
    </TouchableOpacity>
  );
}

// Logout function
const handleLogout = async (navigation) => {
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
      
      // Show the alert and navigate after dismiss
      Alert.alert(
        'Logout successful!',
        '',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('GeneralHome'),
          },
        ],
        { cancelable: false }
      );
    } else {
      Alert.alert('Logout failed, please try again.');
    }
  } catch (error) {
    console.error('Error during logout:', error);
    Alert.alert('Logout failed, please try again later.');
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#D30C7B',
  },
});

export default App;
