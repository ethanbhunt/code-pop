import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import NavBar from '../components/NavBar';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import CheckoutForm from './CheckoutForm';
import { BASE_URL } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ingredientList } from '../utils/drinkCart';

const CartPage = () => {
  const navigation = useNavigation();
  const [drinks, setDrinks] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const { initializePaymentSheet, openPaymentSheet } = CheckoutForm(totalPrice);

  useFocusEffect(React.useCallback(() => {
    fetchDrinks();
    initializePaymentSheet();
  }, []));

  useEffect(() => {
    initializePaymentSheet();
  }, [totalPrice]);

  const normalizeDrink = (rawDrink) => {
    if (!rawDrink) return null;
    const sodaRaw = rawDrink.sodaUsed ?? rawDrink.SodaUsed ?? rawDrink.sodas;
    return {
      drinkId: rawDrink.drinkId ?? rawDrink.DrinkID,
      size: rawDrink.size ?? rawDrink.Size,
      sodaUsed: ingredientList(sodaRaw),
      syrupsUsed: ingredientList(rawDrink.syrupsUsed ?? rawDrink.SyrupsUsed ?? rawDrink.syrups),
      addIns: ingredientList(rawDrink.addIns ?? rawDrink.AddIns),
      ice: rawDrink.ice ?? rawDrink.Ice,
      price: rawDrink.price ?? rawDrink.Price,
    };
  };

  const fetchDrinks = async () => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const token = await AsyncStorage.getItem('userToken');

      const fetchedDrinks = [];
       for (let i = 0; i < currentList.length; i++) {
          const getHeaders = { 'Content-Type': 'application/json' };
          if (token) {
            getHeaders.Authorization = `Token ${token}`;
          }
          const response = await fetch(`${BASE_URL}/backend/drinks/${currentList[i]}/`, {
            method: 'GET',
            headers: getHeaders,
          });
          const responseData = await response.json();
          const drink = normalizeDrink(responseData.data || responseData);
          if (
            drink != null &&
            drink.size &&
            drink.sodaUsed.length > 0 &&
            drink.ice != null &&
            String(drink.ice).trim() !== ''
          ) {
            fetchedDrinks.push(drink);
          }
       }
      
      setDrinks(fetchedDrinks);
      calculateTotalPrice(fetchedDrinks);
      await AsyncStorage.setItem('purchasedDrinks', JSON.stringify(fetchedDrinks));
  
    } catch (error) {
      console.error('Failed to get drinks: ', error);
    }
  };
  
  

  const calculatePrice = (drink) => {
    if (drink.price == 2) {
      return 2 + (drink.syrupsUsed.length + drink.addIns.length) * 0.3;
    }
    return drink.price;
  };


  const calculateTotalPrice = (drinksList) => {
    let total = 0;
    for (let i = 0; i < drinksList.length; i++) {
      total += calculatePrice(drinksList[i]);
    }
    setTotalPrice(total);
  };

  const removeDrink = async (drinkId) => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const token = await AsyncStorage.getItem('userToken');
  
      if (drinkId > 6 && token) {
        await fetch(`${BASE_URL}/backend/drinks/${drinkId}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        });
      }
  
      const updatedDrinks = drinks.filter((data) => data.drinkId !== drinkId);
      setDrinks(updatedDrinks);
      const updatedList = currentList.filter((item) => item !== drinkId);
      await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));
      await AsyncStorage.setItem('purchasedDrinks', JSON.stringify(updatedDrinks));
      calculateTotalPrice(updatedDrinks);
    } catch (error) {
      console.error('Error removing drink:', error);
    }
  };
  
  

  const renderDrinkItem = (drink) => (
    <View style={styles.drinkContainer}>
      <Text style={styles.drinkTitle}>{drink.size} Drink</Text>
      <Text style={styles.drinkDetail}>Soda: {drink.sodaUsed.join(', ')}</Text>
      <Text style={styles.drinkDetail}>Ice: {drink.ice}</Text>
      {drink.syrupsUsed.length > 0 && (
        <Text style={styles.drinkDetail}>Syrups: {drink.syrupsUsed.join(', ')}</Text>
      )}
      {drink.addIns.length > 0 && (
        <Text style={styles.drinkDetail}>Add-ins: {drink.addIns.join(', ')}</Text>
      )}
      <Text style={styles.priceText}>${calculatePrice(drink).toFixed(2)}</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => navigation.navigate('UpdateDrink', { drink })} style={styles.iconButton}>
          <Icon name="create-outline" size={20} color="#1F7A8C" />
          <Text style={styles.iconButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => removeDrink(drink.drinkId)} style={styles.iconButton}>
          <Icon name="close-circle-outline" size={20} color="#c0392b" />
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
             keyExtractor={(item) => item.drinkId ? item.drinkId.toString() : Math.random().toString()}
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
    backgroundColor: '#ffffff',
  },
  padding: {
    paddingHorizontal: 12,
  },
  headerText: {
    fontSize: 27,
    fontWeight: '800',
    color: '#1c334d',
    marginBottom: 4,
    textAlign: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  drinkContainer: {
    backgroundColor: '#ffffff',
    padding: 14,
    marginVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1E5F2',
  },
  drinkTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c334d',
    marginBottom: 4,
  },
  drinkDetail: {
    fontSize: 13,
    fontWeight: '600',
    color: '#49627d',
    marginBottom: 3,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1c334d',
    marginTop: 6,
  },
  emptyCartText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#49627d',
    fontWeight: '600',
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 16,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#E1E5F2',
  },
  iconButtonText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#1F7A8C',
  },
  removeButtonText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#c0392b',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#022B3A',
    color: '#fff',
    overflow: 'hidden',
  },
  payButton: {
    backgroundColor: '#1F7A8C',
    paddingVertical: 14,
    marginBottom: 120,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 10,
  },
});
export default CartPage;

