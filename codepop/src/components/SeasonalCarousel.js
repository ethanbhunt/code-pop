import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { BASE_URL } from '../../ip_address';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: windowWidth } = Dimensions.get('window');

const SeasonalCarousel = () => {
    const navigation = useNavigation();
    const [data, setData] = useState([]);

     useEffect(() => {
         const fetchData = async () => {
              try {
                 const token = await AsyncStorage.getItem('userToken');
                 
                 // Skip fetching drinks if user is not logged in
                 if (!token) {
                     console.log('No token found, skipping drinks fetch');
                     setData([]);
                     return;
                 }
                 
                 const response = await fetch(`${BASE_URL}/backend/drinks/`, {
                     method: 'GET',
                     headers: {
                         'Content-Type': 'application/json',
                         'Authorization': `Token ${token}`,
                     },
                 });
             const drinksResponse = await response.json();
             
             // Check if response has error or data is missing
             if (!drinksResponse.data || !Array.isArray(drinksResponse.data)) {
                 console.warn('No drinks data available or invalid response:', drinksResponse);
                 setData([]);
                 return;
             }
             
             const drinks = drinksResponse.data;

             const parsedDrinks = drinks.map(drink => ({
                 drinkId: drink.drinkId,
                 name: drink.name,
                 price: drink.price,
                 sodaUsed: drink.sodaUsed,  // Default value if sodaUsed is null
                 syrupsUsed: drink.syrupsUsed,
                 addIns: drink.addIns,
                 userCreated: drink.userCreated,    // Assuming the user is creating the drink
                 // size: drink.size,
                 // ice: drink.ice,
             }));
             console.log('parsed')
             console.log(parsedDrinks);
             setData(parsedDrinks);
             } catch (error) {
                 console.error('Error fetching drinks:', error);
                 setData([]);
             } 
         };
         fetchData();
     }, []);
    
     const createDrink = async (item) => {
         console.log('creating drinks...');
         try {
             const token = await AsyncStorage.getItem('userToken');
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
                   'Authorization': `Token ${token}`,
                 },
                body: JSON.stringify({ 
                  name: item.name,  // Example name for the drink
                  sodaUsed: item.sodaUsed,  // Default value if sodaUsed is null
                  syrupsUsed: item.syrupsUsed,
                  addIns: item.addIns,
                  price: item.price,
                  userCreated: true,    // Assuming the user is creating the drink
                  size: '24oz',
                  ice: 'normal',
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
                const responseData = await response.json();
                const drinkID = responseData.data.drinkId;
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
            <Carousel
                width={250}
                sliderWidth={windowWidth}
                itemWidth={windowWidth * 0.8}
                height={250}
                autoPlay={true}
                data={data}
                renderItem={renderItem}
            />
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
