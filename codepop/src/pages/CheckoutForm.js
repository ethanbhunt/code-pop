import { useState } from 'react';
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
  const [paymentSheetReady, setPaymentSheetReady] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const fetchPaymentSheetParams = async () => {
    try {
      const response = await fetch(`${BASE_URL}/backend/create-payment-intent/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalPrice }), // amount in dollars
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to initialize payment sheet.');
      }

      const { paymentIntent, ephemeralKey, customer } = payload;
      setStripeNum(paymentIntent);
      return { paymentIntent, ephemeralKey, customer };
    } catch (error) {
      console.error('Failed to fetch payment sheet parameters:', error);
      return null;
    }
  };

  const initializePaymentSheet = async () => {
    if (!totalPrice || totalPrice <= 0) {
      setPaymentSheetReady(false);
      return;
    }

    const paymentParams = await fetchPaymentSheetParams();
    if (!paymentParams) {
      setPaymentSheetReady(false);
      setLoading(false);
      return;
    }

    const { paymentIntent, ephemeralKey, customer } = paymentParams;
    if (!paymentIntent || !ephemeralKey || !customer) {
      setPaymentSheetReady(false);
      setLoading(true);
      return;
    }

    const { error } = await initPaymentSheet({
      merchantDisplayName: "Example, Inc.",
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      allowsDelayedPaymentMethods: true,
    });
    if (!error) {
      setLoading(false);
      setPaymentSheetReady(true);
    } else {
      setPaymentSheetReady(false);
      setLoading(false);
      console.error('Payment sheet initialization failed:', error.message);
    }
  };

  // function to remove all drinks from cart list after sucessful checkout
  const removeAllDrinks = async () => {
    try {
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      
      const userId = await AsyncStorage.getItem('userId');

      if (!stripeNum) {
        throw new Error('Payment intent is missing.');
      }

      const response = await fetch(`${BASE_URL}/backend/orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          UserID: userId,
          Drinks: currentList,
          OrderStatus: 'pending',
          PaymentStatus: 'paid',
          StripeID: stripeNum,
        })
      });

      // Check if the request was successful
      if (response.ok) {
        const data = await response.json(); // Parse JSON if returned
        const createdOrderNum = data.OrderID;
        console.log('Order Num:', createdOrderNum);
        await AsyncStorage.setItem("orderNum", createdOrderNum.toString());
      } else {
        console.error('Failed to create order:', response.status, await response.text());
        throw new Error('Failed to create order.');
      }

 
      // Update the local state to remove the drink from the cart page
      setDrinks(null);
  
      // Update the AsyncStorage to remove the drink ID from the checkout list
      await AsyncStorage.removeItem("checkoutList");
      

      console.log("cart cleared sucessfully");
      return true;
      
    } catch (error) {
      console.error('Error removing drinks from cart:', error);
      return null;
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

  const finalizeCheckout = async () => {
    const orderCreated = await removeAllDrinks();
    if (!orderCreated) {
      return;
    }

    await addRevenue();
    const savedOrderNum = await AsyncStorage.getItem("orderNum");
    if (savedOrderNum) {
      await fetch(`${BASE_URL}/backend/email/${savedOrderNum}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    navigation.navigate('PostCheckout');
  };

  const openPaymentSheet = async () => {
    if (!paymentSheetReady) {
      console.error('Payment sheet is not ready. Checkout cannot continue.');
      return;
    }

    const { error } = await presentPaymentSheet();
  
    if (error) {
      console.error('Payment sheet presentation failed:', error.code, error.message);
      return;
    }

    await finalizeCheckout();
  };

  return { initializePaymentSheet, openPaymentSheet, loading };
}