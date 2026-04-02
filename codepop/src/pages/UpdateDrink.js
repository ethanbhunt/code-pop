import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import NavBar from '../components/NavBar';
import DropDown from '../components/DropDown';
import { useNavigation } from '@react-navigation/native';
import { sodaOptions, syrupOptions, AddInOptions } from '../components/Ingredients';
import {BASE_URL} from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';

const UpdateDrink = ({route, navigation}) => {
  
  const { drink } = route.params;
  const [searchText, setSearchText] = useState('');

  const [SodaUsed, setSoda] = useState([]);
  const [SyrupsUsed, setSyrups] = useState([]);
  const [AddIns, setAddIns] = useState([]);
  const [selectedSize, setSize] = useState(null);
  const [selectedIce, setIce] = useState(null);

  console.log(drink)
  console.log(drink.SodaUsed)

  // State for dropdown open status
  const [openDropdown, setOpenDropdown] = useState({
    sodas: false,
    syrups: false,
    juices: false,
  });

  const iceLabels = ['No Ice', 'Light', 'Regular', 'Extra'];

  const normalizeIce = (value) => {
    if (!value) return null;
    const lower = value.toLowerCase();
    if (lower === 'none' || lower === 'no ice') return 'No Ice';
    return iceLabels.find(l => l.toLowerCase() === lower) || value;
  };

  useEffect(() => {
    if (drink) {
      setSoda(drink.SodaUsed || []);
      setSyrups(drink.SyrupsUsed || []);
      setAddIns(drink.AddIns || []);
      setSize(drink.Size || null);
      setIce(normalizeIce(drink.Ice));
    }
  }, [drink]);

  const handleSizeSelection = (size) => {
    setSize(size);
  };
  
  const handleIceSelection = (ice) => {
    setIce(ice);
  };

  // const handleSodaSelection = (selected) => {
  //   // Toggle selection for soda
  //   setSoda((prevSodas) => {
  //     if (prevSodas.includes(selected)) {
  //       return prevSodas.filter((soda) => soda !== selected);
  //     } else {
  //       return [...prevSodas, selected];
  //     }
  //   });
  // };
  const handleSodaSelection = (item) => {
    setSoda((prevSodaUsed) => {
      if (prevSodaUsed.includes(item)) {
        return prevSodaUsed.filter(soda => soda !== item); // Deselect item
      } else {
        return [...prevSodaUsed, item]; // Select item
      }
    });
  };
  const handleSyrupSelection = (selected) => {
    // Toggle selection for syrup
    setSyrups((prevSyrups) => {
      if (prevSyrups.includes(selected)) {
        return prevSyrups.filter((syrup) => syrup !== selected);
      } else {
        return [...prevSyrups, selected];
      }
    });
  };

  const handleAddInSelection = (selected) => {
    // Toggle selection for add-in
    setAddIns((prevAddIns) => {
      if (prevAddIns.includes(selected)) {
        return prevAddIns.filter((addIn) => addIn !== selected);
      } else {
        return [...prevAddIns, selected];
      }
    });
  };

  const handleSearch = (text) => {
    setSearchText(text);
    setOpenDropdown({
      sodas: !!text,
      syrups: !!text,
      juices: !!text,
    });
  };

  const filterOptions = (options, selectedItems = []) => {
    return options
      .filter(option => 
        option.label.toLowerCase().includes(searchText.toLowerCase())
      )
      .map(option => ({
        ...option,
        selected: selectedItems
          .map(item => item.toLowerCase())
          .includes(option.label.toLowerCase()),
      }));
  }; 
  

  const updateDrink = async () => {
    try {
      // Make sure the user has a soda selected
      if(SodaUsed.length == 0){

        Alert.alert("Dont forget to choose a Soda!")

      }else{
        const token = await AsyncStorage.getItem('userToken');
    
        const response = await fetch(`${BASE_URL}/backend/drinks/${drink.DrinkID}/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Name: "Updated Drink",
            SodaUsed,
            SyrupsUsed,
            AddIns,
            Price: 2.00, // Adjust price as needed
            User_Created: true,
            Size: selectedSize,
            Ice: selectedIce,
          }),
        });
    
        if (!response.ok) {
          throw new Error(`Failed to update drink. Status: ${response.status}`);
        }
    
        navigation.navigate('Cart');
      }
    } catch (error) {
      console.error('Error updating drink:', error);
    }
  };

  return (
    <View style={styles.wholePage}>
      <ScrollView style={styles.padding} contentContainerStyle={styles.contentContainer}>
        <View style={styles.previewCard}>
          <View style={styles.selectionRow}>
            <View style={styles.selectionCard}>
              <Text style={styles.selectionTitle}>Size</Text>
              <View style={styles.selectionPillsWrap}>
                {['16oz', '24oz', '32oz'].map((size) => (
                  <TouchableOpacity
                    key={size}
                    onPress={() => handleSizeSelection(size)}
                    style={[
                      styles.pillButton,
                      selectedSize === size && styles.pillButtonSelected,
                    ]}
                  >
                    <Text style={[styles.pillText, selectedSize === size && styles.pillTextSelected]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.selectionCard}>
              <Text style={styles.selectionTitle}>Ice</Text>
              <View style={styles.selectionPillsWrap}>
                {['No Ice', 'Light', 'Regular', 'Extra'].map((ice) => (
                  <TouchableOpacity
                    key={ice}
                    onPress={() => handleIceSelection(ice)}
                    style={[
                      styles.pillButton,
                      selectedIce === ice && styles.pillButtonSelected,
                    ]}
                  >
                    <Text style={[styles.pillText, selectedIce === ice && styles.pillTextSelected]}>{ice}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.ingredientsCard}>
          <TextInput
            placeholder="Search ingredients"
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearch}
            placeholderTextColor="#6f7f91"
          />

          <DropDown
            title="Sodas"
            options={filterOptions(sodaOptions, SodaUsed)}
            onSelect={handleSodaSelection}
            isOpen={openDropdown.sodas}
            setOpen={() => setOpenDropdown(prev => ({ ...prev, sodas: !prev.sodas }))}
            selectedValues={SodaUsed}
          />
          <DropDown
            title="Syrups"
            options={filterOptions(syrupOptions, SyrupsUsed)}
            onSelect={handleSyrupSelection}
            isOpen={openDropdown.syrups}
            setOpen={() => setOpenDropdown(prev => ({ ...prev, syrups: !prev.syrups }))}
            selectedValues={SyrupsUsed}
          />
          <DropDown
            title="AddIns"
            options={filterOptions(AddInOptions, AddIns)}
            onSelect={handleAddInSelection}
            isOpen={openDropdown.juices}
            setOpen={() => setOpenDropdown(prev => ({ ...prev, juices: !prev.juices }))}
            selectedValues={AddIns}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeading}>Current Drink</Text>
          <Text style={styles.summaryText}>Size: {selectedSize || 'None'}</Text>
          <Text style={styles.summaryText}>Ice: {selectedIce || 'None'}</Text>
          <Text style={styles.summaryText}>Soda: {SodaUsed.length ? SodaUsed.join(', ') : 'None'}</Text>
          <Text style={styles.summaryText}>Syrups: {SyrupsUsed.length ? SyrupsUsed.join(', ') : 'None'}</Text>
          <Text style={styles.summaryText}>Add-ins: {AddIns.length ? AddIns.join(', ') : 'None'}</Text>
        </View>

        <TouchableOpacity onPress={updateDrink} style={styles.button}>
          <Text style={styles.buttonText}>Update</Text>
        </TouchableOpacity>
      </ScrollView>
      <NavBar/>
    </View>
  );
};

const styles = StyleSheet.create({
  wholePage: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  padding: {
    paddingHorizontal: 12,
  },
  contentContainer: {
    paddingTop: 12,
    paddingBottom: 120,
  },
  previewCard: {
    marginTop: 12,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectionCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  selectionTitle: {
    color: '#1c334d',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  selectionPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pillButton: {
    backgroundColor: '#E1E5F2',
    borderWidth: 1,
    borderColor: '#E1E5F2',
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 9,
    marginBottom: 9,
  },
  pillButtonSelected: {
    backgroundColor: '#1F7A8C',
    borderColor: '#1F7A8C',
  },
  pillText: {
    color: '#2f4a66',
    fontWeight: '700',
    fontSize: 12,
  },
  pillTextSelected: {
    color: '#fff',
  },
  ingredientsCard: {
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffffff',
    padding: 12,
  },
  searchInput: {
    borderColor: '#d6e5f3',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: '#fff',
    color: '#243b52',
    marginVertical: 10,
  },
  summaryCard: {
    marginTop: 6,
    borderRadius: 15,
    backgroundColor: '#fff',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  summaryHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1c334d',
    marginBottom: 4,
  },
  summaryText: {
    color: '#49627d',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
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
});

export default UpdateDrink;