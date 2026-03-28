import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import NavBar from '../components/NavBar';
import DropDown from '../components/DropDown';
import { useNavigation } from '@react-navigation/native';
import { sodaOptions, syrupOptions, AddInOptions } from '../components/Ingredients';
import Gif from '../components/Gif';
import {BASE_URL} from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';

// todo:
  // the options in the drop downs still dont preselect like the drink size and ice ammount do
    // probably something to do with the lowercase/spelling

const UpdateDrink = ({route, navigation}) => {
  
  const { drink } = route.params;
  const [searchText, setSearchText] = useState('');

  const [SodaUsed, setSoda] = useState([]);
  const [SyrupsUsed, setSyrups] = useState([]);
  const [AddIns, setAddIns] = useState([]);
  const [selectedSize, setSize] = useState(null);
  const [selectedIce, setIce] = useState(null);

   console.log(drink)
   console.log(drink.sodaUsed)

   // State for dropdown open status
   const [openDropdown, setOpenDropdown] = useState({
     sodas: false,
     syrups: false,
     juices: false,
   });

   useEffect(() => {
     if (drink) {
       setSoda(drink.sodaUsed || []);
       setSyrups(drink.syrupsUsed || []);
       setAddIns(drink.addIns || []);
       setSize(drink.size || null);
       setIce(drink.ice || null);
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
    
         const response = await fetch(`${BASE_URL}/backend/drinks/${drink.drinkId}/`, {
           method: 'PUT',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Token ${token}`,
           },
           body: JSON.stringify({
             name: "Updated Drink",
             sodaUsed: SodaUsed,
             syrupsUsed: SyrupsUsed,
             addIns: AddIns,
             price: 2.00, // Adjust price as needed
             userCreated: true,
            size: selectedSize,
            ice: selectedIce,
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

  // reactive gif stuff
  const getLayers = (soda, syrups, addins) => {
    const layers = [];
    const totalItems = soda.length + syrups.length + addins.length;
  
    soda.forEach((sodaName) => {
      const sodaOption = sodaOptions.find((opt) => opt.label === sodaName);
      if (sodaOption) {
        layers.push({ color: sodaOption.color, height: 100 / totalItems });
      } else {
      }
    });
  
    syrups.forEach((syrupName) => {
      const syrupOption = syrupOptions.find((opt) => opt.label === syrupName);
      if (syrupOption) {
        layers.push({ color: syrupOption.color, height: 100 / totalItems });
      } else {
      }
    });
  
    addins.forEach((addinName) => {
      const addInOption = AddInOptions.find((opt) => opt.label === addinName); 
      if (addInOption) {
        layers.push({ color: addInOption.color, height: 100 / totalItems });
      } else {
      }
    });
    return layers;
  };  
  
  const layers = getLayers(SodaUsed, SyrupsUsed, AddIns);
  
  return (
    <View style={styles.wholePage}>

      <ScrollView style={styles.padding}>
      <View style={styles.rowContainer}>
        {/* Size buttons on the left */}
        <View style={styles.buttonContainerLeft}>
          {['16oz', '24oz', '32oz'].map((size) => (
            <TouchableOpacity
              key={size}
              onPress={() => handleSizeSelection(size)}
              style={[
                styles.circularButton,
                selectedSize === size && styles.circularButtonSelected,
              ]}
            >
              <Text style={[styles.buttonText, selectedSize === size && styles.selectedButtonText]}>
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        
        <View style={styles.graphicContainer}>
          <Gif layers={layers}/>
        </View>

        {/* Ice buttons on the right */}
        <View style={styles.buttonContainerRight}>
          {['none', 'light', 'regular', 'extra'].map((ice) => (
            <TouchableOpacity
              key={ice}
              onPress={() => handleIceSelection(ice)}
              style={[
                styles.circularButton,
                selectedIce === ice && styles.circularButtonSelected,
              ]}
            >
              <Text style={[styles.buttonText, selectedIce === ice && styles.selectedButtonText]}>{ice}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Button to add to cart */}
      <TouchableOpacity onPress={updateDrink} style={styles.button}>
        <Text style={styles.buttonText}>Update</Text>
      </TouchableOpacity>

      {/* Search Input */}
      <TextInput
        placeholder="Search ingredients"
        style={styles.searchInput}
        value={searchText}
        onChangeText={handleSearch}
      />

      {/* Dropdowns */}
      <View style={styles.navBarSpace}>
      {/* <DropDown 
        title="Sodas" 
        options={filterOptions(sodaOptions, SodaUsed)} 
        onSelect={handleSodaSelection} 
        isOpen={openDropdown.sodas}
        setOpen={() => setOpenDropdown(prev => ({ ...prev, sodas: !prev.sodas }))}
        selectedValues={SodaUsed} // Pass the updated state
      /> */}
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
      </ScrollView>
      <NavBar/>
    </View>
  );
};

const styles = StyleSheet.create({
  wholePage: {
    flex: 1,
    backgroundColor: '#FFA686',
    // padding: 10,
  },
  padding: {
    padding: 10,
  },
  navBarSpace: {
    marginBottom: 80,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10, // Add padding on sides
    flex: 1,
  },
  buttonContainerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    width: '30%', // Adjust width as needed
  },
  buttonContainerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '30%', // Adjust width as needed
  },
  graphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // Center the graphic
  },
  drinkGraphicText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
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
    color: '#fff',
    fontSize: 16,
  },
  circularButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#D30C7B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F92758',
    margin: 5,
  },
  circularButtonSelected: {
    borderColor: '#8DF1D3',
    backgroundColor: '#E8F5E9',
  },
  selectedButtonText: {
    color: '#000', // Black color for selected text
  },
  searchInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 3,
    paddingHorizontal: 10,
    width: '80%',
    marginVertical: 15,
    borderRadius: 5,
    alignSelf: 'center', // Center the search input
  },
});

export default UpdateDrink;