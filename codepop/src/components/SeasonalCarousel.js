import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { BASE_URL } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: windowWidth } = Dimensions.get('window');

const SeasonalCarousel = () => {
    const navigation = useNavigation();
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
             try {
                const response = await fetch(`${BASE_URL}/backend/drinks/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
            const drinks = await response.json();

            const parsedDrinks = drinks.map(drink => ({
                drinkID: drink.DrinkID,
                name: drink.Name,
                price: drink.Price,
                sodaUsed: drink.SodaUsed,  // Default value if SodaUsed is null
                syrupsUsed: drink.SyrupsUsed,
                addIns: drink.AddIns,
                user_Created: drink.user_Created,    // Assuming the user is creating the drink
                // size: drink.selectedSize,
                // ice: drink.selectedIce,
            }));
            console.log('parsed')
            console.log(parsedDrinks);
            setData(parsedDrinks);
            } catch (error) {
                console.error(error);
            } 
        };
        fetchData();
    }, []);
    
    const createDrink = async (item) => {
        console.log('creating drinks...');
        try {
            // Get the list from AsyncStorage, or initialize as an empty array
            cartList = await AsyncStorage.getItem("checkoutList");
            const currentList = cartList && cartList !== 'null' ? JSON.parse(cartList) : [];
            const cleanedList = currentList.filter(item => item !== null && item !== undefined);

            // Log the item to ensure it has the correct structure
            console.log(item);

            const response = await fetch(`${BASE_URL}/backend/drinks/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  Name: item.name,  // Example name for the drink
                  SodaUsed: item.sodaUsed,  // Default value if SodaUsed is null
                  SyrupsUsed: item.syrupsUsed,
                  AddIns: item.addIns,
                  Price: item.price,
                  User_Created: true,    // Assuming the user is creating the drink
                  Size: '24oz',
                  Ice: 'Regular',
                })
              });
            
              if (!response.ok) {
                throw new Error(`Failed to add drink. Status: ${response.status}`);
              }
              // add drink item (the drinks ID) to the checkout list from App.js
              try{
                // gets list of out of storage on your phone
                cartList = await AsyncStorage.getItem("checkoutList");
                const currentList = cartList ? JSON.parse(cartList) : [];
                // takes the response (what we get after we create a drink) and extracts the drinkID
                const data = await response.json();
                const drinkID = data.DrinkID;
                // add the drinkID to the checkoutList
                const updatedList = [...currentList, drinkID]
                // Saves the checkoutlist back into the storage on the phone
                await AsyncStorage.setItem('checkoutList', JSON.stringify(updatedList));
                navigation.navigate('Cart');
              }catch (error){
                console.log(error)
              }
          
            // Optionally, verify the save operation
            const savedList = await AsyncStorage.getItem('checkoutList');
            console.log("Updated Checkout List:", savedList);
          
        } catch (error) {
            console.log("Error:", error);
        }
          
        
    }

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.carouselItem} onPress={() => createDrink(item)}>
            <Image
                source={require('../../assets/temp-carousel-drink.png')}
                style={styles.image}
            />
            <Text style={styles.drinkName}>{item.name}</Text>
            <Text style={styles.drinkPrice}>${item.price.toFixed(2)}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ height: 250 }}>
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ height: 250 }}
            >
                {data.map((item, index) => (
                    <View key={index} style={{ width: windowWidth * 0.8 }}>
                        {renderItem({ item, index })}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
        margin: 0,
    },
    carouselItem: {
        backgroundColor: '#FFA686',
        borderRadius: 8,
        padding: 20,
        margin: 10,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    drinkName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    drinkPrice: {
        fontSize: 16,
    },
    image: {
        width: 150,
        height: 150,
        borderRadius: 10,
      },
});

export default SeasonalCarousel;
