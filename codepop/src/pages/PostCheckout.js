import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RatingCarosel from '../components/RatingCarosel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../ip_address';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import NavBar from '../components/NavBar';

const PostCheckout = () => {
  const navigation = useNavigation();
  const [lockerCombo, setLockerCombo] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [orderNum, setOrderNum] = useState(null);
  const [orderStatus, setOrderStatus] = useState('pending');
  const [estimatedReadyTime, setEstimatedReadyTime] = useState(null);
  const [lastUpdateText, setLastUpdateText] = useState('Waiting for first update...');
  const [isDemoFallback, setIsDemoFallback] = useState(false);
  const [failedPollCount, setFailedPollCount] = useState(0);
  const [purchasedDrinks, setPurchasedDrinks] = useState([]);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isNearby, setIsNearby] = useState(false);

  const statusTimeline = ['pending', 'processing', 'completed'];

  const storeLocation = {
      latitude: 41.7421007, //the emulator will likely user coordinates to google headquarters which is these coordinates. uncomment to test <500 yard option
      longitude: -111.8070335
  };

  useEffect(() => {
      (async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setErrorMsg(null);
            return;
          }

          try {
                // Fetch the user's current location
                let currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);
              } catch (error) {
                // Silently ignore location fetch failures in demo mode
                setErrorMsg(null);
              }
        } catch (error) {
          // Silently ignore permission request failures in demo mode
          setErrorMsg(null);
        }
      })();
    }, []);


    // Function to calculate the distance between two coordinates using the Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // Earth's radius in meters
      const toRadians = (deg) => (deg * Math.PI) / 180;

      const φ1 = toRadians(lat1);
      const φ2 = toRadians(lat2);
      const Δφ = toRadians(lat2 - lat1);
      const Δλ = toRadians(lon2 - lon1);

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    };


    // Function to check if user is within 500 yards (457.2 meters)
      const checkDistance = (userCoords) => {
        const userLatitude = userCoords.latitude;
        const userLongitude = userCoords.longitude;

        // Calculate the distance between the user's coordinates and the store's coordinates
        const distance = calculateDistance(
          userLatitude,
          userLongitude,
          storeLocation.latitude,
          storeLocation.longitude
        );

        // 500 yards is approximately 457.2 meters
        if (distance <= 457.2) {
          setIsNearby(true);
        } else {
          setIsNearby(false);
        }
      };

      // Trigger checkDistance whenever the location changes
      useEffect(() => {
        if (location) {
          const { coords } = location;
          checkDistance(coords);
        }
      }, [location]);



  // get the list of drinks from the cartlist
  useEffect(() => {
    const fetchPurchasedDrinks = async () => {
      try {
        const storedDrinks = await AsyncStorage.getItem("purchasedDrinks");
        const parsedDrinks = storedDrinks ? JSON.parse(storedDrinks) : [];
        setPurchasedDrinks(parsedDrinks);

        // Loop through the drinks and log details
        // Create a list to store all the items
        const allUsedItems = [];

        parsedDrinks.forEach((drink) => {

          // Add SyrupsUsed to the list
          if (drink.SyrupsUsed && drink.SyrupsUsed.length > 0) {
            allUsedItems.push(...drink.SyrupsUsed); // Spread operator to merge arrays
          }

          // Add SodaUsed to the list
          if (drink.SodaUsed && drink.SodaUsed.length > 0) {
            allUsedItems.push(...drink.SodaUsed);
          }

        // Add AddIns to the list
          if (drink.AddIns && drink.AddIns.length > 0) {
            allUsedItems.push(...drink.AddIns);
          }
    });

    // Fetch revenue data
    const inventoryResponse = await fetch(`${BASE_URL}/backend/inventory/report/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const inventoryData = await inventoryResponse.json();

    // Extract matching InventoryIDs
    const matchingInventoryIDs = inventoryData.inventory_items.filter(item => allUsedItems.some(usedItem => usedItem.toLowerCase() === item.ItemName.toLowerCase())).map(item => item.InventoryID); // Extract the InventoryID

    for (const id of matchingInventoryIDs)
    {
      try{
        const data = {'used_quantity': 1};
        const response = await fetch(`${BASE_URL}/backend/inventory/${id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update Inventory')
        }
      } catch (error) {
        console.error('Error resetting incentory:', error)
      }
    }
      } catch (error) {
        console.error("Error fetching purchased drinks:", error);
      }
    };
  
    fetchPurchasedDrinks();
  }, []);

  useEffect(() => {
    // Generate locker combo only when the component mounts
    handleLockerCombo();
  }, []); // Empty dependency array ensures it runs only once

  useEffect(() => {
    const loadOrderNum = async () => {
      const storedOrderNum = await AsyncStorage.getItem('orderNum');
      if (storedOrderNum) {
        setOrderNum(storedOrderNum);
      }
    };

    loadOrderNum();
  }, []);

  useEffect(() => {
    if(lockerCombo !== ''){
      updateLockerCombo();
    }
  }, [lockerCombo]);

  useEffect(() => {
    if (!estimatedReadyTime) return;

    const timerId = setInterval(() => {
      const secondsRemaining = Math.max(0, Math.floor((new Date(estimatedReadyTime).getTime() - Date.now()) / 1000));
      setTimeLeft(secondsRemaining);
    }, 1000);

    return () => clearInterval(timerId);
  }, [estimatedReadyTime]);

  useEffect(() => {
    if (!orderNum) return;

    const pollOrder = async () => {
      try {
        const response = await fetch(`${BASE_URL}/backend/orders/${orderNum}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Order poll failed: ${response.status}`);
        }

        const data = await response.json();
        setOrderStatus(data.OrderStatus || 'pending');
        setEstimatedReadyTime(data.PickupTime || null);
        setLastUpdateText(`Live update: ${new Date().toLocaleTimeString()}`);
        setFailedPollCount(0);
        setIsDemoFallback(false);
      } catch (error) {
        console.error('Polling order failed:', error);
        setFailedPollCount((prev) => {
          const next = prev + 1;
          if (next >= 2) {
            setIsDemoFallback(true);
            setLastUpdateText('Presentation mode: network unstable, using local fallback.');
          }
          return next;
        });
      }
    };

    pollOrder();
    const pollId = setInterval(pollOrder, 5000);

    return () => clearInterval(pollId);
  }, [orderNum]);
  

  const handleLockerCombo = () => {
    // Generate a random 5-digit locker combination
    let combo = '';
    for (let i = 0; i < 5; i++) {
      const digit = Math.floor(Math.random() * 10); // Generates a number between 0 and 9
      combo += digit.toString();
    }
    setLockerCombo(combo);
  };

  const updateLockerCombo = async () => {
    const orderNum = await AsyncStorage.getItem("orderNum");
    await fetch(`${BASE_URL}/backend/orders/${orderNum}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        LockerCombo: lockerCombo,
      }),
    });
  };

  // Convert timeLeft to minutes and seconds format
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  // Function for the "I've Arrived" button
  const handleUserArrived = () => {
    setIsNearby(true);
  };

  const goHomePage = () => {
    navigation.navigate('GeneralHome');  // Navigate to the login page
  };

  const makeDrink= () => {
    setIsNearby(true);
  }

  const getStatusLabel = (status) => {
    if (status === 'pending') return 'Queued';
    if (status === 'processing') return 'Mixing';
    if (status === 'completed') return 'Ready';
    return status;
  };

  const currentStatusIndex = Math.max(0, statusTimeline.indexOf(orderStatus));
  const progressPercent = `${((currentStatusIndex + 1) / statusTimeline.length) * 100}%`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <View style={styles.headerCard}>
          <Text style={styles.headerEyebrow}>Live Tracking</Text>
          <Text style={styles.headerTitle}>Order #{orderNum || '---'}</Text>
          <Text style={styles.headerStatus}>Status: {getStatusLabel(orderStatus)}</Text>
          <Text style={styles.headerEta}>ETA: {minutes}:{seconds}</Text>
          <Text style={styles.lastUpdate}>{lastUpdateText}</Text>
          {isDemoFallback && (
            <Text style={styles.fallbackBadge}>Presentation fallback active</Text>
          )}

          <View style={styles.progressRail}>
            <View style={[styles.progressFill, { width: progressPercent }]} />
          </View>
          <View style={styles.timelineRow}>
            {statusTimeline.map((status) => {
              const isDone = statusTimeline.indexOf(status) <= currentStatusIndex;
              return (
                <View key={status} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, isDone ? styles.timelineDotActive : null]} />
                  <Text style={[styles.timelineLabel, isDone ? styles.timelineLabelActive : null]}>{getStatusLabel(status)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.nearbySection}>
          {isNearby ? (
            <Text style={styles.nearbyText}>You are close by. The team is preparing your drink now.</Text>
          ) : (
            <Text style={styles.nearbyText}>Arrive within 500 yards and we will start making your drink.</Text>
          )}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Drink ready in</Text>
            <Text style={styles.summaryValue}>{minutes}:{seconds}</Text>
            {orderStatus === 'completed' && <Text style={styles.successMessage}>Your drink is ready!</Text>}
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Locker combo</Text>
            <Text style={styles.summaryValue}>{lockerCombo || '-----'}</Text>
          </View>
        </View>

        <View style={styles.mapSection}>
          <Text style={styles.mapTitle}>Arrival map</Text>
          {location ? (
            <MapView
              style={styles.map}
              region={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
            >
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title="You are here"
                description="Current location"
              />
            </MapView>
          ) : (
            <View style={styles.arrivalButtonContainer}>
              <Text style={styles.loadingText}>Map unavailable in demo mode.</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleUserArrived}
              >
                <Text style={styles.actionButtonText}>I've Arrived</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Rate your drinks</Text>
          <RatingCarosel purchasedDrinks={purchasedDrinks} />
        </View>

        {orderStatus === 'completed' ? (
          <TouchableOpacity onPress={goHomePage} style={styles.actionButtonLarge}>
            <Text style={styles.actionButtonText}>Back To Home Page</Text>
          </TouchableOpacity>
        ) : isNearby ? (
          <></>
        ) : (
          <TouchableOpacity onPress={makeDrink} style={styles.actionButtonLarge}>
            <Text style={styles.actionButtonText}>Location Not Working</Text>
            <Text style={styles.actionButtonText}>Tap To Start Drink</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <NavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf5',
  },
  scrollViewContainer: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 120,
  },
  headerCard: {
    width: '100%',
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#133a57',
    shadowColor: '#0f2538',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  headerEyebrow: {
    color: '#98dcff',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 4,
  },
  headerStatus: {
    color: '#dcefff',
    fontSize: 16,
    marginTop: 8,
    fontWeight: '700',
  },
  headerEta: {
    color: '#dcefff',
    fontSize: 16,
    marginTop: 2,
    fontWeight: '700',
  },
  progressRail: {
    height: 8,
    borderRadius: 999,
    marginTop: 12,
    backgroundColor: '#2f5672',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#ffb347',
  },
  summaryRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dfe9f2',
  },
  mapSection: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    width: '100%',
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfe9f2',
    padding: 12,
  },
  ratingSection: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfe9f2',
    paddingBottom: 20,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  summaryLabel: {
    color: '#37526d',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#1b2f45',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  successMessage: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0e5f8a',
    marginTop: 6,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1b2f45',
    margin: 10,
  },
  actionButton: {
    backgroundColor: '#ff6a3d',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonLarge: {
    marginTop: 12,
    backgroundColor: '#ff6a3d',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  map: {
    width: '100%',
    height: 210,
    borderRadius: 12,
  },
  nearbySection: {
    marginTop: 12,
    backgroundColor: '#fff2df',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ffd6a6',
    padding: 12,
  },
  lastUpdate: {
    color: '#bfe8ff',
    marginTop: 6,
    marginBottom: 8,
    fontWeight: '600',
  },
  fallbackBadge: {
    color: '#133a57',
    backgroundColor: '#f9e76d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timelineRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6f8aa1',
    marginBottom: 4,
  },
  timelineDotActive: {
    backgroundColor: '#ffb347',
  },
  timelineLabel: {
    color: '#b8d7ed',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineLabelActive: {
    color: '#ffffff',
  },
  nearbyText: {
    fontWeight: '700',
    color: '#7a4700',
  },
  arrivalButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    minHeight: 190,
  },
  errorMessage: {
    fontWeight: '700',
    color: '#264059',
    marginBottom: 10,
    textAlign: 'center',
  },
  mapTitle: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: '800',
    color: '#1b2f45',
    marginBottom: 10,
  },
  loadingText: {
    color: '#264059',
    fontWeight: '600',
  },
});

export default PostCheckout;

