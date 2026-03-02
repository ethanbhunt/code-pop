import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { BASE_URL } from '../../ip_address';

export default function MaintenancePage() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/backend/machines/`, {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });
        const data = await res.json();
        setMachines(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setMachines([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMachines();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Loading machines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Machines & maintenance status</Text>
      <FlatList
        data={machines}
        keyExtractor={(item) => String(item.MachineID)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.MachineType}</Text>
            <Text style={styles.store}>Store ID: {item.Store}</Text>
            <Text style={[styles.status, item.CurrentStatus !== 'normal' && styles.statusWarning]}>
              Status: {item.CurrentStatus}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C6C8EE', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#C6C8EE' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  text: { marginTop: 8 },
  row: {
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 8,
    borderRadius: 10,
  },
  name: { fontSize: 16, fontWeight: '600' },
  store: { fontSize: 14, color: '#666', marginTop: 2 },
  status: { fontSize: 14, marginTop: 2 },
  statusWarning: { color: '#D30C7B', fontWeight: '600' },
});
