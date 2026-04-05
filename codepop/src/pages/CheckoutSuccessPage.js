import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../ip_address';
import NavBar from '../components/NavBar';

const CheckoutSuccessPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [orderNum, setOrderNum] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [storeName, setStoreName] = useState('Your Store');

  // Auto-navigate to PostCheckout after 10 seconds if user doesn't click
  useEffect(() => {
    const timeout = setTimeout(() => {
      handleTrackOrder();
    }, 10000);

    return () => clearTimeout(timeout);
  }, [orderNum]);

  useEffect(() => {
    const loadOrderData = async () => {
      try {
        const savedOrderNum = await AsyncStorage.getItem('orderNum');
        if (savedOrderNum) {
          setOrderNum(savedOrderNum);

          // Fetch order details to show in confirmation
          const token = await AsyncStorage.getItem('userToken');
          if (token) {
            const response = await fetch(`${BASE_URL}/backend/orders/${savedOrderNum}/`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              setOrderData(data);

              // Calculate estimated pickup time (15 minutes from now)
              const now = new Date();
              const estimated = new Date(now.getTime() + 15 * 60000);
              const hours = String(estimated.getHours()).padStart(2, '0');
              const minutes = String(estimated.getMinutes()).padStart(2, '0');
              setEstimatedTime(`${hours}:${minutes}`);
            }
          }
        }

        // Get store name
        const storeId = await AsyncStorage.getItem('storeId');
        if (storeId) {
          setStoreName(`Store #${storeId}`);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading order data:', error);
        setLoading(false);
      }
    };

    loadOrderData();
  }, []);

  const handleTrackOrder = () => {
    navigation.navigate('PostCheckout', { orderNum });
  };

  const handleBackToHome = async () => {
    await AsyncStorage.removeItem('checkoutList');
    await AsyncStorage.removeItem('orderNum');
    navigation.navigate('GeneralHomePage');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Success Header */}
      <View style={styles.successHeader}>
        <Text style={styles.successEmoji}>✓</Text>
        <Text style={styles.successTitle}>Order Confirmed!</Text>
        <Text style={styles.successSubtitle}>Your payment was successful</Text>
      </View>

      {/* Order Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Order Summary</Text>
        </View>

        {/* Order ID */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Order ID:</Text>
          <Text style={styles.summaryValue}>#{orderNum}</Text>
        </View>

        {/* Store Information */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Pickup Location:</Text>
          <Text style={styles.summaryValue}>{storeName}</Text>
        </View>

        {/* Items Count */}
        {orderData?.Drinks && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items:</Text>
            <Text style={styles.summaryValue}>
              {Array.isArray(orderData.Drinks) ? orderData.Drinks.length : 1} drink(s)
            </Text>
          </View>
        )}

        {/* Estimated Pickup Time */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Estimated Ready:</Text>
          <Text style={styles.summaryValue}>{estimatedTime || '~15 minutes'}</Text>
        </View>
      </View>

      {/* Items List */}
      {orderData?.Drinks && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Order</Text>
          <View style={styles.itemsList}>
            {Array.isArray(orderData.Drinks) ? (
              orderData.Drinks.map((drink, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {drink.name || `Drink ${index + 1}`}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {drink.price ? `$${drink.price.toFixed(2)}` : 'N/A'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.itemName}>1 drink</Text>
            )}
          </View>
        </View>
      )}

      {/* Confirmation Code/QR (Optional - can be expanded later) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Confirmation Code</Text>
        <View style={styles.confirmationCodeBox}>
          <Text style={styles.confirmationCode}>
            {orderNum ? `ORDER-${orderNum}` : 'Loading...'}
          </Text>
        </View>
        <Text style={styles.confirmationHint}>
          Show this code at pickup or we'll send it to your email
        </Text>
      </View>

      {/* Next Steps */}
      <View style={styles.nextStepsCard}>
        <Text style={styles.cardTitle}>What's Next?</Text>
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepText}>Your drink is being prepared</Text>
        </View>
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>2</Text>
          <Text style={styles.stepText}>Head to the store when ready</Text>
        </View>
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>3</Text>
          <Text style={styles.stepText}>Pick up your order at the counter</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleTrackOrder}
        >
          <Text style={styles.primaryButtonText}>Track Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleBackToHome}
        >
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>

      {/* Auto-redirect hint */}
      <Text style={styles.redirectHint}>
        Redirecting to order tracking in 10 seconds...
      </Text>

      <NavBar />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingBottom: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  itemsList: {
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  confirmationCodeBox: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginVertical: 12,
    alignItems: 'center',
  },
  confirmationCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  confirmationHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  nextStepsCard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  stepRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: 'bold',
    marginRight: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  redirectHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 16,
    marginBottom: 16,
    fontStyle: 'italic',
  },
});

export default CheckoutSuccessPage;
