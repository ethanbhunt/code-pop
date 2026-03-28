import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Button, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NavBar from '../components/NavBar';
import RatingCarosel from '../components/RatingCarosel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../ip_address';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const PostCheckout = () => {
  const navigation = useNavigation();
  const [lockerCombo, setLockerCombo] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [purchasedDrinks, setPurchasedDrinks] = useState([]);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isNearby, setIsNearby] = useState(false);

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

        return () => clearInterval(locationInterval);
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

          // Add syrupsUsed to the list
          if (drink.syrupsUsed && drink.syrupsUsed.length > 0) {
            allUsedItems.push(...drink.syrupsUsed); // Spread operator to merge arrays
          }

          // Add sodaUsed to the list
          if (drink.sodaUsed && drink.sodaUsed.length > 0) {
            allUsedItems.push(...drink.sodaUsed);
          }

        // Add addIns to the list
          if (drink.addIns && drink.addIns.length > 0) {
            allUsedItems.push(...drink.addIns);
          }
    });

    // Fetch revenue data
     const token = await AsyncStorage.getItem('userToken');
     const inventoryResponse = await fetch(`${BASE_URL}/backend/inventory/report/`, {
       method: 'GET',
       headers: { 
         'Content-Type': 'application/json',
         'Authorization': `Token ${token}`,
       },
     });
     const inventoryData = await inventoryResponse.json();

    // Extract matching InventoryIDs
    const matchingInventoryIDs = inventoryData.data.inventory_items.filter(item => allUsedItems.some(usedItem => usedItem.toLowerCase() === item.itemName.toLowerCase())).map(item => item.inventoryId); // Extract the inventoryId

    for (const id of matchingInventoryIDs)
    {
      try{
       const data = {'usedQuantity': 1};
         const response = await fetch(`${BASE_URL}/backend/inventory/${id}/`, {
           method: 'PATCH',
           headers: { 
             'Content-Type': 'application/json',
             'Authorization': `Token ${token}`,
           },
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
    if(lockerCombo !== ''){
      updateLockerCombo();
    }
  }, [lockerCombo]);

  useEffect(() => {
    // Start countdown timer
    if (timeLeft > 0 && isNearby) {
      const timerId = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
  
      // Clear the interval when the timer reaches 0
      return () => clearInterval(timerId);
    }else{
      completeOrder();
    }
  }, [isNearby, timeLeft]);
  

   const completeOrder = async () => {
      const orderNum = await AsyncStorage.getItem("orderNum");
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${BASE_URL}/backend/orders/${orderNum}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          orderStatus: 'completed',
        }),
      });
    }
  

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
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${BASE_URL}/backend/orders/${orderNum}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          lockerCombo: lockerCombo,
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
            {timeLeft === 0 && <Text style={styles.successMessage}>Your drink is ready!</Text>}
          </View>

          <View style={[styles.section, styles.lockerComboSection]}>
            <Text style={styles.lockerCombo}>Locker combo: {lockerCombo}</Text>
          </View>
        </View>
        {timeLeft === 0 ? (
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
    height: 40
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

