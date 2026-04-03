import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../../ip_address';
import { ingredientList, iceForCreateApi, optionalAuthJsonHeaders } from '../utils/drinkCart';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Gif from '../components/Gif';
import { sodaOptions, syrupOptions, AddInOptions } from '../components/Ingredients';
import Modal from 'react-native-modal';

const AIAlert = ({ isModalVisible, toggleModal, drinkDict, onRegenerate }) => {
  const navigation = useNavigation();

  const createObj = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const d = drinkDict || {};
      const sodaUsed = ingredientList(d.sodaUsed ?? d.SodaUsed);
      const syrupsUsed = ingredientList(d.syrupsUsed ?? d.SyrupsUsed);
      const addIns = ingredientList(d.addIns ?? d.AddIns);

      const response = await fetch(`${BASE_URL}/backend/drinks/`, {
        method: 'POST',
        headers: optionalAuthJsonHeaders(token),
        body: JSON.stringify({
          name: 'AI drink',
          sodaUsed,
          syrupsUsed,
          addIns,
          price: 2.0,
          userCreated: true,
          size: d.size ?? d.Size ?? '24oz',
          ice: iceForCreateApi(d.ice ?? d.Ice),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create drink: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      const data = responseData.data;
      const cartList = await AsyncStorage.getItem('checkoutList');
      const currentList = cartList ? JSON.parse(cartList) : [];
      const updatedList = [...currentList, data.drinkId];
      await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));
      return data;
    } catch (error) {
      console.error('Error in createObj:', error);
      throw error;
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
