import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { BASE_URL } from '../../ip_address';
import DropDown from '../components/DropDown';
import React from 'react';

const PreferencesPage = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [name, setName] = useState(null);
    const [openDropdown, setOpenDropdown] = useState({
      sodas: false,
      syrups: false,
      addIns: false,
    });
    const [SodaUsed, setSoda] = useState([]);
    const [SyrupsUsed, setSyrups] = useState([]);
    const [AddIns, setAddIns] = useState([]);
    const [inventoryData, setInventoryData] = useState([]);
    const [userPreferences, setUserPreferences] = useState([]); // To store fetched preferences
    const [isLoading, setIsLoading] = useState(true); // Add loading state
    const navigation = useNavigation();
  
    // useEffect to check login status once on initial load
    const checkLoginStatus = async () => {
      try {
        const storedName = await AsyncStorage.getItem('first_name');
        const token = await AsyncStorage.getItem('userToken');
        if (token && storedName) {
          setIsLoggedIn(true); // User is logged in
          setName(storedName); // Set username for display
        } else {
          setIsLoggedIn(false); // No user is logged in
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };
  
     const fetchInventory = async () => {
       try {
         const token = await AsyncStorage.getItem('userToken');
         const response = await fetch(`${BASE_URL}/backend/inventory/`, {
           method: 'GET',
           headers: { 
             'Content-Type': 'application/json',
             'Authorization': `Token ${token}`,
           },
         });
         const inventory = await response.json();
         const items = inventory.map(item => ({
           value: item.ItemName,
           ItemType: item.ItemType,
         }));
         setInventoryData(items);
       } catch (error) {
         console.error('Error fetching inventory:', error);
       }
     };
  
    const fetchUserPreferences = async (token, userId) => {
      try {
        const response = await fetch(`${BASE_URL}/backend/preferences/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
          },
        });
        const preferences = await response.json();
        setUserPreferences(preferences); // Store the preferences in state
  
        // Preselect preferences based on the user's saved preferences
        const filteredSoda = preferences
          .filter(item => filterInventory("Soda").some(inventoryItem => inventoryItem.value.toLowerCase() === item.Preference.toLowerCase() && String(item.UserID) === String(userId)))
          .map(item => item.Preference);
        setSoda(filteredSoda);
  
        const filteredSyrups = preferences
          .filter(item => filterInventory("Syrup").some(inventoryItem => inventoryItem.value.toLowerCase() === item.Preference.toLowerCase() && String(item.UserID) === String(userId)))
          .map(item => item.Preference);
        setSyrups(filteredSyrups);
  
        const filteredAddIns = preferences
          .filter(item => filterInventory("Add In").some(inventoryItem => inventoryItem.value.toLowerCase() === item.Preference.toLowerCase() && String(item.UserID) === String(userId)))
          .map(item => item.Preference);
        setAddIns(filteredAddIns);
  
        setIsLoading(false); // Set loading to false once preferences are fetched
      } catch (error) {
        console.error("Error fetching preferences:", error);
      }
    };
  
    useFocusEffect(
      React.useCallback(() => {
        let isMounted = true;
        const loadData = async () => {
          await checkLoginStatus(); // Check login status
  
          const token = await AsyncStorage.getItem('userToken');
          const userId = await AsyncStorage.getItem('userId');
  
          if (isMounted && token && userId) {
            fetchInventory(); // Fetch inventory once login is successful
            fetchUserPreferences(isMounted && token, userId); // Fetch preferences for the user
          }
        };
        loadData();
        return () => {
          isMounted = false;
        };
      }, []) // Empty dependency array ensures this only runs once when the screen is focused
    );
  
    const filterInventory = (type) => {
      const filteredItems = inventoryData.filter(item => item.ItemType === type);
      return filteredItems.map(item => ({
        label: item.value,
        value: item.value,
      }));
    };
  
    const handleSelection = (item, type) => {
      switch (type) {
        case 'Soda':
          setSoda((prevSodas) => {
            let soda = item;
            if (prevSodas.includes(soda.toLowerCase())) {
              // If soda is already selected, remove it
              removePreferences(soda);
              return prevSodas.filter((item) => item !== soda.toLowerCase());
            } else {
              // Otherwise, add the soda to the list and save it
              savePreferences(soda);
              return [...prevSodas, soda.toLowerCase()];
            }
          });
          break;
        case 'Syrup':
          setSyrups((prevSyrups) => {
            let syrup = item;
            if (prevSyrups.includes(syrup.toLowerCase())) {
              // If syrup is already selected, remove it
              removePreferences(syrup);
              return prevSyrups.filter((item) => item !== syrup.toLowerCase());
            } else {
              // Otherwise, add the syrup to the list and save it
              savePreferences(syrup);
              return [...prevSyrups, syrup.toLowerCase()];
            }
          });
          break;
        case 'Add In':
          let addIn = item;
          setAddIns((prevAddIns) => {
            if (prevAddIns.includes(addIn.toLowerCase())) {
              // If add-in is already selected, remove it
              removePreferences(addIn);
              return prevAddIns.filter((item) => item !== addIn.toLowerCase());
            } else {
              // Otherwise, add the add-in to the list and save it
              savePreferences(addIn);
              return [...prevAddIns, addIn.toLowerCase()];
            }
          });
          break;
      }
    };
    
    const savePreferencesToBackend = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      
      // Save each preference to the backend
      for (let soda of SodaUsed) {
        await savePreferences(soda, 'Soda');
      }
    
      for (let syrup of SyrupsUsed) {
        await savePreferences(syrup, 'Syrup');
      }
    
      for (let addIn of AddIns) {
        await savePreferences(addIn, 'AddIn');
      }
    };
  
    const savePreferences = async (pref, type) => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userId = await AsyncStorage.getItem('userId');
        const response = await fetch(`${BASE_URL}/backend/preferences/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
          },
          body: JSON.stringify({
            UserID: userId,
            Preference: pref,
          }),
        });
        if (!response.ok) {
          throw new Error(`Failed to save ${type} preference`);
        }
      } catch (error) {
        console.error(error);
      }
    };
  
    const removePreferences = async (pref) => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userId = await AsyncStorage.getItem('userId');
        
        const getResponse = await fetch(`${BASE_URL}/backend/preferences/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
          },
        });
    
        const preferences = await getResponse.json();
    
        // Filter out preferences that belong to the current user and match the preference to be removed
        const filteredPreferences = preferences.filter(
          (item) => String(item.UserID) === String(userId) && item.Preference.toLowerCase() === pref.toLowerCase()
        );
    
        for (let preference of filteredPreferences) {
          const deleteResponse = await fetch(`${BASE_URL}/backend/preferences/${preference.PreferenceID}/`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token ${token}`,
            },
          });
    
          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            throw new Error(`Failed to delete preference: ${errorData}`);
          }
        }
      } catch (error) {
        console.error('Error removing preference:', error);
      }
    };
    
  
    const goToLoginPage = () => {
      navigation.navigate('Auth');
    };

  return (
    <View style={styles.container}>
      <Image 
                source={require('../../assets/PinkBubbles.png')}
                style={styles.image}
                resizeMode="cover"
            />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {isLoading ? (  // Conditionally render the content based on loading state
          <Text>Loading...</Text> // You can display a loading spinner or message here
        ) : (
          <>
            {/* If logged in, display the username and Logout button, otherwise display Login button */}
            {isLoggedIn ? (
              <>
                {/* Conditionally render the "Hello <username>" if username exists */}
                {name ? <Text style={styles.greeting}>{name}'s Drinks</Text> : null}
                <View style={styles.navBarSpace}>
                  {/* <Text style={styles.subtitleText}>Saved Drinks (can be created on ratings page)</Text> */}
                  <Text style={styles.subtitleText}>Preferences</Text>
                  {/* <Text>{SodaUsed}</Text> */}
                  <DropDown
                    title='Sodas'
                    options={filterInventory("Soda")}
                    onSelect={(soda) => handleSelection(soda, 'Soda')} 
                    isOpen={openDropdown.sodas}
                    setOpen={() => setOpenDropdown(prev => ({ ...prev, sodas: !prev.sodas }))}
                    selectedValues={SodaUsed} // Pass selected values for prepopulation
                  />
                  <DropDown 
                    title='Syrups' 
                    options={filterInventory("Syrup")} 
                    onSelect={(syrup) => handleSelection(syrup, 'Syrup')} 
                    isOpen={openDropdown.syrups}
                    setOpen={() => setOpenDropdown(prev => ({ ...prev, syrups: !prev.syrups }))}
                    selectedValues={SyrupsUsed} // Pass selected values for prepopulation
                  />
                  <DropDown 
                    title='Add ins' 
                    options={filterInventory("Add In")} 
                    onSelect={(addIns) => handleSelection(addIns, 'Add In')} 
                    isOpen={openDropdown.addIns}
                    setOpen={() => setOpenDropdown(prev => ({ ...prev, addIns: !prev.addIns }))}
                    selectedValues={AddIns} // Pass selected values for prepopulation
                  />
                </View>
                
              </>
            ) : (
              <>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity onPress={goToLoginPage} style={styles.mediumButton}>
                    <Text style={styles.buttonText}>Login</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '150%',
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#C6C8EE',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  buttonText: {
    fontSize: 16,
    color: 'white',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  carousel: {
    margin: 0,
    padding: 0,
  },
  title: {
    fontSize: 22,
  },
  subtitleText: {
    margin: 10,
    fontSize: 20,
    backgroundColor: '#F92758',
    color: '#fff',
    padding: 10,
    textAlign: 'center',
  }
});

export default PreferencesPage;