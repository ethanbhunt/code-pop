// src/components/NavBar.js
/*
colors:
D30C7B - dark pink
8DF1D3 - teal
C6C8EE - purple
F92758 - light pink
FFA686 - peach
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

const NavBar = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.navbar}>
      <TouchableOpacity onPress={() => navigation.navigate('GeneralHome')}>
        <Icon name="home-outline" size={24} color="#000" />
        {/* <Text style={styles.navItem}>Home</Text> */}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('CreateDrink')}>
        <Icon name="cafe-outline" size={24} color="#000" />
        {/* <Text style={styles.navItem}>Create Drink</Text> */}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
        <Icon name="cart-outline" size={24} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Stores')}>
        <Icon name="location-outline" size={24} color="#000" />
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('ComplaintsPage')}>
        <Icon name="chatbubbles-outline" size={24} color="#000" />
        {/* <Text style={styles.navItem}>Home</Text> */}
      </TouchableOpacity>

      {/* Add more navigation items as needed */}
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#c8c8ee',
    paddingVertical: 10,
    width: '100%',
    height: 70,
    position: 'absolute', 
    bottom: 0,
    left: 0,
    marginTop: 10,
    alignSelf: 'center',
  },
  navItem: {
    fontSize: 18,
  },
});

export default NavBar;
