import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import NavBar from '../components/NavBar';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect, NavigationContainer } from '@react-navigation/native';
import { useStripe, StripeProvider } from '@stripe/stripe-react-native';
import CheckoutForm from './CheckoutForm';
import {BASE_URL} from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';

// to do:
// fix wording for drinks in the cart - "none ice" doesn't make sense

const CartPage = () => {
  const navigation = useNavigation();
  const [drinks, setDrinks] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const { initializePaymentSheet, openPaymentSheet, loading } = CheckoutForm(totalPrice);

  useFocusEffect(React.useCallback(() => {
    fetchDrinks();
    initializePaymentSheet();
  }, []));

  useEffect(() => {
    initializePaymentSheet(); // Initialize payment sheet on page load
  }, [totalPrice]);

  const fetchDrinks = async () => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const token = await AsyncStorage.getItem('userToken');

      // Save drinks to a separate AsyncStorage list before removing - so the user can rate them on the post checkout page
      // await AsyncStorage.setItem("purchasedDrinks", JSON.stringify(currentList));

      const fetchedDrinks = [];
      for (let i = 0; i < currentList.length; i++) {
        const response = await fetch(`${BASE_URL}/backend/drinks/${currentList[i]}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (data != null && data.Size && data.SodaUsed && data.Ice) {
          fetchedDrinks.push(data); // Add each drink to the temporary array
        }
      }
      
      setDrinks(fetchedDrinks); // Update state once after all drinks are collected
      calculateTotalPrice(fetchedDrinks); // Calculate total price after fetching drinks

      // Store the full drink objects in `purchasedDrinks` instead of IDs
      await AsyncStorage.setItem("purchasedDrinks", JSON.stringify(fetchedDrinks));
  
    } catch (error) {
      console.error('Failed to get drinks: ', error);
    }
  };
  
  

  const calculatePrice = (drink) => {
    // $2 base price + $0.30 per ingredient
    if (drink.Price == 2) {
      const syrupsCount = Array.isArray(drink.SyrupsUsed) ? drink.SyrupsUsed.length : 0;
      const addInsCount = Array.isArray(drink.AddIns) ? drink.AddIns.length : 0;
      return 2 + (syrupsCount + addInsCount) * 0.3;
      // return 2 + (drink.SyrupsUsed.length + drink.AddIns.length) * 0.3;
    } else {
      // Carousel drink prices
      return drink.Price;
    }

  };


  const calculateTotalPrice = (drinksList) => {
    let total = 0; // Initialize total here

    for (let i = 0; i < drinksList.length; i++) {
      total += calculatePrice(drinksList[i]);      
    }
    setTotalPrice(total); // Update the total price state
  };

  const removeDrink = async (drinkId) => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const token = await AsyncStorage.getItem('userToken');
  
      // Don't delete seasonal carousel items (items prepopulated in the database after running clean script)
      if (drinkId > 6) {
        // Delete the drink from the backend database
        await fetch(`${BASE_URL}/backend/drinks/${drinkId}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
          },
        });
        // // Delete the drink from the backend database
        // await fetch(`${BASE_URL}/backend/drinks/${drinkId}/`, {
        //   method: 'DELETE',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        // });
      }
  
      // Update the local state to remove the drink from the cart page
      const updatedDrinks = drinks.filter(data => data.DrinkID !== drinkId);
      setDrinks(updatedDrinks);
  
      // Update the AsyncStorage to remove the drink ID from the checkout list
      const updatedList = currentList.filter(item => item !== drinkId);
      await AsyncStorage.setItem("checkoutList", JSON.stringify(updatedList));
      // also update the rating list
      await AsyncStorage.setItem("purchasedDrinks", JSON.stringify(updatedDrinks));
  
      // Recalculate the total price with the updated drinks list
      calculateTotalPrice(updatedDrinks);
  
      console.log('Drink removed and total price recalculated successfully');
    } catch (error) {
      console.error('Error removing drink:', error);
    }
  };
  
  

  const renderDrinkItem = (drink) => (
    <View style={styles.drinkContainer}>
      <Text style={styles.drinkText}>{drink.Size} Drink: {drink.SodaUsed.join(', ')} with {drink.Ice} Ice</Text>
      <Text style={styles.ingredientsText}>
        Syrups: {drink.SyrupsUsed ? drink.SyrupsUsed.join(', ') : ''}{'\n\n'}
        Add Ins: {drink.AddIns ? drink.AddIns.join(', ') : ''}
      </Text>
      <Text style={styles.priceText}>Price: ${calculatePrice(drink).toFixed(2)}</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => navigation.navigate('UpdateDrink', { drink })} style={styles.button}>
          <Icon name="create-outline" size={24} color="#000" />
        </TouchableOpacity>
  
        <TouchableOpacity onPress={() => removeDrink(drink.DrinkID)} style={styles.button}>
          <Icon name="close-circle-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const goToCheckout = () => {
    navigation.navigate('Checkout');
  };
  

  return (
    <StripeProvider publishableKey="pk_test_51QEDP7HwEWxwIyaLoeRGprLwnn6Fj7jZljzxglWudPSTSe6sMyFPAjHZsnMOy1HuwZhUYT9JGZbOsxhXxkFTJp9700JSZTZKIz">
        <View style={styles.container}>
        <Text style={styles.headerText}>Your Drinks</Text>

        {Array.isArray(drinks) && drinks.length === 0 ? (
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
          
        ) : (
          <FlatList
            style={styles.padding}
            data={drinks}
            keyExtractor={(item) => item.DrinkID ? item.DrinkID.toString() : Math.random().toString()}
            renderItem={({ item }) => renderDrinkItem(item)}
            contentContainerStyle={styles.listContainer}
          />
        )}


        <View style={styles.padding}>

          <Text style={styles.totalText}>Cart Total: ${totalPrice.toFixed(2)}</Text>

          <TouchableOpacity onPress={openPaymentSheet} style={styles.payButton}>
            <Icon name="card-outline" size={24} color="#fff" />
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </View>

        <NavBar />
        </View>
    </StripeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  padding: {
    padding: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 4,
    textAlign: 'center',
    padding: 16,
  },
  drinkContainer: {
    backgroundColor: 'rgba(15,23,42,0.96)',
    padding: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(31,41,55,0.9)',
  },
  drinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  ingredientsText: {
    fontSize: 13,
    marginTop: 6,
    color: '#9ca3af',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    color: '#f9fafb',
  },
  emptyCartText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    padding: 10,
  },
  totalText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    color: '#022c22',
  },
  payButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 80,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#022c22',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
});

export default CartPage;
