import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../../ip_address';

const ManagerDash = () => {
  const navigation = useNavigation();
  const [revenue, setRevenue] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [ordersCount, setOrdersCount] = useState(0);

  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [revenueModalVisible, setRevenueModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [error, setError] = useState(null);

  // Fetching revenue, inventory, and orders data
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch revenue data
        const revenueResponse = await fetch(`${BASE_URL}/backend/revenues/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const revenueData = await revenueResponse.json();
        setRevenue(revenueData);

        // Fetch inventory data (from /report endpoint)
        const inventoryResponse = await fetch(`${BASE_URL}/backend/inventory/report/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const inventoryData = await inventoryResponse.json();

        // Sort inventory by Threshold Level (ascending order)
        const sortedInventory = inventoryData.inventory_items.sort((a, b) => a.ThresholdLevel - b.ThresholdLevel);
        setInventory(sortedInventory);

        // Fetch orders count
        const ordersResponse = await fetch(`${BASE_URL}/backend/orders/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const ordersData = await ordersResponse.json();
        setOrdersCount(ordersData.length);
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
      // Send a PATCH request to the backend to reset the quantity to the threshold level
      const data = { reset: true }; // Indicating that the inventory should be reset
      const response = await fetch(`${BASE_URL}/backend/inventory/${itemId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Update the local inventory state after successful reset
        setInventory((prevInventory) =>
          prevInventory.map((item) =>
            item.InventoryID === itemId ? { ...item, Quantity: thresholdLevel } : item
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
          ${revenue.reduce((sum, rev) => sum + rev.TotalAmount, 0).toFixed(2)}
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
      </View>

      {/* Machines & Maintenance (multi-store feature) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Machines & Maintenance</Text>
        <Text style={styles.cardContent}>View machine status by store</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Maintenance')}>
          <Text style={styles.buttonText}>View Machines</Text>
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
                  <View key={item.InventoryID} style={styles.inventoryItem}>
                    <Text style={styles.itemName}>{item.ItemName}</Text>
                    <Text>Quantity: {item.Quantity}</Text>
                    <Text>Threshold Level: {item.ThresholdLevel}</Text>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={() => resetInventory(item.InventoryID, item.ThresholdLevel)}>
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
                  <View key={rev.RevenueID} style={styles.revenueCard}>
                    <Text style={styles.revenueText}>Sale Date: {formatDate(rev.SaleDate)}</Text>
                    <Text style={styles.revenueText}>Order ID: {rev.OrderID}</Text>
                    <Text style={styles.revenueText}>Amount: ${rev.TotalAmount.toFixed(2)}</Text>
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
  },
});

export default ManagerDash;
