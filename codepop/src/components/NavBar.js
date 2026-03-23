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
    { screen: 'GeneralHome', icon: 'home-outline', activeIcon: 'home' },
    { screen: 'CreateDrink', icon: 'sparkles-outline', activeIcon: 'sparkles' },
    { screen: 'Cart', icon: 'cart-outline', activeIcon: 'cart' },
    { screen: 'ComplaintsPage', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
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
              {item.screen === 'CreateDrink' ? 'AI' : item.screen === 'GeneralHome' ? 'Home' : item.screen === 'ComplaintsPage' ? 'Support' : item.screen}
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
    backgroundColor: '#f0f6ff',
    borderRadius: 22,
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
    elevation: 8,
  },
  navItemButton: {
    width: '24%',
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemButtonActive: {
    backgroundColor: '#ff6a3d',
  },
  navItemLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#2b4865',
  },
  navItemLabelActive: {
    color: '#ffffff',
  },
});

export default NavBar;
