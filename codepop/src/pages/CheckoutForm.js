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
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentSheetReady, setPaymentSheetReady] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  // Generate UUID for order token (works for both guests and authenticated users)
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0,
          v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const fetchPaymentSheetParams = async (orderId) => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const headers = { 
          'Content-Type': 'application/json',
        };
        
        // Only add authorization header if token exists
        if (token) {
          headers['Authorization'] = `Token ${token}`;
        }

        const response = await fetch(`${BASE_URL}/backend/stripe/payment-sheet`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ amount: totalPrice, orderId }), // amount in dollars
        });

      const payload = await response.json();
      if (!response.ok) {
        console.log('Demo mode: payment intent unavailable, using fallback checkout.', payload);
        return null;
      }

      const { paymentIntent, ephemeralKey, customer, paymentIntentId } = payload;
      setStripePaymentIntentId(paymentIntentId);
      setClientSecret(paymentIntent);
      return { paymentIntent, ephemeralKey, customer, paymentIntentId };
    } catch (error) {
      console.log('Demo mode: payment intent request failed, using fallback checkout.', error);
      return null;
    }
  };

  const createPendingOrder = async () => {
    try {
      const existingOrderNum = await AsyncStorage.getItem("checkoutOrderNum");
      const existingTotal = await AsyncStorage.getItem("checkoutTotalPrice");
      if (existingOrderNum && existingTotal && Number(existingTotal) === Number(totalPrice)) {
        await AsyncStorage.setItem("orderNum", existingOrderNum.toString());
        return Number(existingOrderNum);
      }

      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];

      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('userToken');
      const selectedStoreId = await AsyncStorage.getItem('selectedStoreId') || '1';
      const orderToken = generateUUID();

      const drinkIds = currentList.map(drink => {
        if (typeof drink === 'object' && drink.drinkId) return drink.drinkId;
        return drink;
      });

      const response = await fetch(`${BASE_URL}/backend/orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Token ${token}` }),
        },
        body: JSON.stringify({
          storeId: parseInt(selectedStoreId),
          drinkIds,
          UserID: userId,
          orderToken,
          Drinks: drinkIds,
          OrderStatus: 'pending',
          PaymentStatus: 'pending',
          StripeID: null,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create pending order:', response.status, errorData);
        return null;
      }

      const data = await response.json();
      const createdOrderNum = data.OrderID || data.data?.orderId || data.data?.id;
      if (!createdOrderNum) return null;

      await AsyncStorage.setItem("orderNum", createdOrderNum.toString());
      await AsyncStorage.setItem("checkoutOrderNum", createdOrderNum.toString());
      await AsyncStorage.setItem("checkoutTotalPrice", String(Number(totalPrice)));
      await AsyncStorage.setItem("orderToken", orderToken);
      return createdOrderNum;
    } catch (err) {
      console.error("Error creating pending order:", err);
      return null;
    }
  };

  const initializePaymentSheet = async () => {
    if (!totalPrice || totalPrice <= 0) {
      setPaymentSheetReady(false);
      return;
    }

    // Create the order first (pending), then attach Stripe PI to that order.
    const orderId = await createPendingOrder();
    if (!orderId) {
      setPaymentSheetReady(false);
      setLoading(true);
      return;
    }

    const paymentParams = await fetchPaymentSheetParams(orderId);
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

    // function to remove all drinks from cart list after successful checkout
    const removeAllDrinks = async () => {
      try {
       // Update the local state to remove the drink from the cart page
       setDrinks(null);
   
       // Update the AsyncStorage to remove the drink ID from the checkout list and purchased drinks
       await AsyncStorage.removeItem("checkoutList");
       await AsyncStorage.removeItem("purchasedDrinks");
       

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
             orderId: Number(orderNum),
             amount: Number(totalPrice),
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
    // Order was created earlier during initializePaymentSheet; just clear cart now.
    const cleared = await removeAllDrinks();
    if (!cleared) return;

      await AsyncStorage.removeItem("checkoutOrderNum");
      await AsyncStorage.removeItem("checkoutTotalPrice");

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

  const confirmStripeAndUpdateOrder = async () => {
    try {
      const orderId = await AsyncStorage.getItem("orderNum");
      if (!orderId || !stripePaymentIntentId) return null;

      const token = await AsyncStorage.getItem('userToken');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Token ${token}`;

      const resp = await fetch(`${BASE_URL}/backend/stripe/confirm`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orderId: Number(orderId), paymentIntentId: stripePaymentIntentId }),
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        console.warn("Stripe confirm failed:", resp.status, e);
        return null;
      }
      return await resp.json();
    } catch (err) {
      console.warn("Stripe confirm error:", err);
      return null;
    }
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
      await confirmStripeAndUpdateOrder();
      await finalizeCheckout();
    }
  };

  return { initializePaymentSheet, openPaymentSheet, loading };
}