import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BASE_URL } from '../../ip_address';
import DropDown from '../components/DropDown';
import { sodaOptions, syrupOptions, AddInOptions } from '../components/Ingredients';
import NavBar from '../components/NavBar';
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
    const [userPreferences, setUserPreferences] = useState([]);
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
  
        const userPrefs = preferences.filter(item => String(item.UserID) === String(userId));

        const filteredSoda = userPrefs
          .filter(item => sodaOptions.some(opt => opt.value.toLowerCase() === item.Preference.toLowerCase()))
          .map(item => item.Preference.toLowerCase());
        setSoda(filteredSoda);

        const filteredSyrups = userPrefs
          .filter(item => syrupOptions.some(opt => opt.value.toLowerCase() === item.Preference.toLowerCase()))
          .map(item => item.Preference.toLowerCase());
        setSyrups(filteredSyrups);

        const filteredAddIns = userPrefs
          .filter(item => AddInOptions.some(opt => opt.value.toLowerCase() === item.Preference.toLowerCase()))
          .map(item => item.Preference.toLowerCase());
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
          await checkLoginStatus();

          const token = await AsyncStorage.getItem('userToken');
          const userId = await AsyncStorage.getItem('userId');

          if (isMounted && token && userId) {
            fetchUserPreferences(token, userId);
          } else if (isMounted) {
            setIsLoading(false);
          }
        };
        loadData();
        return () => {
          isMounted = false;
        };
      }, []) // Empty dependency array ensures this only runs once when the screen is focused
    );
  
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
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {isLoading ? (  // Conditionally render the content based on loading state
          <Text>Loading...</Text> // You can display a loading spinner or message here
        ) : (
          <>
            {/* If logged in, display the username and Logout button, otherwise display Login button */}
            {isLoggedIn ? (
              <>
                {/* Conditionally render the "Hello <username>" if username exists */}
                {name ? <Text style={styles.greeting}>{name}'s Preferences</Text> : null}
                <View style={styles.navBarSpace}>
                  <DropDown
                    title='Sodas'
                    options={sodaOptions}
                    onSelect={(soda) => handleSelection(soda, 'Soda')} 
                    isOpen={openDropdown.sodas}
                    setOpen={() => setOpenDropdown(prev => ({ ...prev, sodas: !prev.sodas }))}
                    selectedValues={SodaUsed}
                  />
                  <DropDown 
                    title='Syrups' 
                    options={syrupOptions}
                    onSelect={(syrup) => handleSelection(syrup, 'Syrup')} 
                    isOpen={openDropdown.syrups}
                    setOpen={() => setOpenDropdown(prev => ({ ...prev, syrups: !prev.syrups }))}
                    selectedValues={SyrupsUsed}
                    tintByFlavor
                  />
                  <DropDown 
                    title='Add Ins' 
                    options={AddInOptions}
                    onSelect={(addIn) => handleSelection(addIn, 'Add In')} 
                    isOpen={openDropdown.addIns}
                    setOpen={() => setOpenDropdown(prev => ({ ...prev, addIns: !prev.addIns }))}
                    selectedValues={AddIns}
                    tintByFlavor
                  />
                </View>
                
              </>
            ) : (
              <>
                <Text style={styles.greeting}>Login to create drink preferences</Text>
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 120,
  },
  mediumButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#1F7A8C',
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  greeting: {
    fontSize: 27,
    fontWeight: '800',
    color: '#1c334d',
    marginBottom: 10,
  },
  navBarSpace: {
    marginTop: 6,
  }
});

export default PreferencesPage;