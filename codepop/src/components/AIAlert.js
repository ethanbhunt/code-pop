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

  const sodaUsed = Array.isArray(drinkDict.SodaUsed) && drinkDict.SodaUsed.length > 0 ? drinkDict.SodaUsed : [drinkDict.SodaUsed];
  const syrupsUsed = Array.isArray(drinkDict.SyrupsUsed) ? drinkDict.SyrupsUsed : [];
  const addIns = Array.isArray(drinkDict.AddIns) ? drinkDict.AddIns : [];

  

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
        <Text style={styles.eyebrow}>AI Pick</Text>
        <Text style={styles.modalTitle}>Your drink is ready</Text>
        <View style={styles.body}>
          {/* Ingredients List */}
          <View style={styles.textNbuttons}>
            <View style={styles.ingredientsCard}>
              <Text style={styles.ingredientsText}>Size: {drinkDict.Size}</Text>
              <Text style={styles.ingredientsText}>Ice: {drinkDict.Ice}</Text>
              <Text style={styles.ingredientsText}>Soda: {sodaUsed.join(", ")}</Text>
              <Text style={styles.ingredientsText}>Syrups: {syrupsUsed.join(", ")}</Text>
              <Text style={styles.ingredientsText}>Add-ins: {addIns.join(", ")}</Text>
            </View>
            <View style={styles.buttonsContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => (AddToCart(), toggleModal())}>
                <Text style={styles.primaryButtonText}>Add to Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={() => (edit(), toggleModal())}>
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>

              {onRegenerate && (
                <TouchableOpacity style={styles.newOptionButton} onPress={onRegenerate}>
                  <Text style={styles.newOptionButtonText}>New Option</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.secondaryButton} onPress={toggleModal}>
                <Text style={styles.buttonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </View>
    </Modal>

  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    alignItems: 'center',
  },
  body: {
    width: '100%',
    marginBottom: 10,
  },
  textNbuttons: {
    width: '100%',
  },
  eyebrow: {
    color: '#BFDBF7',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
    alignSelf: 'flex-start',
  },
  ingredientsCard: {
    backgroundColor: '#E1E5F2',
    borderRadius: 15,
    padding: 10,
    marginBottom: 10,
  },
  ingredientsText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '700',
    marginBottom: 5,
  },
  graphicContainer: {
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsContainer: {
    flexDirection: 'column',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#BFDBF7',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#BFDBF7',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 15,
    marginBottom: 10,
  },
  newOptionButton: {
    backgroundColor: '#BFDBF7',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 15,
    marginBottom: 10,
  },
  newOptionButtonText: {
    color: '#000000',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '800',
  },
  buttonText: {
    color: '#000000',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    marginTop: 4,
    paddingBottom: 10,
    alignSelf: 'flex-start',
  },
});


export default AIAlert;
