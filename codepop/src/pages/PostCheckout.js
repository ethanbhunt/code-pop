import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RatingCarosel from '../components/RatingCarosel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../ip_address';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

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
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied.\n Please click the button when you have arrived so we can have your drink prepared.');
          return;
        }

          try {
                // Fetch the user's current location
                let currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);
              } catch (error) {
                console.error("Error fetching location:", error);
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>

        {/*Distance from store*/}
        <View style={[styles.section, styles.nearbySection]}>
            <View style={styles.nearbyText}>
                {isNearby ? (
                        <Text style={styles.text}>Your drink is being made!</Text>
                      ) : (
                        <Text style={styles.text}>Once you are within 500 yards from the store Bob will start making your drink.</Text>
                )}
            </View>
        </View>

        <View style={[styles.section, styles.trackerSection]}>
          <Text style={styles.trackerTitle}>Live Order Journey</Text>
          <Text style={styles.trackerSubTitle}>Status: {getStatusLabel(orderStatus)}</Text>
          <Text style={styles.trackerSubTitle}>ETA: {minutes}:{seconds}</Text>
          <Text style={styles.lastUpdate}>{lastUpdateText}</Text>
          {isDemoFallback && (
            <Text style={styles.fallbackBadge}>Presentation fallback active</Text>
          )}

          <View style={styles.timelineRow}>
            {statusTimeline.map((status) => {
              const isDone = statusTimeline.indexOf(status) <= statusTimeline.indexOf(orderStatus);
              return (
                <View key={status} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, isDone ? styles.timelineDotActive : null]} />
                  <Text style={styles.timelineLabel}>{getStatusLabel(status)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Map Image Box */}
        <View style={[styles.section, styles.mapSection]}>
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
                    {errorMsg ? (
                      <>
                        <Text style={styles.errorMessage}>
                          {errorMsg || "Location permission not granted."}
                        </Text>
                        <TouchableOpacity
                          style={styles.button}
                          onPress={handleUserArrived}
                        >
                          <Text style={styles.buttonText}>I've Arrived</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text>Loading...</Text>
                    )}
                  </View>
                )}
              </View>

        {/* Rating Box */}
        <View style={[styles.section, styles.ratingSection]}>
          <Text style={styles.ratingLabel}>Liked any of your drinks?</Text>
          <RatingCarosel purchasedDrinks={purchasedDrinks} />
        </View>

        {/* Horizontal Container for Timer and Locker Combo */}
        <View style={styles.timerAndLockerContainer}>
          <View style={[styles.section, styles.timerSection]}>
            <Text style={styles.heading}>Drink ready in:</Text>
            <Text style={styles.timer}>
              {minutes}:{seconds}
            </Text>
            {orderStatus === 'completed' && <Text style={styles.successMessage}>Your drink is ready!</Text>}
          </View>

          <View style={[styles.section, styles.lockerComboSection]}>
            <Text style={styles.lockerCombo}>Locker combo: {lockerCombo}</Text>
          </View>
        </View>
        {orderStatus === 'completed' ? (
          <TouchableOpacity onPress={goHomePage} style={styles.mediumButton}>
            <Text style={styles.buttonText}>Back To Home Page</Text>
          </TouchableOpacity>
        ) : isNearby ? (
          <></>
        ) : (
          <TouchableOpacity onPress={makeDrink} style={styles.mediumButton}>
            <Text style={styles.buttonText}>Location Not Working</Text>
            <Text style= {styles.buttonText}>Press To Make Drink!</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8DF1D3', 
  },
  scrollViewContainer: {
    flexGrow: 1,
    padding: 10,
    paddingBottom: 30,
  },
  section: {
    width: '100%',
    marginBottom: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  timerAndLockerContainer: {
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timerSection: {
    backgroundColor: '#C6C8EE',
    flex: 1,
    marginRight: 10,
  },
  lockerComboSection: {
    backgroundColor: '#F92758',
    flex: 1,
    marginLeft: 10,
  },
  mapSection: {
    backgroundColor: '#D30C7B',
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  ratingSection: {
    backgroundColor: '#FFA686', 
    paddingBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  timer: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFA686',
    marginVertical: 5,
  },
  successMessage: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8DF1D3', 
    marginVertical: 10,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    margin: 10,
  },
  lockerCombo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#333',
    marginTop: 20,
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#D30C7B',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginVertical: 5,
  },
  buttonText: {
    //color: '#fff',
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
  map: {
    width: '90%',
    height: 200,
    borderRadius: 8,
  },
  nearbySection: {
    backgroundColor: '#F92758',
    justifyContent: 'center',
    height: 40,
  },
  trackerSection: {
    backgroundColor: '#1f3c88',
    padding: 14,
    alignItems: 'flex-start',
  },
  trackerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  trackerSubTitle: {
    color: '#d8f3ff',
    fontSize: 16,
    marginTop: 4,
    fontWeight: '600',
  },
  lastUpdate: {
    color: '#c2f7d9',
    marginTop: 6,
    marginBottom: 8,
  },
  fallbackBadge: {
    color: '#1f3c88',
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
    marginTop: 6,
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6c7cab',
    marginBottom: 4,
  },
  timelineDotActive: {
    backgroundColor: '#f9e76d',
  },
  timelineLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  nearbyText: {
    fontWeight: '900',
  },
  arrivalButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  errorMessage: {
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  mediumButton: {
    margin: 10,
    padding: 15,
    backgroundColor: '#D30C7B',
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});

export default PostCheckout;

