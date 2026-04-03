import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../ip_address';

const ManagerDash = () => {
  const [revenue, setRevenue] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [orders, setOrders] = useState([]);

  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [revenueModalVisible, setRevenueModalVisible] = useState(false);
  const [liveOrdersModalVisible, setLiveOrdersModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [error, setError] = useState(null);

  const formatEta = (pickupTime) => {
    if (!pickupTime) return 'No ETA';
    const etaDate = new Date(pickupTime);
    const seconds = Math.max(0, Math.floor((etaDate.getTime() - Date.now()) / 1000));
    const minutes = Math.floor(seconds / 60);
    const remSeconds = seconds % 60;
    return `${minutes}m ${String(remSeconds).padStart(2, '0')}s`;
  };

  const getNextStatus = (status) => {
    if (status === 'pending') return 'processing';
    if (status === 'processing') return 'completed';
    return null;
  };

  const fetchOrders = async () => {
    const token = await AsyncStorage.getItem('userToken');
    const ordersResponse = await fetch(`${BASE_URL}/backend/orders/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
    });
    const ordersData = await ordersResponse.json();
    const normalizedOrders = Array.isArray(ordersData)
      ? ordersData
      : Array.isArray(ordersData?.data)
        ? ordersData.data
        : [];
    setOrders(normalizedOrders);
    setOrdersCount(normalizedOrders.length);
  };

  const updateLiveStatus = async (orderId, status = null, delayMinutes = 0) => {
    try {
      setUpdatingOrderId(orderId);
      const payload = {};
      if (status) payload.status = status;
      if (delayMinutes !== 0) payload.delay_minutes = delayMinutes;

      const response = await fetch(`${BASE_URL}/backend/orders/${orderId}/live-status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Update failed', data.error || 'Unable to update order status.');
        return;
      }

      await fetchOrders();
    } catch (err) {
      console.error('Error updating live status:', err);
      Alert.alert('Update failed', 'Network issue while updating order.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Fetching revenue, inventory, and orders data
   useEffect(() => {
     const fetchMetrics = async () => {
       try {
         const token = await AsyncStorage.getItem('userToken');
         
          // Fetch revenue data
          const revenueResponse = await fetch(`${BASE_URL}/backend/revenues/`, {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Token ${token}`,
            },
          });
          const revenueResponseData = await revenueResponse.json();
          const normalizedRevenue = Array.isArray(revenueResponseData)
            ? revenueResponseData
            : Array.isArray(revenueResponseData?.data)
              ? revenueResponseData.data
              : [];
          setRevenue(normalizedRevenue);

          // Fetch inventory data (from /report endpoint)
          const inventoryResponse = await fetch(`${BASE_URL}/backend/inventory/report/`, {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Token ${token}`,
            },
          });
          const inventoryResponseData = await inventoryResponse.json();
          const inventoryItems = Array.isArray(inventoryResponseData?.inventory_items)
            ? inventoryResponseData.inventory_items
            : Array.isArray(inventoryResponseData?.data?.inventory_items)
              ? inventoryResponseData.data.inventory_items
              : [];

          const normalizedInventory = inventoryItems.map((item) => ({
            inventoryId: item.inventoryId ?? item.InventoryID,
            itemName: item.itemName ?? item.ItemName,
            quantity: item.quantity ?? item.Quantity,
            thresholdLevel: item.thresholdLevel ?? item.ThresholdLevel,
          }));

          // Sort inventory by Threshold Level (ascending order)
          const sortedInventory = normalizedInventory.sort((a, b) => a.thresholdLevel - b.thresholdLevel);
          setInventory(sortedInventory);

        // Fetch orders count
        await fetchOrders();
      } catch (error) {
        console.error('Error fetching metrics:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // Function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

   // Function to handle resetting the inventory to the threshold level
   const resetInventory = async (itemId, thresholdLevel) => {
     try {
       const token = await AsyncStorage.getItem('userToken');
       // Send a PATCH request to the backend to reset the quantity to the threshold level
       const data = { reset: true }; // Indicating that the inventory should be reset
       const response = await fetch(`${BASE_URL}/backend/inventory/${itemId}/`, {
         method: 'PATCH',
         headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Token ${token}`,
         },
         body: JSON.stringify(data),
       });

      if (response.ok) {
         // Update the local inventory state after successful reset
         setInventory((prevInventory) =>
           prevInventory.map((item) =>
             item.inventoryId === itemId ? { ...item, quantity: thresholdLevel } : item
           )
         );
        alert('Inventory reset successfully');
      } else {
        const errorData = await response.json();
        alert('Error resetting inventory: ' + errorData.detail || 'Unknown error');
      }
    } catch (error) {
      console.error('Error resetting inventory:', error);
      alert('Failed to reset inventory');
    }
  };

  return (
    <View style={styles.container}>
      <Image 
                source={require('../../assets/PinkBubbles.png')}
                style={styles.image}
                resizeMode="cover"
            />
      <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Manager Dashboard</Text>

      {/* Revenue Section */}
       <View style={styles.card}>
         <Text style={styles.cardTitle}>Total Revenue</Text>
         <Text style={styles.cardContent}>
           ${revenue.reduce((sum, rev) => sum + Number(rev.totalAmount ?? rev.TotalAmount ?? 0), 0).toFixed(2)}
         </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setRevenueModalVisible(true)}>
          <Text style={styles.buttonText}>View Revenue</Text>
        </TouchableOpacity>
      </View>

      {/* Inventory Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Inventory Items</Text>
        <Text style={styles.cardContent}>{inventory.length} items</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setInventoryModalVisible(true)}>
          <Text style={styles.buttonText}>Manage Inventory</Text>
        </TouchableOpacity>
      </View>

      {/* Orders Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Orders</Text>
        <Text style={styles.cardContent}>{ordersCount} orders</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setLiveOrdersModalVisible(true)}>
          <Text style={styles.buttonText}>Live Order Controls</Text>
        </TouchableOpacity>
      </View>

      {/* Inventory Modal */}
      <Modal
        transparent={true}
        visible={inventoryModalVisible}
        onRequestClose={() => setInventoryModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Inventory</Text>

            {/* Inventory List inside a ScrollView */}
            {loading ? (
              <ActivityIndicator size="large" color="#8df1d3" />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
               <ScrollView style={styles.scrollableList}>
                 {inventory.map((item) => (
                   <View key={item.inventoryId} style={styles.inventoryItem}>
                     <Text style={styles.itemName}>{item.itemName}</Text>
                     <Text>Quantity: {item.quantity}</Text>
                     <Text>Threshold Level: {item.thresholdLevel}</Text>
                     <TouchableOpacity
                       style={styles.button}
                       onPress={() => resetInventory(item.inventoryId, item.thresholdLevel)}>
                       <Text style={styles.buttonText}>Replace Item</Text>
                     </TouchableOpacity>
                   </View>
                 ))}
               </ScrollView>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={() => setInventoryModalVisible(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Revenue Modal */}
      <Modal
        transparent={true}
        visible={revenueModalVisible}
        onRequestClose={() => setRevenueModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Revenue Details</Text>

            {loadingRevenue ? (
              <ActivityIndicator size="large" color="#8df1d3" />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : revenue.length > 0 ? (
               <ScrollView style={styles.scrollableList}>
                 {revenue.map((rev) => (
                   <View key={rev.revenueId ?? rev.RevenueID} style={styles.revenueCard}>
                     <Text style={styles.revenueText}>Sale Date: {formatDate(rev.saleDate ?? rev.SaleDate)}</Text>
                     <Text style={styles.revenueText}>Order ID: {rev.orderId ?? rev.OrderID}</Text>
                     <Text style={styles.revenueText}>Amount: ${Number(rev.totalAmount ?? rev.TotalAmount ?? 0).toFixed(2)}</Text>
                   </View>
                 ))}
               </ScrollView>
            ) : (
              <Text>No revenue found.</Text>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={() => setRevenueModalVisible(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Live Orders Modal */}
      <Modal
        transparent={true}
        visible={liveOrdersModalVisible}
        onRequestClose={() => setLiveOrdersModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContentLarge}>
            <Text style={styles.modalTitle}>Live Order Journey Controls</Text>

            <TouchableOpacity style={styles.button} onPress={fetchOrders}>
              <Text style={styles.buttonText}>Refresh Orders</Text>
            </TouchableOpacity>

            <ScrollView style={styles.scrollableList}>
              {orders.length === 0 ? (
                <Text>No orders available yet.</Text>
              ) : (
                orders.map((order) => {
                  const nextStatus = getNextStatus(order.OrderStatus);
                  return (
                    <View key={order.OrderID} style={styles.orderCard}>
                      <Text style={styles.itemName}>Order #{order.OrderID}</Text>
                      <Text>Status: {order.OrderStatus}</Text>
                      <Text>ETA: {formatEta(order.PickupTime)}</Text>
                      <View style={styles.orderButtonRow}>
                        <TouchableOpacity
                          style={[styles.button, styles.orderButton]}
                          onPress={() => updateLiveStatus(order.OrderID, null, 2)}>
                          <Text style={styles.buttonText}>+2 min</Text>
                        </TouchableOpacity>
                        {nextStatus ? (
                          <TouchableOpacity
                            style={[styles.button, styles.orderButton]}
                            onPress={() => updateLiveStatus(order.OrderID, nextStatus, 0)}>
                            <Text style={styles.buttonText}>Next: {nextStatus}</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.button, styles.orderButton, styles.disabledButton]}>
                            <Text style={styles.buttonText}>Done</Text>
                          </View>
                        )}
                      </View>
                      {updatingOrderId === order.OrderID && (
                        <Text style={styles.updatingText}>Updating...</Text>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.button}
              onPress={() => setLiveOrdersModalVisible(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '150%',
    height: '200%',
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#D30C7B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D30C7B',
    textAlign: 'center',
    marginBottom: 20,
    zIndex: 2, 
    backgroundColor: '#8DF1D3',
    borderRadius: 10,
    padding: 10,
  },
  card: {
    backgroundColor: '#FFA686',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 2, // Ensure it's above the image
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  cardContent: {
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#8df1d3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    color: '#000',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: 'center',
  },
  modalContentLarge: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inventoryItem: {
    marginBottom: 15,
    width: '100%',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    marginVertical: 10,
    width: '100%',
    borderRadius: 5,
  },
  revenueCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
  },
  revenueText: {
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  scrollableList: {
    maxHeight: 400,  // Limiting the height of the scrollable list
    width: '100%',
  },
  orderCard: {
    marginBottom: 12,
    width: '100%',
    backgroundColor: '#f1fbf5',
    padding: 12,
    borderRadius: 8,
  },
  orderButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  orderButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  disabledButton: {
    opacity: 0.55,
  },
  updatingText: {
    marginTop: 8,
    fontWeight: 'bold',
  },
});

export default ManagerDash;
