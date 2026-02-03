import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {BASE_URL} from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';
import Gif from '../components/Gif';
import { sodaOptions, syrupOptions, AddInOptions } from '../components/Ingredients';

const AIAlert = ({ isModalVisible, toggleModal, drinkDict }) => {
  const navigation = useNavigation();

  const createObj = async () => {
    try {
      // Ensure SodaUsed, SyrupsUsed, and AddIns are arrays
      const sodaUsed = Array.isArray(drinkDict.SodaUsed) && drinkDict.SodaUsed.length > 0 ? drinkDict.SodaUsed : [drinkDict.SodaUsed];
      const syrupsUsed = Array.isArray(drinkDict.SyrupsUsed) ? drinkDict.SyrupsUsed : [];
      const addIns = Array.isArray(drinkDict.AddIns) ? drinkDict.AddIns : [];
  
      // If SodaUsed is empty, set it to ["DefaultSoda"] (or any default soda)
      if (sodaUsed.length === 0) {
        console.warn('SodaUsed is empty, setting to default soda.');
      }
  
      const response = await fetch(`${BASE_URL}/backend/drinks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Name: "AI drink", // Example name for the drink
          SodaUsed: sodaUsed, // Make sure it's an array with at least one item
          SyrupsUsed: syrupsUsed, // Make sure it's an array
          AddIns: addIns, // Make sure it's an array
          Price: 2.00,
          User_Created: true,
          Size: drinkDict.Size || "24oz", // Default size
          Ice: drinkDict.Ice || "regular", // Default ice amount
        }),
      });
  
      // Check if the response is not OK (status code not in the range 200-299)
      if (!response.ok) {
        const errorText = await response.text(); // Get the error message from the response body
        console.error('Failed to create drink. Status:', response.status);
        console.error('Response Text:', errorText);
        throw new Error(`Failed to create drink: ${response.status} - ${errorText}`);
      }
  
      const data = await response.json();
      // gets list of out of storage on your phone
      let cartList = await AsyncStorage.getItem("checkoutList");
      const currentList = cartList ? JSON.parse(cartList) : [];
  
      const drinkID = data.DrinkID; // assuming the response contains DrinkID
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
  const sodaUsed = Array.isArray(drinkDict.SodaUsed) && drinkDict.SodaUsed.length > 0 ? drinkDict.SodaUsed : [drinkDict.SodaUsed];
  const syrupsUsed = Array.isArray(drinkDict.SyrupsUsed) ? drinkDict.SyrupsUsed : [];
  const addIns = Array.isArray(drinkDict.AddIns) ? drinkDict.AddIns : [];

  

  const layers = getLayers(sodaUsed, syrupsUsed, addIns);
  console.log(layers);


  return (
    <Modal
      visible={isModalVisible}
      onRequestClose={toggleModal}
      transparent={true}
      animationType="slide"
    >
      <View style={[styles.modal, { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Your Drink is ...</Text>
        <Text style={styles.modalText}>
          A {drinkDict.Size} drink with {drinkDict.Ice} Ice
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
