import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { fetchStoresFromBootstrap, setStoreAndUpdateURL } from '../../ip_address';
import NavBar from '../components/NavBar';

const StoreSelectPage = () => {
  const navigation = useNavigation();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  useEffect(() => {
    fetchStores();
    loadSelectedStore();
  }, []);

  const loadSelectedStore = async () => {
    try {
      const stored = await AsyncStorage.getItem('selectedStoreId');
      if (stored) {
        setSelectedStoreId(parseInt(stored));
      }
    } catch (error) {
      console.error('Error loading selected store:', error);
    }
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      console.log('[StoreSelect] Fetching stores from bootstrap...');
      
      // Fetch stores from bootstrap node (not from peer)
      const storesData = await fetchStoresFromBootstrap();
      setStores(storesData);
      
      console.log(`[StoreSelect] Successfully loaded ${storesData.length} stores`);
    } catch (error) {
      console.error('[StoreSelect] Error fetching stores from bootstrap:', error);
      Alert.alert(
        'Connection Error',
        'Could not connect to the bootstrap node. Please check your network connection and ensure the backend is running.',
        [{ text: 'Retry', onPress: () => fetchStores() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStore = async (store) => {
    try {
      console.log(`[StoreSelect] User selected store: ${store.name} (ID: ${store.storeId})`);
      
      // Update BASE_URL to the selected store's peer
      // This persists the store selection and updates the peer URL for future requests
      await setStoreAndUpdateURL(store.storeId);
      
      // Also save store name for UI display
      await AsyncStorage.setItem('selectedStoreName', store.name);
      
      // If store has database addresses, save them too
      if (store.databases) {
        await AsyncStorage.setItem('selectedStoreDbAddresses', JSON.stringify(store.databases));
      }

      setSelectedStoreId(store.storeId);
      console.log(`[StoreSelect] Store selection complete, navigating to GeneralHome`);
      
      Alert.alert('Success', `Selected ${store.name}`, [
        {
          text: 'Continue',
          onPress: () => navigation.navigate('GeneralHome'),
        },
      ]);
    } catch (error) {
      console.error('[StoreSelect] Error selecting store:', error);
      Alert.alert('Error', 'Failed to select store. Please try again.');
    }
  };

  const renderStoreCard = ({ item: store }) => {
    const isSelected = selectedStoreId === store.storeId;

    return (
      <TouchableOpacity
        style={[styles.storeCard, isSelected && styles.storeCardSelected]}
        onPress={() => handleSelectStore(store)}
      >
        <View style={styles.storeHeader}>
          <View style={styles.storeTitleContainer}>
            <Text style={styles.storeName}>{store.name}</Text>
            {isSelected && (
              <View style={styles.selectedBadge}>
                <Icon name="checkmark-circle" size={16} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {store.status === 'operational' ? '🟢 Open' : '🔴 Closed'}
            </Text>
          </View>
        </View>

        <View style={styles.storeDetails}>
          <View style={styles.detailRow}>
            <Icon name="location-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{store.address}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {store.operatingHours?.monday?.open || 'N/A'} - {store.operatingHours?.monday?.close || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="people-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{store.staffCount} staff members</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.selectButton}>
          <Text style={styles.selectButtonText}>
            {isSelected ? '✓ Selected' : 'Select Store'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1F7A8C" />
          <Text style={styles.loadingText}>Loading stores...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Select a Store</Text>
          <Text style={styles.subtitle}>Choose where you'd like to pick up your order</Text>
        </View>

        {stores.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="storefront-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No stores available</Text>
          </View>
        ) : (
          <FlatList
            data={stores}
            keyExtractor={(item) => item.storeId.toString()}
            renderItem={renderStoreCard}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScrollView>
      <NavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1c334d',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  storeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#eee',
  },
  storeCardSelected: {
    borderColor: '#1F7A8C',
    backgroundColor: '#f0f8fa',
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c334d',
  },
  selectedBadge: {
    marginLeft: 8,
    backgroundColor: '#1F7A8C',
    borderRadius: 12,
    padding: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  storeDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#1F7A8C',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});

export default StoreSelectPage;
