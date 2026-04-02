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
import ComplaintsPage from './src/pages/ComplaintsPage';
import CompletePage from './src/pages/CompletePage';
import CreateAccountPage from './src/pages/CreateAccountPage';
import CreateDrinkPage from './src/pages/CreateDrinkPage';
import GeneralHomePage from './src/pages/GeneralHomePage';
import ManagerDash from './src/pages/ManagerDash';
import PaymentPage from './src/pages/PaymentPage';
import PostCheckout from './src/pages/PostCheckout';
import PreferencesPage from './src/pages/PreferencesPage';
import UpdateDrink from './src/pages/UpdateDrink';
import { BASE_URL } from './ip_address';

const Stack = createNativeStackNavigator();
const title = 'CodePop' 


const App = () => {
  const [initialRoute, setInitialRoute] = React.useState(null);

  // initialize cart list 
  const initCart = async () => {
    try{
      const checkoutList = await AsyncStorage.getItem('checkoutList')
      if (checkoutList === null){
        const initialList = [];
        await AsyncStorage.setItem("checkoutList", JSON.stringify(initialList));
      }
    }catch(error){
      console.error("error with initializing cart list", error);
    }
  };

  // Check authentication status on app start
  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setInitialRoute('Auth');
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
          // Token is valid
          setInitialRoute('GeneralHome');
        } else {
          // Token is invalid or expired
          console.warn('Token validation failed. Clearing and redirecting to login.');
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userId');
          await AsyncStorage.removeItem('first_name');
          await AsyncStorage.removeItem('userRole');
          setInitialRoute('Auth');
        }
      } catch (error) {
        console.error('Error validating token:', error);
        // Clear invalid token and redirect to login
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('first_name');
        await AsyncStorage.removeItem('userRole');
        setInitialRoute('Auth');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setInitialRoute('Auth');
    }
  };
  
  useEffect(() => {
    initCart();
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
        initialRouteName="GeneralHome"
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
        <Stack.Screen name="GeneralHome" component={GeneralHomePage} />
        <Stack.Screen name="payment" component={PaymentPage} />
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
