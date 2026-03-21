import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import NavBar from '../components/NavBar';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../../ip_address';  // Ensure BASE_URL is your server's base URL
import { registerRootComponent } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ComplaintsPage = () => {
    const [searchText, setSearchText] = useState('');
    const [messages, setMessages] = useState([{ text: "Hi! I'm Bob. How can I help you?", isBot: true }]);
    const scrollViewRef = useRef();
    const [refund_phase, setRefundPhase] = useState("none");
    const [wrong_drink_phase, setWrongDrinkPhase] = useState("none");
    const [order_num, setOrderNum] = useState("none");
    const [drink_nums, setDrinkNums] = useState("none");
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    // Function to handle message submission
    const complaintAI = async () => {
        if (searchText.trim() === '') return;

        const userRequest = searchText;
    
        // Add the user's message
        setMessages((prevMessages) => [
            ...prevMessages,
            { text: searchText, isBot: false }
        ]);
    
        // Clear the input field
        setSearchText('');

        // Add a temporary "loading" message
        setMessages((prevMessages) => [
            ...prevMessages,
            { text: "Bob is typing...", isBot: true, isLoading: true, showSpinner: true }
        ]);
        setLoading(true);


        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(`${BASE_URL}/backend/chatbot/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userRequest,
                    refund_phase: refund_phase,
                    wront_drink_phase: wrong_drink_phase,
                    order_num: order_num,
                    drink_nums: drink_nums
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
    

            if (response.ok) {
                const data = await response.json();
                const botResponse = data.responses;
                const response_refund_phase = data.refund_phase;
                const response_wrong_drink_phase = data.wrong_drink_phase;
                setOrderNum(data.order_num);
                setDrinkNums(data.drink_nums);

                if(response_refund_phase === "none" && response_wrong_drink_phase === "none"){
                    setRefundPhase("none");
                    setWrongDrinkPhase("none");
                    // Replace the "typing" message with the actual response
                    setMessages((prevMessages) =>
                        prevMessages.map((msg, index) =>
                            msg.isLoading ? { text: botResponse, isBot: true } : msg
                        )
                    );
                } else if (response_wrong_drink_phase === "4"){
                    //I will need to go to the post order page with it processing the newly remade order
                    // Update messages with bot's response
                    // Replace the "typing" message with the actual response
                    setMessages((prevMessages) =>
                        prevMessages.map((msg, index) =>
                            msg.isLoading ? { text: botResponse, isBot: true } : msg
                        )
                    );

                    const orderResponse = await fetch(`${BASE_URL}/backend/orders/${order_num}/`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });

                    if(orderResponse.ok){
                        const drinksForPost = [];
                        const orderData = await orderResponse.json();
                         // Use Promise.all to wait for all drink data to resolve
                        const drinkPromises = orderData.Drinks.map(drink => getDrinkData(drink));
                        const resolvedDrinks = await Promise.all(drinkPromises); // Wait for all Promises to resolve

                        // Add resolved drink data to drinksForPost
                        drinksForPost.push(...resolvedDrinks);

                        console.log("Backend complaints:", JSON.stringify(drinksForPost));

                        await AsyncStorage.setItem("purchasedDrinks", JSON.stringify(drinksForPost));
                        await AsyncStorage.setItem("orderNum", order_num.toString());
                    }else{
                        console.log("problem getting order data")
                    }
                    setTimeout(() => {
                        navigation.navigate("PostCheckout");
                      }, 2000); // 2000 milliseconds = 2 seconds
                    
                } else {
                    setRefundPhase(response_refund_phase);
                    setWrongDrinkPhase(response_wrong_drink_phase);
                    // Update messages with bot's response
                    // Replace the "typing" message with the actual response
                    setMessages((prevMessages) =>
                        prevMessages.map((msg, index) =>
                            msg.isLoading ? { text: botResponse, isBot: true } : msg
                        )
                    );
                }
            } else {
                throw new Error("Failed to fetch response from chatbot");
            }
        } catch (error) {
            console.error('Error in chatbot response:', error);
            // Replace the "typing" message with an error message
            setMessages((prevMessages) =>
                prevMessages.map((msg, index) =>
                    msg.isLoading ? { text: "I'm having trouble understanding right now. Please try again later.", isBot: true } : msg
                )
            );
        }finally{
            setLoading(false);
        }
    };

    const getDrinkData = async (drinkID) => {
        try {
            const drinkData = await fetch(`${BASE_URL}/backend/drinks/${drinkID}/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if (!drinkData.ok) {
                console.error(`Error fetching drink data: ${drinkData.status} ${drinkData.statusText}`);
                return null;
            }
    
            const jsonForm = await drinkData.json();
            return jsonForm;
        } catch (error) {
            console.error("Error getting drink:", error);
            return null;
        }
    }
    
    // Scroll to the bottom of the chat whenever messages update
    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    return (
        <View style={styles.container}>
            <ScrollView 
                style={styles.chatContainer} 
                ref={scrollViewRef}
            >
            <Text style={styles.title}>Complain to Bob</Text>

            <Image 
                source={require('../../assets/bobcopy.png')}
                style={styles.image}
                resizeMode="contain"
            />

            
                {messages.map((message, index) => (
                    <View 
                        key={index} 
                        style={[
                            styles.messageBubble, 
                            message.isBot ? styles.botMessage : styles.userMessage
                        ]}
                    >
                        <Text style={styles.messageText}>{message.text}</Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Type your complaint..."
                    placeholderTextColor="#999"
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={setSearchText}
                    multiline
                    onSubmitEditing={complaintAI}
                    blurOnSubmit={false}
                />
                <TouchableOpacity onPress={complaintAI} style={styles.sendButton}>
                    <Icon name="send" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <NavBar />
        </View>
    );

    
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#c8e6c9',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
        color: '#333',
    },
    image: {
        width: 150,
        height: 150,
        alignSelf: 'center',
        marginVertical: 10,
    },
    chatContainer: {
        flex: 1,
        marginVertical: 10,
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    messageBubble: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        maxWidth: '80%',
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFA686',
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#F92758',
    },
    messageText: {
        fontSize: 16,
        color: '#333',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 90,
        paddingTop: 20,
        paddingHorizontal: 10,
        backgroundColor: '#c8e6c9',
        borderTopWidth: 3,
        borderTopColor: '#FFA686',
    },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#333',
    },
    sendButton: {
        marginLeft: 10,
        backgroundColor: '#D30C7B',
        borderRadius: 5,
        padding: 10,
    },
});

export default ComplaintsPage;


