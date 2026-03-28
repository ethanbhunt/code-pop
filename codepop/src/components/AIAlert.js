import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {BASE_URL} from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';
import Gif from '../components/Gif';
import { sodaOptions, syrupOptions, AddInOptions } from '../components/Ingredients';
import Modal from 'react-native-modal';

const AIAlert = ({ isModalVisible, toggleModal, drinkDict, onRegenerate }) => {
  const navigation = useNavigation();

  const createObj = async () => {
    try {
       const token = await AsyncStorage.getItem('userToken');
       // Ensure sodaUsed, syrupsUsed, and addIns are arrays
       const sodaUsed = Array.isArray(drinkDict.sodaUsed) && drinkDict.sodaUsed.length > 0 ? drinkDict.sodaUsed : [drinkDict.sodaUsed];
       const syrupsUsed = Array.isArray(drinkDict.syrupsUsed) ? drinkDict.syrupsUsed : [];
       const addIns = Array.isArray(drinkDict.addIns) ? drinkDict.addIns : [];
   
       // If sodaUsed is empty, set it to ["DefaultSoda"] (or any default soda)
       if (sodaUsed.length === 0) {
         console.warn('sodaUsed is empty, setting to default soda.');
       }
   
       const response = await fetch(`${BASE_URL}/backend/drinks/`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Token ${token}`,
         },
         body: JSON.stringify({
           name: "AI drink", // Example name for the drink
           sodaUsed: sodaUsed, // Make sure it's an array with at least one item
           syrupsUsed: syrupsUsed, // Make sure it's an array
           addIns: addIns, // Make sure it's an array
           price: 2.00,
           userCreated: true,
           size: drinkDict.size || "24oz", // Default size
           ice: (drinkDict.ice || "normal").toLowerCase(), // Default ice amount, convert to lowercase
         }),
       });
  
      // Check if the response is not OK (status code not in the range 200-299)
      if (!response.ok) {
        const errorText = await response.text(); // Get the error message from the response body
        console.error('Failed to create drink. Status:', response.status);
        console.error('Response Text:', errorText);
        throw new Error(`Failed to create drink: ${response.status} - ${errorText}`);
      }
  
      const responseData = await response.json();
      const data = responseData.data;
      // gets list of out of storage on your phone
      let cartList = await AsyncStorage.getItem("checkoutList");
      const currentList = cartList ? JSON.parse(cartList) : [];
  
      const drinkID = data.drinkId; // assuming the response contains drinkId
      const updatedList = [...currentList, drinkID];
      await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));

      console.log("created drink obj")
      return data; // Return the created drink object
  
    } catch (error) {
      console.error('Error in createObj:', error); // Log any other errors
      throw error; // Rethrow error to be handled by the caller
    }
  };
  
  
  
  const edit = async () => {
    try {
      const drink = await createObj(); // Wait for the drink object to be created
      navigation.navigate('UpdateDrink', { drink }); // Pass the drink object to the UpdateDrink page
    } catch (error) {
      console.error('Error in edit:', error);
    }
  };

  const AddToCart = async () => {
    try {
      await createObj(); // Add the drink to the cart
      navigation.navigate('Cart');
    } catch (error) {
      console.error('Error in AddToCart:', error);
    }
  };

  // // reactive drink stuff
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
  const sodaUsed = Array.isArray(drinkDict.sodaUsed) && drinkDict.sodaUsed.length > 0 ? drinkDict.sodaUsed : [drinkDict.sodaUsed];
  const syrupsUsed = Array.isArray(drinkDict.syrupsUsed) ? drinkDict.syrupsUsed : [];
  const addIns = Array.isArray(drinkDict.addIns) ? drinkDict.addIns : [];

  

  const layers = getLayers(sodaUsed, syrupsUsed, addIns);
  console.log(layers);


  return (
    <Modal
      isVisible={isModalVisible}
      onBackdropPress={toggleModal}
      style={styles.modal}
      swipeToClose={true}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Your Drink is ...</Text>
         <Text style={styles.modalText}>
           A {drinkDict.size} drink with {drinkDict.ice} Ice
         </Text>
        <View style={styles.body}>
          {/* Ingredients List */}
          <View style={styles.textNbuttons}>
            <View style={styles.ingredientsText}>
              <Text style={styles.ingredientsText}>Soda: {sodaUsed.join(", ")}</Text>
              <Text style={styles.ingredientsText}>Syrups: {syrupsUsed.join(", ")}</Text>
              <Text style={styles.ingredientsText}>Add-ins: {addIns.join(", ")}</Text>
            </View>
            <View style={styles.buttonsContainer}>
              <TouchableOpacity style={styles.buttons} onPress={() => (edit(), toggleModal())}>
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.buttons} onPress={() => (AddToCart(), toggleModal())}>
                <Text style={styles.buttonText}>Add to Cart</Text>
              </TouchableOpacity>

              {onRegenerate && (
                <TouchableOpacity style={styles.newOptionButton} onPress={onRegenerate}>
                  <Text style={styles.buttonText}>New Option</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.buttons} onPress={toggleModal}>
                <Text style={styles.buttonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Drink GIF */}
          <View style={styles.graphicContainer}>
            <Gif layers={layers} />
          </View>
        </View>
      </View>
    </Modal>

  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end', // Align modal at the bottom
    margin: 0, // Remove any margins from the modal
  },
  modalContent: {
    backgroundColor: '#C6C8EE',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  body: {
    flexDirection: 'row', // Align ingredients and GIF horizontally
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  textNbuttons: {
    flex: 1, // Take up available space
    paddingRight: 16,
  },
  ingredientsText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: '#D30C7B', // Optional: background color to make it stand out
    borderRadius: 10,
    padding: 10,
  },
  graphicContainer: {
    flex: 0, // Allow the GIF container to take up remaining space
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginTop: 5, // Adds space between buttons and the content above
  },
  buttons: {
    backgroundColor: '#8DF1D3',
    paddingVertical: 12, // Adjust padding for better size
    paddingHorizontal: 25,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginBottom: 10, // Adds space between buttons
  },
  newOptionButton: {
    backgroundColor: '#8DF1D3',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginBottom: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  modalText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    padding: 10,                // Adds space inside the border
    borderWidth: 2,             // Thickness of the border
    borderColor: '#F92758',     // Color of the border
    borderRadius: 10,           // Rounds the corners
    backgroundColor: '#F92758', // Optional: background color to make it stand out
    color: '#fff',
  },
});


export default AIAlert;
