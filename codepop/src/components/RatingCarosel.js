import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet, TouchableOpacity, FlatList, Text, Dimensions, Alert } from 'react-native';
import StarRating from './StarRating';
import Carousel from 'react-native-reanimated-carousel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../ip_address';
import Gif from './Gif';
import { sodaOptions, syrupOptions, AddInOptions } from '../components/Ingredients';

// to do in phase 2: fix duplicate drink in carosel bug

const { width: windowWidth } = Dimensions.get('window');

const RatingCarosel = ({ purchasedDrinks }) => {
    const navigation = useNavigation();
    const [rating, setRating] = useState(null);
    const [favorite, setFavorite] = useState(null);

    // reactive drink stuff
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
          const addInOption = AddInOptions.find((opt) => opt.label === addinName); 
          if (addInOption) {
            layers.push({ color: addInOption.color, height: 100 / totalItems });
          } else {
          }
        });
        return layers;
    };  

    // Function to update the rating for a specific drink
    const handleRatingSelected = async (newRating, drink) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${BASE_URL}/backend/drinks/${drink.drinkId}/`, {
                method: 'PUT',
                headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
                },
                body: JSON.stringify({ 
                    drinkId: drink.drinkId,
                    name: drink.name,
                    price: drink.price,
                    sodaUsed: drink.sodaUsed,  // Default value if sodaUsed is null
                    syrupsUsed: drink.syrupsUsed,
                    addIns: drink.addIns,
                    userCreated: drink.userCreated,
                    rating: newRating, 
                    size: drink.size,
                    ice: drink.ice,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();  // Read the response body as JSON
                console.error('Error response:', errorData);
                throw new Error(`Failed to update rating. Status: ${response.status}`);
            }
        } catch (error) {
        console.error('Error updating rating:', error);
        }
    };


    // Function to add a drink to favorites - save functionality for phase 2
    const addToFavs = async (drink) => {
        console.log("DrinkID:", drink);
        try {
            const userID = await AsyncStorage.getItem('userId');
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${BASE_URL}/backend/drinks/${drink.drinkId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`,
                },
                body: JSON.stringify({ 
                    favorite: userID 
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to add to favorites. Status: ${response.status}`);
            }
        } catch (error) {
        console.error('Error adding to favorites:', error);
        }
    };

    const renderItem = ({ item: drink }) => {
        const layers = getLayers(drink.sodaUsed, drink.syrupsUsed, drink.addIns);
        return (
            <View style={styles.carouselItem}>
                {/* Top: Drink ingredients */}
                <Text style={styles.drinkName}>
                    {drink.sodaUsed} with {drink.syrupsUsed?.join(', ')} {drink.addIns?.join(', ')}
                </Text>
    
                {/* Middle: Add to Favorites and Drink GIF */}
                <View style={styles.middleContainer}>
                    <TouchableOpacity onPress={() => console.log("Drink added to favorites")} style={styles.button}>
                        <Text>Add to Favorites</Text>
                    </TouchableOpacity>
                    <Gif layers={layers} height={120} width={60} />
                </View>
    
                {/* Bottom: Star Rating */}
                <StarRating
                    style={styles.star}
                    onRatingSelected={(newRating) => handleRatingSelected(newRating, drink)}
                />
            </View>
        );
    };

    return (
        <View style={{ height: 250 }}>
          <Carousel
            width={windowWidth}
            sliderWidth={windowWidth}
            itemWidth={windowWidth * 0.8}
            height={400}
            autoPlay={true}
            autoPlayInterval={5000} // Delay of 5 seconds between slides
            data={purchasedDrinks}
            renderItem={renderItem}
          /> 
        </View>
      );
};

const styles = StyleSheet.create({
    carouselItem: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFA686',
        borderRadius: 8,
        padding: 10,
        margin: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    drinkName: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center', // Center align ingredients
        marginBottom: 0,
    },
    middleContainer: {
        flexDirection: 'row', // Align the button and GIF horizontally
        alignItems: 'center', // Vertically align
        justifyContent: 'space-between', // Space out button and GIF
        width: '100%',
        marginVertical: 0,
    },
    button: {
        backgroundColor: '#D30C7B',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    star: {
        marginTop: 0, // Space the stars below the middle container
        alignSelf: 'center', // Center stars horizontally
    },
});

export default RatingCarosel;
