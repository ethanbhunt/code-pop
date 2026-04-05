import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../ip_address';
import * as Location from 'expo-location';
import NavBar from '../components/NavBar';
import GeoMap from '../components/map';
import Icon from 'react-native-vector-icons/Ionicons';

const ORDER_POLL_INTERVAL_MS = 5000;

const normalizeOrderPayload = (payload) => {
  const data = payload?.data || payload || {};
  return {
    status: data.OrderStatus || data.orderStatus || 'pending',
    pickupTime: data.PickupTime || data.pickupTime || null,
    lockerCombo: data.LockerCombo || data.lockerCombo || null,
  };
};

const PostCheckout = () => {
  const navigation = useNavigation();
  const [lockerCombo, setLockerCombo] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [orderNum, setOrderNum] = useState(null);
  const [orderLoaded, setOrderLoaded] = useState(false);
  const [orderStatus, setOrderStatus] = useState('pending');
  const [estimatedReadyTime, setEstimatedReadyTime] = useState(null);
  const [lastUpdateText, setLastUpdateText] = useState('Waiting for first update...');
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isNearby, setIsNearby] = useState(false);
  const [pollFailures, setPollFailures] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
            setErrorMsg('Location permission is required to show your proximity to the store.');
            return;
          }

          try {
            let currentLocation = await Location.getCurrentPositionAsync({});
            setLocation(currentLocation);
            setErrorMsg(null);
          } catch (error) {
            setErrorMsg('Unable to read your current location. Arrival tracking may be unavailable.');
          }
        } catch (error) {
          setErrorMsg('Unable to request location permission. Arrival tracking may be unavailable.');
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



  useEffect(() => {
    const updateInventory = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const storedDrinks = await AsyncStorage.getItem("purchasedDrinks");
        const parsedDrinks = storedDrinks ? JSON.parse(storedDrinks) : [];

        const allUsedItems = [];

        parsedDrinks.forEach((drink) => {
          if (drink.SyrupsUsed && drink.SyrupsUsed.length > 0) {
            allUsedItems.push(...drink.SyrupsUsed);
          }
          if (drink.SodaUsed && drink.SodaUsed.length > 0) {
            allUsedItems.push(...drink.SodaUsed);
          }
          if (drink.AddIns && drink.AddIns.length > 0) {
            allUsedItems.push(...drink.AddIns);
          }
        });

        const inventoryResponse = await fetch(`${BASE_URL}/backend/inventory/report/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Token ${token}` } : {}),
          },
        });
        const inventoryData = await inventoryResponse.json();
        const inventoryItems = Array.isArray(inventoryData?.inventory_items)
          ? inventoryData.inventory_items
          : Array.isArray(inventoryData?.data?.inventory_items)
            ? inventoryData.data.inventory_items
            : [];

        const matchingInventoryIDs = inventoryItems
          .filter(item => allUsedItems.some(usedItem => usedItem.toLowerCase() === item.ItemName.toLowerCase()))
          .map(item => item.InventoryID);

        for (const id of matchingInventoryIDs) {
          try {
            const data = { 'used_quantity': 1 };
            const response = await fetch(`${BASE_URL}/backend/inventory/${id}/`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Token ${token}` } : {}),
              },
              body: JSON.stringify(data),
            });

            if (!response.ok) {
              throw new Error('Failed to update Inventory');
            }
          } catch (error) {
            console.error('Error resetting inventory:', error);
          }
        }
      } catch (error) {
        console.error("Error updating inventory:", error);
      }
    };

    updateInventory();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const storedOrderNum = await AsyncStorage.getItem('orderNum');
        if (!active) return;
        setOrderNum(storedOrderNum || null);
        if (!storedOrderNum) {
          setLockerCombo('');
          setOrderStatus('pending');
          setEstimatedReadyTime(null);
          setLastUpdateText('Waiting for first update...');
        } else {
          const cachedOrder = await AsyncStorage.getItem(`orderStatusCache:${storedOrderNum}`);
          if (cachedOrder) {
            try {
              const parsedCache = JSON.parse(cachedOrder);
              setOrderStatus(parsedCache.status || 'pending');
              setEstimatedReadyTime(parsedCache.pickupTime || null);
              if (parsedCache.lockerCombo) {
                setLockerCombo(parsedCache.lockerCombo);
              }
              if (parsedCache.lastUpdated) {
                setLastUpdateText(`Last synced: ${new Date(parsedCache.lastUpdated).toLocaleTimeString()}`);
              }
            } catch {
              // Ignore stale cache parse failures and continue with live poll.
            }
          }
        }
        setOrderLoaded(true);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    if (!orderNum) return;
    handleLockerCombo();
  }, [orderNum]);

  useEffect(() => {
    if (!orderNum || lockerCombo === '') return;
    updateLockerCombo();
  }, [lockerCombo, orderNum]);

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
        const token = await AsyncStorage.getItem('userToken');
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers.Authorization = `Token ${token}`;
        }

        const response = await fetch(`${BASE_URL}/backend/orders/${orderNum}/`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Order poll failed: ${response.status}`);
        }

        const payload = await response.json();
        const normalized = normalizeOrderPayload(payload);

        setOrderStatus(normalized.status);
        setEstimatedReadyTime(normalized.pickupTime);
        if (normalized.lockerCombo && !lockerCombo) {
          setLockerCombo(String(normalized.lockerCombo));
        }
        setLastUpdateText(`Live update: ${new Date().toLocaleTimeString()}`);
        setPollFailures(0);

        await AsyncStorage.setItem(
          `orderStatusCache:${orderNum}`,
          JSON.stringify({
            status: normalized.status,
            pickupTime: normalized.pickupTime,
            lockerCombo: normalized.lockerCombo || lockerCombo || null,
            lastUpdated: new Date().toISOString(),
          })
        );
      } catch (error) {
        console.error('Polling order failed:', error);
        setPollFailures((prev) => prev + 1);
        setLastUpdateText('Live update unavailable. Retrying...');
      }
    };

    pollOrder();
    const pollId = setInterval(pollOrder, ORDER_POLL_INTERVAL_MS);

    return () => clearInterval(pollId);
  }, [orderNum, lockerCombo]);
  

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
    if (!orderNum) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Token ${token}`;
      }

      await fetch(`${BASE_URL}/backend/orders/${orderNum}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          LockerCombo: lockerCombo,
        }),
      });
    } catch (error) {
      console.error('Failed to persist locker combo:', error);
    }
  };

  // Convert timeLeft to minutes and seconds format
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  // Function for the "I've Arrived" button
  const handleUserArrived = () => {
    setIsNearby(true);
  };

  // Manual refresh function for impatient users
  const handleManualRefresh = async () => {
    if (isRefreshing || !orderNum) return;
    setIsRefreshing(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/backend/orders/${orderNum}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {}),
        },
      });
      if (response.ok) {
        const orderData = normalizeOrderPayload(await response.json());
        setOrderStatus(orderData.status);
        setEstimatedReadyTime(orderData.pickupTime);
        if (orderData.lockerCombo) {
          setLockerCombo(orderData.lockerCombo);
        }
        setLastUpdateText(`Last updated: ${new Date().toLocaleTimeString()}`);
        setPollFailures(0);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Manual refresh failed:', error);
      setPollFailures(prev => prev + 1);
    } finally {
      setIsRefreshing(false);
    }
  };

  const goHomePage = () => {
    navigation.navigate('GeneralHome');  // Navigate to the login page
  };

  const getStatusLabel = (status) => {
    if (status === 'pending') return 'Queued';
    if (status === 'processing') return 'Mixing';
    if (status === 'completed') return 'Ready';
    return status;
  };

  const currentStatusIndex = Math.max(0, statusTimeline.indexOf(orderStatus));
  const progressPercent = `${((currentStatusIndex + 1) / statusTimeline.length) * 100}%`;

  if (!orderLoaded) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollViewContainer}>
          <ActivityIndicator size="large" color="#1F7A8C" style={{ marginTop: 24 }} />
        </ScrollView>
        <NavBar />
      </View>
    );
  }

  if (!orderNum) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.flexFill} contentContainerStyle={styles.emptyStateContent}>
          <Text style={styles.emptyStateText}>Create an order to track it</Text>
        </ScrollView>
        <NavBar />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <View style={{flex: 1}}>
              <Text style={styles.headerEyebrow}>Live Tracking</Text>
              <Text style={styles.headerTitle}>Order #{orderNum || '---'}</Text>
            </View>
            <TouchableOpacity 
              onPress={handleManualRefresh} 
              disabled={isRefreshing}
              style={styles.refreshButton}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Icon name="refresh" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.headerStatus}>Status: {getStatusLabel(orderStatus)}</Text>
          <View style={styles.statusDescriptionRow}>
            <Text style={styles.statusDescription}>
              {orderStatus === 'pending' && '⏳ Your order is queued. We are preparing other drinks first.'}
              {orderStatus === 'processing' && '🥤 We are currently mixing your drink!'}
              {orderStatus === 'completed' && '✅ Your drink is ready for pickup!'}
            </Text>
          </View>
          
          <Text style={styles.headerEta}>Ready in: {minutes}:{seconds}</Text>
          <Text style={styles.lastUpdate}>{lastUpdateText}</Text>
          {pollFailures > 0 ? (
            <Text style={styles.pollWarning}>
              Connection is unstable. Showing last known order state.
            </Text>
          ) : null}
          {errorMsg && <Text style={styles.errorMessage}>{errorMsg}</Text>}

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
            <View style={[styles.proximityCard, styles.proximityNearby]}>
              <Text style={styles.proximityEmoji}>📍</Text>
              <View style={{flex: 1}}>
                <Text style={styles.proximityTitle}>You're Here!</Text>
                <Text style={styles.proximityDescription}>The team is preparing your drink now.</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.proximityCard, styles.proximityFar]}>
              <Text style={styles.proximityEmoji}>📍</Text>
              <View style={{flex: 1}}>
                <Text style={styles.proximityTitle}>Come Closer</Text>
                <Text style={styles.proximityDescription}>Arrive within 500 yards and we'll start making your drink.</Text>
              </View>
            </View>
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
          <GeoMap
            latitude={storeLocation.latitude}
            longitude={storeLocation.longitude}
            userLatitude={location?.coords?.latitude}
            userLongitude={location?.coords?.longitude}
            title="Code Pop"
            description="Store location and your current position"
          />
        </View>

        {orderStatus === 'completed' ? (
          <TouchableOpacity onPress={goHomePage} style={styles.button}>
            <Text style={styles.buttonText}>Back To Home Page</Text>
          </TouchableOpacity>
        ) : !isNearby ? (
          <TouchableOpacity onPress={handleUserArrived} style={styles.button}>
            <Text style={styles.buttonText}>I've Arrived</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
      <NavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollViewContainer: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 120,
  },
  flexFill: {
    flex: 1,
  },
  emptyStateContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 120,
  },
  headerCard: {
    width: '100%',
    borderRadius: 15,
    padding: 16,
    backgroundColor: '#022B3A',
    shadowColor: '#0f2538',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 7,
  },
  headerEyebrow: {
    color: '#BFDBF7',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 6,
    lineHeight: 31,
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
    backgroundColor: '#0f4a5e',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#BFDBF7',
  },
  summaryRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  mapSection: {
    marginTop: 12,
    width: '100%',
    padding: 0,
  },
  summaryLabel: {
    color: '#49627d',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#1c334d',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  successMessage: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F7A8C',
    marginTop: 6,
  },
  button: {
    backgroundColor: '#1F7A8C',
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  nearbySection: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ffffff',
    padding: 12,
  },
  lastUpdate: {
    color: '#dcefff',
    marginTop: 6,
    marginBottom: 8,
    fontWeight: '600',
  },
  pollWarning: {
    color: '#BFDBF7',
    marginBottom: 8,
    fontWeight: '600',
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
    backgroundColor: '#1F7A8C',
  },
  timelineLabel: {
    color: '#dcefff',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineLabelActive: {
    color: '#ffffff',
  },
  nearbyText: {
    fontWeight: '700',
    color: '#49627d',
  },
  errorMessage: {
    fontWeight: '700',
    color: '#49627d',
    marginBottom: 10,
    textAlign: 'center',
  },
  mapTitle: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: '800',
    color: '#1c334d',
    marginBottom: 10,
  },
  loadingText: {
    color: '#49627d',
    fontWeight: '600',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c334d',
    textAlign: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDescriptionRow: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1F7A8C',
  },
  statusDescriptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1c334d',
    lineHeight: 18,
  },
  proximityCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 14,
    paddingVertical: 12,
  },
  proximityNearby: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  proximityFar: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  proximityEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  proximityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1c334d',
    marginBottom: 2,
  },
  proximityDescription: {
    fontSize: 12,
    fontWeight: '500',
    color: '#49627d',
    lineHeight: 16,
  },
});

export default PostCheckout;

