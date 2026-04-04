import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Font from 'expo-font';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../ip_address';
import NavBar from '../components/NavBar';

const GeneralHomePage = () => {
   const [isLoggedIn, setIsLoggedIn] = useState(false);
   const [isAdmin, setIsAdmin] = useState(false);
   const [isManager, setIsManager] = useState(false);
   const [name, setName] = useState(null);
   const [activeOrderNum, setActiveOrderNum] = useState(null);
   const [dailyDrinks, setDailyDrinks] = useState([]);
   const [drinksLoading, setDrinksLoading] = useState(true);
   const [storeModalVisible, setStoreModalVisible] = useState(false);
   const [stores, setStores] = useState([]);
   const [storesLoading, setStoresLoading] = useState(false);
   const navigation = useNavigation();

  // Check login status when the screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      const checkLoginStatus = async () => {
        try {
          const storedName = await AsyncStorage.getItem('first_name');
          const token = await AsyncStorage.getItem('userToken');
          const userRole = await AsyncStorage.getItem('userRole');
          const orderNum = await AsyncStorage.getItem('orderNum');
          if (token && storedName) {
            setIsLoggedIn(true);
            setName(storedName);
          } else {
            setIsLoggedIn(false);
          }
          if (userRole == 'admin'){
            setIsAdmin(true);
          }else if(userRole == 'manager'){
            setIsManager(true);
          }else{
            setIsAdmin(false);
            setIsManager(false);
          }
          setActiveOrderNum(orderNum);
        } catch (error) {
          console.error('Error checking login status:', error);
        }
      };

       const fetchOneDrink = async () => {
         const token = await AsyncStorage.getItem('userToken');
         const headers = {
           'Content-Type': 'application/json',
         };
         
         // Only add authorization header if token exists
         if (token) {
           headers['Authorization'] = `Token ${token}`;
         }
         
         const res = await fetch(`${BASE_URL}/backend/generate/`, {
           method: 'GET',
           headers,
         });
         if (!res.ok) return null;
         return res.json();
       };

      const fetchDailyDrinks = async () => {
        setDrinksLoading(true);
        try {
          const drink1 = await fetchOneDrink();
          const drink2 = await fetchOneDrink();
          const drink3 = await fetchOneDrink();
          setDailyDrinks([drink1, drink2, drink3].filter(Boolean));
        } catch (error) {
          console.error('Error fetching daily drinks:', error);
        } finally {
          setDrinksLoading(false);
        }
      };

      checkLoginStatus();
      fetchDailyDrinks();
    }, [])
  );

  useEffect(() => {
    const loadFonts = async () => {
        await Font.loadAsync({
            'CherryBombOne': require('./../../assets/fonts/CherryBombOne-Regular.ttf'), // Adjust path as necessary
        });
    };

    loadFonts();
  }, []);

  useEffect(() => {
    // Retrieve the username from AsyncStorage when the component mounts
    const checkUserLogin = async () => {
      try {
        const storedName = await AsyncStorage.getItem('first_name');
        if (storedName) {
          setName(storedName); // If a username is found, set it in the state
        }
      } catch (error) {
        console.error('Error retrieving username:', error);
      }
    };

    checkUserLogin(); // Call the function when the component mounts
  }, []);

  // Logout function
  const handleLogout = async () => {
    try {
      // Send logout request to the backend
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/backend/auth/logout/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        // Clear AsyncStorage
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('first_name');
        await AsyncStorage.removeItem('userRole');
        
        setIsLoggedIn(false);
        setName(null);
        
        Alert.alert('Logout successful!');
      } else {
        Alert.alert('Logout failed, please try again.');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Logout failed, please try again later.');
    }
  };

  // Login button press
  const goToLoginPage = () => {
    navigation.navigate('Auth');  // Navigate to the login page
  };

  const goToAdminDash = () => {
    navigation.navigate('AdminDash');  // Navigate to the login page
  };

  const goToManDash = () => {
    navigation.navigate('ManagerDash');  // Navigate to the login page
  };

   const formatDrinkField = (value) => {
     if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
     return value || 'None';
   };

   const fetchStores = async () => {
     try {
       setStoresLoading(true);
       const token = await AsyncStorage.getItem('userToken');

       const headers = {
         'Content-Type': 'application/json',
       };
       
       if (token) {
         headers['Authorization'] = `Token ${token}`;
       }

       const response = await fetch(`${BASE_URL}/backend/stores`, {
         method: 'GET',
         headers,
       });

       if (!response.ok) {
         throw new Error(`Failed to fetch stores. Status: ${response.status}`);
       }

       const data = await response.json();
       setStores(data.data || []);
     } catch (error) {
       console.error('Error fetching stores:', error);
     } finally {
       setStoresLoading(false);
     }
   };

   const handleSelectStore = async (store) => {
     try {
       await AsyncStorage.setItem('selectedStoreId', store.storeId.toString());
       await AsyncStorage.setItem('selectedStoreName', store.name);
       
       if (store.databases) {
         await AsyncStorage.setItem('selectedStoreDbAddresses', JSON.stringify(store.databases));
       }

       setStoreModalVisible(false);
     } catch (error) {
       console.error('Error selecting store:', error);
       Alert.alert('Error', 'Failed to select store. Please try again.');
     }
   };

   const promptStoreSelection = async () => {
     try {
       const selectedStoreId = await AsyncStorage.getItem('selectedStoreId');
       if (!selectedStoreId) {
         await fetchStores();
         setStoreModalVisible(true);
       }
     } catch (error) {
       console.error('Error checking store selection:', error);
     }
   };

   // Generate drinks button press
   const generateDrinks = async () => {
     await promptStoreSelection();
     navigation.navigate('CreateDrink', { fromGenerateButton: true });
   }

  const goToTrackOrder = () => {
    if (!activeOrderNum) {
      Alert.alert('No active order yet', 'Place an order first, then track your progress in real time.');
      return;
    }
    navigation.navigate('PostCheckout');
  }

  const selectDailyDrink = async (drink) => {
    try {
      // Check if store is selected
      const selectedStoreId = await AsyncStorage.getItem('selectedStoreId');
      if (!selectedStoreId) {
        await fetchStores();
        setStoreModalVisible(true);
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      
      // Prepare drink data with all required fields
      const drinkData = {
        name: drink.name || "Daily Drink",
        sodaUsed: Array.isArray(drink.sodaUsed) ? drink.sodaUsed : [drink.sodaUsed],
        syrupsUsed: Array.isArray(drink.syrupsUsed) ? drink.syrupsUsed : [],
        addIns: Array.isArray(drink.addIns) ? drink.addIns : [],
        price: drink.price || 2.00,
        userCreated: true,
        size: drink.size || "24oz",
        ice: drink.ice || "regular"
      };

      // Create the drink in the backend
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Only add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`${BASE_URL}/backend/drinks/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(drinkData)
      });

      if (!response.ok) {
        throw new Error(`Failed to add drink. Status: ${response.status}`);
      }

      // Add drink to checkout list with full drink object
      let cartList = await AsyncStorage.getItem("checkoutList");
      const currentList = cartList ? JSON.parse(cartList) : [];
      const data = await response.json();
      const drinkObject = data.data || data;
      const updatedList = [...currentList, drinkObject];
      await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));

      Alert.alert('Success', 'Drink added to cart!', [
        { text: 'OK', onPress: () => navigation.navigate('Cart') }
      ]);
    } catch (error) {
      console.error('Error adding daily drink:', error);
      Alert.alert('Error', 'Failed to add drink to cart');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>CodePop AI</Text>
          <Text style={styles.heroTitle}>Build your next drink from a prompt</Text>
          <Text style={styles.heroDescription}>
            Describe your mood and let the AI generate a custom soda blend with ingredients, size, and ice presets.
          </Text>
          <TouchableOpacity onPress={generateDrinks} style={styles.primaryAction}>
            <Icon name="sparkles" size={20} color="#fff" />
            <Text style={styles.primaryActionText}>Start AI Drink Builder</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionCard} onPress={goToTrackOrder}>
            <Icon name="location" size={22} color="#1F7A8C" />
            <Text style={styles.quickActionTitle}>Track Order</Text>
            <Text style={styles.quickActionBody}>
              {activeOrderNum ? `Order #${activeOrderNum}` : 'No active order'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Cart')}>
            <Icon name="cart" size={22} color="#1F7A8C" />
            <Text style={styles.quickActionTitle}>Cart</Text>
            <Text style={styles.quickActionBody}>Review drinks before checkout</Text>
          </TouchableOpacity>
        </View>

        {isLoggedIn ? (
          <View style={styles.accountCard}>
            {name ? <Text style={styles.greeting}>Welcome back, {name}</Text> : null}
            <TouchableOpacity onPress={handleLogout} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Logout</Text>
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity onPress={goToAdminDash} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Admin Dashboard</Text>
              </TouchableOpacity>
            )}
            {isManager && (
              <TouchableOpacity onPress={goToManDash} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Manager Dashboard</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.accountCard}>
            <Text style={styles.greeting}>Sign in to save preferences and reorder faster.</Text>
            <TouchableOpacity onPress={goToLoginPage} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.dailyDrinksTitle}>Drinks of The Day</Text>

         {drinksLoading ? (
           <ActivityIndicator size="large" color="#1F7A8C" style={{ marginTop: 16 }} />
         ) : (
            dailyDrinks.map((drink, index) => {
              // Handle AI-generated drinks which use camelCase field names
              const soda = drink.sodaUsed || drink.SodaUsed || drink.sodas || [];
              const syrups = drink.syrupsUsed || drink.SyrupsUsed || drink.syrups || [];
              const addIns = drink.addIns || drink.AddIns || [];
              
              // Ensure fields are arrays
              const sodaArray = Array.isArray(soda) ? soda : (soda ? [soda] : []);
              const syrupsArray = Array.isArray(syrups) ? syrups : [];
              const addInsArray = Array.isArray(addIns) ? addIns : [];

              return (
                <View key={index} style={styles.dailyDrinkCard}>
                  <Text style={styles.dailyDrinkNumber}>Drink #{index + 1}</Text>
                  <Text style={styles.dailyDrinkDetail}>Soda: {formatDrinkField(sodaArray)}</Text>
                  <Text style={styles.dailyDrinkDetail}>Syrups: {formatDrinkField(syrupsArray)}</Text>
                  <Text style={styles.dailyDrinkDetail}>Add-ins: {formatDrinkField(addInsArray)}</Text>
                  <Text style={styles.dailyDrinkDetail}>Size: {drink.size || drink.Size || '24oz'}</Text>
                  <Text style={styles.dailyDrinkDetail}>Ice: {drink.ice || drink.Ice || 'regular'}</Text>
                  <TouchableOpacity 
                    onPress={() => selectDailyDrink(drink)} 
                    style={styles.addToCartButton}
                  >
                    <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              );
            })
         )}

       </ScrollView>
       
       {/* Store Selection Modal */}
       <Modal
         visible={storeModalVisible}
         transparent={true}
         animationType="fade"
         onRequestClose={() => setStoreModalVisible(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select a Store</Text>
               <TouchableOpacity onPress={() => setStoreModalVisible(false)}>
                 <Icon name="close" size={24} color="#1c334d" />
               </TouchableOpacity>
             </View>

             {storesLoading ? (
               <ActivityIndicator size="large" color="#1F7A8C" style={styles.loadingContainer} />
             ) : (
               <ScrollView style={styles.storesList}>
                 {stores.map((store) => (
                   <TouchableOpacity
                     key={store.storeId}
                     style={styles.storeOption}
                     onPress={() => handleSelectStore(store)}
                   >
                     <View style={styles.storeInfo}>
                       <Icon name="storefront" size={20} color="#1F7A8C" />
                       <View style={styles.storeDetails}>
                         <Text style={styles.storeName}>{store.name}</Text>
                         <Text style={styles.storeAddress}>{store.address || 'Address not available'}</Text>
                       </View>
                     </View>
                     <Icon name="chevron-forward" size={20} color="#1F7A8C" />
                   </TouchableOpacity>
                 ))}
               </ScrollView>
             )}
           </View>
         </View>
       </Modal>

       <NavBar />
     </View>
   );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 120,
  },
  heroCard: {
    width: '100%',
    borderRadius: 22,
    backgroundColor: '#022B3A',
    padding: 16,
  },
  heroEyebrow: {
    color: '#BFDBF7',
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 31,
  },
  heroDescription: {
    color: '#dcefff',
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryAction: {
    marginTop: 14,
    backgroundColor: '#1F7A8C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    marginLeft: 8,
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  quickActionsRow: {
    width: '100%',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1E5F2',
  },
  quickActionTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#1c334d',
  },
  quickActionBody: {
    marginTop: 4,
    fontSize: 13,
    color: '#49627d',
    fontWeight: '600',
  },
  accountCard: {
    width: '100%',
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1E5F2',
  },
  greeting: {
    fontSize: 16,
    color: '#1c334d',
    fontWeight: '700',
    marginBottom: 8,
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1F7A8C',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  dailyDrinksTitle: {
    width: '100%',
    fontSize: 22,
    fontWeight: '800',
    color: '#1c334d',
    marginTop: 20,
    marginBottom: 4,
  },
  dailyDrinkCard: {
    width: '100%',
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1E5F2',
  },
  dailyDrinkNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F7A8C',
    marginBottom: 6,
  },
  dailyDrinkDetail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#49627d',
    marginBottom: 3,
  },
  addToCartButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#1F7A8C',
    alignItems: 'center',
  },
   addToCartButtonText: {
     color: '#fff',
     fontSize: 14,
     fontWeight: '700',
   },
   modalOverlay: {
     flex: 1,
     backgroundColor: 'rgba(0, 0, 0, 0.5)',
     justifyContent: 'flex-end',
   },
   modalContent: {
     backgroundColor: '#ffffff',
     borderTopLeftRadius: 24,
     borderTopRightRadius: 24,
     maxHeight: '80%',
   },
   modalHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     paddingHorizontal: 16,
     paddingVertical: 16,
     borderBottomWidth: 1,
     borderBottomColor: '#E1E5F2',
   },
   modalTitle: {
     fontSize: 18,
     fontWeight: '800',
     color: '#1c334d',
   },
   loadingContainer: {
     paddingVertical: 40,
   },
   storesList: {
     paddingHorizontal: 12,
     paddingVertical: 12,
   },
   storeOption: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     paddingHorizontal: 12,
     paddingVertical: 14,
     marginVertical: 6,
     backgroundColor: '#f9f9f9',
     borderRadius: 12,
     borderWidth: 1,
     borderColor: '#E1E5F2',
   },
   storeInfo: {
     flexDirection: 'row',
     alignItems: 'center',
     flex: 1,
     gap: 12,
   },
   storeDetails: {
     flex: 1,
   },
   storeName: {
     fontSize: 16,
     fontWeight: '700',
     color: '#1c334d',
     marginBottom: 4,
   },
   storeAddress: {
     fontSize: 12,
     color: '#49627d',
     fontWeight: '500',
   },
});

export default GeneralHomePage;
