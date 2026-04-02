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
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

const NavBar = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const navItems = [
    { screen: 'GeneralHome', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { screen: 'CreateDrink', label: 'Order', icon: 'cafe-outline', activeIcon: 'cafe' },
    { screen: 'Cart', label: 'Cart', icon: 'cart-outline', activeIcon: 'cart' },
    { screen: 'PostCheckout', label: 'Tracking', icon: 'location-outline', activeIcon: 'location' },
    { screen: 'ComplaintsPage', label: 'Support', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
  ];

  return (
    <View style={styles.navbar}>
      {navItems.map((item) => {
        const isActive = route.name === item.screen;
        return (
          <TouchableOpacity
            key={item.screen}
            style={[styles.navItemButton, isActive && styles.navItemButtonActive]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Icon
              name={isActive ? item.activeIcon : item.icon}
              size={22}
              color={isActive ? '#ffffff' : '#2b4865'}
            />
            <Text style={[styles.navItemLabel, isActive && styles.navItemLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(174, 179, 197, 0.85)',
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 10,
    width: '94%',
    height: 78,
    position: 'absolute',
    bottom: 14,
    left: '3%',
    alignSelf: 'center',
    shadowColor: '#0f2538',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 0,
  },
  navItemButton: {
    width: '19%',
    height: 58,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemButtonActive: {
    backgroundColor: '#022B3A',
  },
  navItemLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#022B3A',
  },
  navItemLabelActive: {
    color: '#ffffff',
  },
});

export default NavBar;
