import { useState } from 'react';
import { Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { BASE_URL } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// todo
  // test the removeAllDrinks function

export default function CheckoutForm(totalPrice) {
  const navigation = useNavigation();
  const [drinks, setDrinks] = useState([]);
  const [stripeNum, setStripeNum] = useState(null);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const fetchPaymentSheetParams = async () => {
     const token = await AsyncStorage.getItem('userToken');
     const response = await fetch(`${BASE_URL}/backend/create-payment-intent/`, {
       method: 'POST',
       headers: { 
         'Content-Type': 'application/json',
         'Authorization': `Token ${token}`,
       },
       body: JSON.stringify({ amount: totalPrice }), // amount in cents
     });
      const paymentResponse = await response.json();
      const { paymentIntent, ephemeralKey, customer } = paymentResponse.data || paymentResponse;
      setStripeNum(paymentIntent);
      return { paymentIntent, ephemeralKey, customer };
   };

  const initializePaymentSheet = async () => {
    const { paymentIntent, ephemeralKey, customer } = await fetchPaymentSheetParams();
    const { error } = await initPaymentSheet({
      merchantDisplayName: "Example, Inc.",
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      allowsDelayedPaymentMethods: true,
    });
    if (!error) setLoading(true);
    else Alert.alert("Error", error.message);
  };

  // function to remove all drinks from cart list after sucessful checkout
  const removeAllDrinks = async () => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const token = await AsyncStorage.getItem('userToken');
      
      const userId = await AsyncStorage.getItem('userId');
      
      console.log(currentList);

       const response = await fetch(`${BASE_URL}/backend/orders/`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Token ${token}`,
         },
         body: JSON.stringify({
           UserID: Number(userId),
           Drinks: currentList,
           OrderStatus: 'processing',
           PaymentStatus: 'paid',
           StripeID: stripeNum,
         })
       });

       // Check if the request was successful
       if (response.ok) {
         const responseData = await response.json(); // Parse JSON if returned
         const order = responseData.data || responseData;
         const orderNum = order.OrderID || order.orderId;
         console.log('Order Num:', orderNum);
         await AsyncStorage.setItem("orderNum", orderNum.toString());
       } else {
         console.error('Failed to create order:', response.status, await response.text());
       }

 
      // Update the local state to remove the drink from the cart page
      setDrinks(null);
  
      // Update the AsyncStorage to remove the drink ID from the checkout list
      await AsyncStorage.removeItem("checkoutList");
      

      console.log("cart cleared sucessfully");
      
    } catch (error) {
      console.error('Error removing drinks from cart:', error);
    }
  };

  const addRevenue = async () => {
    try {
      const orderNum = await AsyncStorage.getItem("orderNum");
    
       const token = await AsyncStorage.getItem('userToken');
       const response = await fetch(`${BASE_URL}/backend/revenues/`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Token ${token}`,
         },
          body: JSON.stringify({
            OrderID: Number(orderNum),
            TotalAmount: Number(totalPrice),
          }),
       });
    
      if (response.ok) {
        const data = await response.json(); // Parse the response if needed
        console.log("Revenue recorded successfully:", data);
      } else {
        const errorMessage = await response.text(); // Retrieve error details
        console.error("Failed to record revenue:", response.status, errorMessage);
      }
    } catch (error) {
      console.error("Error occurred while recording revenue:", error);
    }
  }

  const openPaymentSheet = async () => {
    const { error } = await presentPaymentSheet();
  
    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
     } else {
       Alert.alert('Success', 'Your order is confirmed!', [
         {
           text: 'OK',
           onPress: async () => {
              await removeAllDrinks();
              await addRevenue();
              const token = await AsyncStorage.getItem('userToken');
              const orderNum = await AsyncStorage.getItem('orderNum');
              const response = await fetch(`${BASE_URL}/backend/email/${orderNum}/`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Token ${token}`,
                },
              });
              navigation.navigate('PostCheckout');
           },
         },
       ]);
     }
  };

  return { initializePaymentSheet, openPaymentSheet, loading };
}