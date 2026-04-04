import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import NavBar from '../components/NavBar';
import DropDown from '../components/DropDown';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import Gif from '../components/Gif';
import { sodaOptions, syrupOptions, AddInOptions } from '../components/Ingredients';
import {BASE_URL} from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';
import AIAlert from '../components/AIAlert';


const CreateDrinkPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [drinkDict, setDrinkDict] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [aiPromptText, setAiPromptText] = useState('');
  const [lastPrompt, setLastPrompt] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openDropdown, setOpenDropdown] = useState({
    sodas: false,
    syrups: false,
    addins: false,
  });

  // variables to add to drink object
  const [SodaUsed, setSoda] = useState([]);
  const [SyrupsUsed, setSyrups] = useState([]);
  const [AddIns, setAddIns] = useState([]);
  const [selectedSize, setSize] = useState(null);
  const [selectedIce, setIce] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      // Auto-generation disabled; user must manually click Random Drink or enter a prompt
      resetDrinkForm();
    }, [route.params?.fromGenerateButton, route.params?.fromCartPage])
  );

  const resetDrinkForm = () => {
    setSoda([]);  // Clear selected sodas
    setSyrups([]);  // Clear selected syrups
    setAddIns([]);  // Clear selected add-ins
    setIce(null);  // Clear selected ice amount
    setSize(null);  // Clear selected size
  };
  
  const addToCart = async () => {
     try {
       // check if ice and size have been selected
       if(selectedIce == null || selectedSize == null || SodaUsed.length == 0){

         Alert.alert("Choose soda, size, and ice before adding your drink.")

       }else{
         const token = await AsyncStorage.getItem('userToken');
         const response = await fetch(`${BASE_URL}/backend/drinks/`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Token ${token}`,
           },
           body: JSON.stringify({ 
             name: "Drink in User Cart",  // Example name for the drink
             sodaUsed: SodaUsed,  // Default value if SodaUsed is null
             syrupsUsed: SyrupsUsed,
             addIns: AddIns,
             price: 2.00,
             userCreated: true,    // Assuming the user is creating the drink
             size: selectedSize,
             ice: selectedIce,
           })
        });
    
        if (!response.ok) {
          throw new Error(`Failed to add drink. Status: ${response.status}`);
        }
         // add drink item (the drinks ID) to the checkout list from App.js
         try{
           // gets list of out of storage on your phone
           let cartList = await AsyncStorage.getItem("checkoutList");
           const currentList = cartList ? JSON.parse(cartList) : [];
           // takes the response (what we get after we create a drink) and extracts the drinkID
           const data = await response.json();
           const drinkID = data.data?.drinkId || data.drinkId;
           // add the drinkID to the checkoutList
           const updatedList = [...currentList, drinkID]
           // Saves the checkoutlist back into the storage on the phone
           await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));
         }catch (error){
           console.log(error)
         }

        navigation.navigate('Cart');
      }
    } catch (error) {
      console.error('Error adding drink to cart:', error);
    }
  };  
  

  const handleSizeSelection = (size) => {
    setSize(size);
  };
  
  const handleIceSelection = (ice) => {
    setIce(ice);
  };

  const handleSodaSelection = (soda) => {
    setSoda((prevSodas) => {
      if (prevSodas.includes(soda)) {
        // If soda is already selected, remove it
        return prevSodas.filter((item) => item !== soda);
      } else {
        // Otherwise, add the soda to the list
        return [...prevSodas, soda];
      }
    });
  };
  
  
  const handleSyrupSelection = (syrup) => {
    setSyrups((prevSyrups) => {
      if (prevSyrups.includes(syrup)) {
        // If soda is already selected, remove it
        return prevSyrups.filter((item) => item !== syrup);
      } else {
        // Otherwise, add the soda to the list
        return [...prevSyrups, syrup];
      }
    });
  };

  const handleAddInSelection = (addIn) => {
    setAddIns((prevAdd) => {
      if (prevAdd.includes(addIn)) {
        // If soda is already selected, remove it
        return prevAdd.filter((item) => item !== addIn);
      } else {
        // Otherwise, add the soda to the list
        return [...prevAdd, addIn];
      }
    });
  };
  
  // search and list stiff
  const filterOptions = (options = []) => {
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const handleSearch = (text) => {
    setSearchText(text);
    setOpenDropdown({
      sodas: !!text,
      syrups: !!text,
      addins: !!text,
    });
  };
  
  // function for generate drink button which generates a drink with AI   
    
  const GenerateAI = async () => {
     setIsGenerating(true);
     try {
       const user_id = await AsyncStorage.getItem('userId');
       const token = await AsyncStorage.getItem('userToken');
       let url = `${BASE_URL}/backend/generate/`;

       if (user_id) {
         url = `${BASE_URL}/backend/generate/${user_id}/`;
       }

       const response = await fetch(url, {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Token ${token}`,
         }
       });

      if (!response.ok) {
        throw new Error(`Error when trying to generate AI drink. Status: ${response.status}`);
      }

      const drink = await response.json();
      setDrinkDict(drink);
      setLastPrompt(null);
      setModalVisible(true);
      console.log(drink);
    }
    catch (error) {
      console.error('Error when trying to generate AI drink:', error);
      Alert.alert('AI generator unavailable', 'Try again in a moment.');
    } finally {
      setIsGenerating(false);
    }
  };

  const GenerateAIFromPrompt = async (promptText) => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    try {
      const user_id = await AsyncStorage.getItem('userId');
      let url = `${BASE_URL}/backend/generate/`;

      if (user_id) {
        url = `${BASE_URL}/backend/generate/${user_id}/`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) {
        throw new Error(`Error generating AI drink from prompt. Status: ${response.status}`);
      }

      const drink = await response.json();
      setDrinkDict(drink);
      setLastPrompt(promptText);
      setModalVisible(true);
      setAiPromptText('');
      console.log(drink);
    } catch (error) {
      console.error('Error generating AI drink from prompt:', error);
      Alert.alert('Prompt generation failed', 'Please try a different prompt.');
    } finally {
      setIsGenerating(false);
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
      const addInOption = AddInOptions.find((opt) => opt.label === addinName); // Assuming AddIns use syrupOptions
      if (addInOption) {
        layers.push({ color: addInOption.color, height: 100 / totalItems });
      } else {
      }
    });
    return layers;
  };  
  
  const layers = getLayers(SodaUsed, SyrupsUsed, AddIns);

  const formatSelection = (list) => (list.length ? list.join(', ') : 'None');
  

  return (
    <View style={styles.wholePage}>
      <ScrollView style={styles.padding} contentContainerStyle={styles.contentContainer}>
        <View style={styles.aiHeroCard}>
          <Text style={styles.heroLabel}>AI Mixologist</Text>
          <Text style={styles.heroTitle}>Randomize your drink!</Text>
          <Text style={styles.heroBody}>
            Enter what drink, syrups, or add-ins you want included.
          </Text>

          <View style={styles.aiPromptContainer}>
            <TextInput
              placeholder="Enter your drink keywords"
              placeholderTextColor="#7b8da1"
              style={styles.aiPromptInput}
              value={aiPromptText}
              onChangeText={setAiPromptText}
              onSubmitEditing={() => GenerateAIFromPrompt(aiPromptText)}
            />
            <TouchableOpacity
              onPress={() => GenerateAIFromPrompt(aiPromptText)}
              style={styles.aiSendButton}
              disabled={isGenerating}
            >
              <Text style={styles.aiSendButtonText}>{isGenerating ? '...' : 'Go'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={GenerateAI} style={styles.randomDrinkButton} disabled={isGenerating}>
            <Text style={styles.randomDrinkButtonText}>{isGenerating ? 'Generating...' : 'Surprise Me'}</Text>
          </TouchableOpacity>
        </View>

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

        {drinkDict && (
          <AIAlert
            isModalVisible={isModalVisible}
            toggleModal={() => (setModalVisible(false))}
            drinkDict={drinkDict}
            onRegenerate={() => {
              if (lastPrompt) {
                GenerateAIFromPrompt(lastPrompt);
              } else {
                GenerateAI();
              }
            }}
          />
        )}

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
            options={filterOptions(sodaOptions)}
            onSelect={handleSodaSelection}
            isOpen={openDropdown.sodas}
            setOpen={() => setOpenDropdown(prev => ({ ...prev, sodas: !prev.sodas }))}
            selectedValues={SodaUsed}
          />
          <DropDown
            title="Syrups"
            options={filterOptions(syrupOptions)}
            onSelect={handleSyrupSelection}
            isOpen={openDropdown.syrups}
            setOpen={() => setOpenDropdown(prev => ({ ...prev, syrups: !prev.syrups }))}
            selectedValues={SyrupsUsed}
            tintByFlavor
          />
          <DropDown
            title="AddIns"
            options={filterOptions(AddInOptions)}
            onSelect={handleAddInSelection}
            isOpen={openDropdown.addins}
            setOpen={() => setOpenDropdown(prev => ({ ...prev, addins: !prev.addins }))}
            selectedValues={AddIns}
            tintByFlavor
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeading}>Current Drink</Text>
          <Text style={styles.summaryText}>Size: {selectedSize || 'None'}</Text>
          <Text style={styles.summaryText}>Ice: {selectedIce || 'None'}</Text>
          <Text style={styles.summaryText}>Soda: {formatSelection(SodaUsed)}</Text>
          <Text style={styles.summaryText}>Syrups: {formatSelection(SyrupsUsed)}</Text>
          <Text style={styles.summaryText}>Add-ins: {formatSelection(AddIns)}</Text>
        </View>

        <TouchableOpacity onPress={addToCart} style={styles.button}>
            <Text style={styles.buttonText}>Add to Cart</Text>
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
  aiHeroCard: {
    borderRadius: 15,
    backgroundColor: '#022B3A',
    padding: 16,
    shadowColor: '#0f2538',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 7,
  },
  heroLabel: {
    color: '#BFDBF7',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 6,
    color: '#fff',
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 31,
  },
  heroBody: {
    marginTop: 8,
    color: '#dcefff',
    fontSize: 14,
    lineHeight: 20,
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
  graphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
    marginTop: 12,
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
  aiPromptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  aiPromptInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d6e5f3',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#243b52',
  },
  aiSendButton: {
    marginLeft: 6,
    backgroundColor: '#1F7A8C',
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  aiSendButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  randomDrinkButton: {
    backgroundColor: '#BFDBF7',
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  randomDrinkButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
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
  ingredientsTitle: {
    color: '#1c334d',
    fontSize: 18,
    fontWeight: '800',
  },
});

export default CreateDrinkPage;
