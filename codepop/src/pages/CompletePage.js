import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';

// https://docs.stripe.com/payments/quickstart (add payment to database post confirmation)

const STATUS_CONTENT_MAP = {
  succeeded: {
    text: "Payment succeeded",
    iconColor: "#30B130",
    icon: "✔",
  },
  processing: {
    text: "Your payment is processing.",
    iconColor: "#6D6E78",
    icon: "⌛",
  },
  requires_payment_method: {
    text: "Your payment was not successful, please try again.",
    iconColor: "#DF1B41",
    icon: "❌",
  },
  default: {
    text: "Something went wrong, please try again.",
    iconColor: "#DF1B41",
    icon: "❌",
  }
};

export default function CompletePage() {
  const [status, setStatus] = useState("default");
  const [intentId, setIntentId] = useState(null);

  useEffect(() => {
    // Payment status handling removed for cross-platform compatibility

    // Retrieve clientSecret from route params if passed from previous screen
    const { clientSecret } = route.params || {};

    if (!clientSecret) return;

    stripe.retrievePaymentIntent(clientSecret).then(({paymentIntent}) => {
      if (!paymentIntent) return;

      setStatus(paymentIntent.status);
      setIntentId(paymentIntent.id);
    });
  }, [stripe, route.params]);

   return (
       <View style={styles.paymentStatus}>
         <View style={[styles.statusIcon, { backgroundColor: STATUS_CONTENT_MAP[status].iconColor }]}>
           <Text style={styles.iconText}>{STATUS_CONTENT_MAP[status].icon}</Text>
         </View>
         <Text style={styles.statusText}>{STATUS_CONTENT_MAP[status].text}</Text>

         {intentId && (
           <View style={styles.detailsTable}>
             <View style={styles.tableRow}>
               <Text style={styles.tableLabel}>ID:</Text>
               <Text style={styles.tableContent}>{intentId}</Text>
             </View>
             <View style={styles.tableRow}>
               <Text style={styles.tableLabel}>Status:</Text>
               <Text style={styles.tableContent}>{status}</Text>
             </View>
           </View>
         )}

         {intentId && (
           <TouchableOpacity
             onPress={() => Linking.openURL(`https://dashboard.stripe.com/payments/${intentId}`)}
             style={styles.viewDetailsLink}
           >
             <Text style={styles.linkText}>View details</Text>
           </TouchableOpacity>
         )}

         <TouchableOpacity onPress={() => navigation.navigate('Checkout')} style={styles.retryButton}>
           <Text style={styles.buttonText}>Test another</Text>
         </TouchableOpacity>
       </View>
     );
   }


  const styles = StyleSheet.create({
    paymentStatus: {
      padding: 20,
      alignItems: 'center',
    },
    statusIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconText: {
      fontSize: 24, // Adjust as needed for icon text
    },
    statusText: {
      fontSize: 18,
      fontWeight: 'bold',
      marginVertical: 10,
    },
    detailsTable: {
      marginTop: 10,
      borderTopWidth: 1,
      borderColor: '#ccc',
      width: '100%',
      padding: 10,
    },
    tableRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 5,
    },
    tableLabel: {
      fontWeight: 'bold',
    },
    tableContent: {
      color: '#333',
    },
    viewDetailsLink: {
      marginTop: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },
    linkText: {
      color: '#0055DE',
      textDecorationLine: 'underline',
    },
    retryButton: {
      marginTop: 15,
      padding: 10,
      backgroundColor: '#0055DE',
      borderRadius: 5,
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });