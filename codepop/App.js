import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Font from 'expo-font';
import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Text, Alert} from 'react-native';
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
import MaintenancePage from './src/pages/MaintenancePage';
import ManagerDash from './src/pages/ManagerDash';
import PaymentPage from './src/pages/PaymentPage';
import PostCheckout from './src/pages/PostCheckout';
import PreferencesPage from './src/pages/PreferencesPage';
import StoresPage from './src/pages/StoresPage';
import UpdateDrink from './src/pages/UpdateDrink';
import { BASE_URL } from './ip_address';

const Stack = createNativeStackNavigator();
const title = 'CodePop' 


const App = () => {
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
  
  useEffect(() => {
    initCart()
  }, []);
  useEffect(() => {
    const loadFonts = async () => {
        await Font.loadAsync({
            'CherryBombOne': require('./assets/fonts/CherryBombOne-Regular.ttf'), // Adjust path as necessary
        });
    };

    loadFonts();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="GeneralHome" screenOptions={{headerStyle: {backgroundColor: '#c8c8ee'}}}>
        <Stack.Screen 
          name="Auth" 
          component={AuthPage} 
          options={{ 
            title: title, 
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
          },}}
        />
        <Stack.Screen
          name="CreateAccount"
          component={CreateAccountPage}
          options={{ 
            title: title,
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
          },}}
        />
        <Stack.Screen
          name="Cart"
          component={CartPage}
          options={{ 
            title: title, 
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
          },}}        
        />
        <Stack.Screen
          name="CreateDrink"
          component={CreateDrinkPage}
          options={{ 
            title: title, 
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
          },}}  
                
        />
        <Stack.Screen
          name="ComplaintsPage"
          component={ComplaintsPage}
          options={{ title: 'ComplaintsPage' }}
        />
        <Stack.Screen
          name="Preferences"
          component={PreferencesPage}
          options={{ 
            title: title, 
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
            },}}        
        />
        <Stack.Screen name="Stores" component={StoresPage} options={{ title: 'Stores' }} />
        <Stack.Screen
          name="GeneralHome"
          component={GeneralHomePage}
          options={{ 
            title: title, 
            headerTitleStyle: {
              // fontFamily: 'CherryBombOne',
            },
            headerRight: () => (
              <ProfileButton />
            ),}}
        />
        <Stack.Screen
          name="payment"
          component={PaymentPage}
          options={{ title: 'Payment' }}
        />
        <Stack.Screen
          name="UpdateDrink"
          component={UpdateDrink}
          options={{ title: 'UpdateDrink' }}
        />
        <Stack.Screen
          name="ManagerDash"
          component={ManagerDash}
          options={{ title: 'ManagerDash', headerRight: () => (<LogoutButton />) }}
        />
        <Stack.Screen name="Maintenance" component={MaintenancePage} options={{ title: 'Machines & Maintenance' }} />
        <Stack.Screen
          name="AdminDash"
          component={AdminDash}
          options={{ title: 'AdminDash', headerRight: () => (<LogoutButton />) }}
        />
        <Stack.Screen
          name="Complete"
          component={CompletePage}
          options={{ title: 'Complete' }}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutForm}
          options={{ title: 'Checkout Form' }}
        />
        <Stack.Screen
          name="PostCheckout"
          component={PostCheckout}
          options={{ title: 'PostCheckout' , headerBackVisible: false,}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const ProfileButton = () => {
  const navigation = useNavigation(); // Use navigation hook

  return (
    <TouchableOpacity onPress={() => navigation.navigate('Preferences')}>
      <Icon name="person-circle-outline" size={30} color="#000" />
    </TouchableOpacity>
    
  );
};

const LogoutButton = () => {
  const navigation = useNavigation();
  const styles = StyleSheet.create({
    mediumButton: {
      margin: 10,
      padding: 15,
      backgroundColor: '#D30C7B',
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
      color: 'white',
    },
  });

  return(
    <TouchableOpacity onPress={() => (handleLogout(navigation))} style={styles.mediumButton}>
      <Text style={styles.buttonText}>Logout</Text>
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

export default App;
