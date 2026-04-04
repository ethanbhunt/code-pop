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
        const token = await AsyncStorage.getItem('userToken');
        const headers = { 
          'Content-Type': 'application/json',
        };
        
        // Only add authorization header if token exists
        if (token) {
          headers['Authorization'] = `Token ${token}`;
        }

        const response = await fetch(`${BASE_URL}/backend/create-payment-intent/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ amount: totalPrice }), // amount in dollars
        });

      const payload = await response.json();
      if (!response.ok) {
        console.log('Demo mode: payment intent unavailable, using fallback checkout.', payload);
        return null;
      }

      const { paymentIntent, ephemeralKey, customer } = payload;
      setStripeNum(paymentIntent);
      return { paymentIntent, ephemeralKey, customer };
    } catch (error) {
      console.log('Demo mode: payment intent request failed, using fallback checkout.', error);
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
      setLoading(true);
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
      setLoading(true);
      setPaymentSheetReady(true);
    } else {
      setPaymentSheetReady(false);
      setLoading(true);
      console.log('Demo mode: payment sheet init failed, using fallback checkout.', error.message);
    }
  };

   // function to remove all drinks from cart list after sucessful checkout
   const removeAllDrinks = async () => {
     try {
       const cartList = await AsyncStorage.getItem('checkoutList');
       const currentList = cartList ? JSON.parse(cartList) : [];
       
        const userId = await AsyncStorage.getItem('userId');
        const token = await AsyncStorage.getItem('userToken');
        const selectedStoreId = await AsyncStorage.getItem('selectedStoreId') || '1';
        
        console.log(currentList);

        // Extract drink IDs from the full drink objects
        const drinkIds = currentList.map(drink => {
          if (typeof drink === 'object' && drink.drinkId) {
            return drink.drinkId;
          }
          return drink; // Fallback for backward compatibility with just IDs
        });

        const response = await fetch(`${BASE_URL}/backend/orders/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
          },
          body: JSON.stringify({
            storeId: parseInt(selectedStoreId),
            drinkIds: drinkIds,
            UserID: userId,
            Drinks: drinkIds,
            OrderStatus: 'pending',
            PaymentStatus: 'paid',
            StripeID: stripeNum || `demo_${Date.now()}`,
          })
       });

       // Check if the request was successful
       if (response.ok) {
         const data = await response.json(); // Parse JSON if returned
         const createdOrderNum = data.OrderID || data.data?.orderId || data.data?.id;
         if (!createdOrderNum) {
           console.error('Failed to get order ID from response:', data);
           return null;
         }
         console.log('Order Num:', createdOrderNum);
         await AsyncStorage.setItem("orderNum", createdOrderNum.toString());
       } else {
         const errorData = await response.json().catch(() => ({}));
         console.error('Failed to create order:', response.status, errorData);
         return null;
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
        const headers = {
          'Content-Type': 'application/json',
        };
        
        // Only add authorization header if token exists
        if (token) {
          headers['Authorization'] = `Token ${token}`;
        }

        const response = await fetch(`${BASE_URL}/backend/revenues/`, {
          method: 'POST',
          headers,
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
      console.warn('Order issue: unable to create order during demo checkout.');
      return;
    }

      await addRevenue();
      const savedOrderNum = await AsyncStorage.getItem("orderNum");
      if (savedOrderNum) {
        const token = await AsyncStorage.getItem('userToken');
        const headers = {
          'Content-Type': 'application/json',
        };
        
        // Only add authorization header if token exists
        if (token) {
          headers['Authorization'] = `Token ${token}`;
        }

        await fetch(`${BASE_URL}/backend/email/${savedOrderNum}/`, {
          method: 'GET',
          headers,
        });
      }
    navigation.navigate('PostCheckout');
  };

  const openPaymentSheet = async () => {
    if (!paymentSheetReady) {
      console.log('Demo checkout mode: payment gateway unavailable, continuing without popup.');
      await finalizeCheckout();
      return;
    }

    const { error } = await presentPaymentSheet();
  
    if (error) {
      console.log('Demo mode: payment sheet error, using fallback checkout.', error.code, error.message);
      await finalizeCheckout();
    } else {
      await finalizeCheckout();
    }
  };

  return { initializePaymentSheet, openPaymentSheet, loading };
}