import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NavBar from '../components/NavBar';

const PaymentPage = () => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Payment & receipts</Text>
        <Text style={styles.subtitle}>
          Use the cart screen to complete your payment. This page can be used in the future to
          show saved payment methods and past receipts.
        </Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming soon</Text>
          <Text style={styles.sectionBody}>
            • Stored payment methods{'\n'}
            • Order receipts and invoices{'\n'}
            • Exportable transaction history
          </Text>
        </View>
      </View>
      <NavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '88%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(31,41,55,0.9)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 18,
  },
  section: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.9)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
});

export default PaymentPage;