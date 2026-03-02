import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  const loadStores = async () => {
    try {
      const res = await fetch(`${BASE_URL}/backend/stores/`);
      const data = await res.json();
      setStores(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSelected = async () => {
    const id = await AsyncStorage.getItem('selectedStoreId');
    if (id) setSelectedStoreId(parseInt(id, 10));
  };

  useEffect(() => {
    loadStores();
    loadSelected();
  }, []);

  const selectStore = async (store) => {
    await AsyncStorage.setItem('selectedStoreId', String(store.StoreID));
    setSelectedStoreId(store.StoreID);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Loading stores...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick a store (multi-store)</Text>
      <Text style={styles.hint}>Orders will be placed at the selected store.</Text>
      <FlatList
        data={stores}
        keyExtractor={(item) => String(item.StoreID)}
        renderItem={({ item }) => {
          const isSelected = selectedStoreId === item.StoreID;
          const regionName = item.RegionCode ?? item.Region ?? '';
          return (
            <TouchableOpacity
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => selectStore(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.name}>{item.Name}</Text>
              <Text style={styles.region}>Region {regionName}</Text>
              {item.Address ? <Text style={styles.address}>{item.Address}</Text> : null}
              {isSelected && <Text style={styles.checkmark}>✓ Selected</Text>}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C6C8EE', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#C6C8EE' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  hint: { fontSize: 14, color: '#555', marginBottom: 12 },
  text: { marginTop: 8 },
  row: {
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: '#D30C7B', backgroundColor: '#fef' },
  name: { fontSize: 16, fontWeight: '600' },
  region: { fontSize: 14, color: '#666', marginTop: 2 },
  address: { fontSize: 12, color: '#888', marginTop: 2 },
  checkmark: { marginTop: 4, color: '#D30C7B', fontWeight: '600' },
});
