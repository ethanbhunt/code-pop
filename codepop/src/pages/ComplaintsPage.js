import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import NavBar from '../components/NavBar';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../../ip_address'; // Ensure BASE_URL is your server's base URL
import AsyncStorage from '@react-native-async-storage/async-storage';

const ComplaintsPage = () => {
    const [searchText, setSearchText] = useState('');
    const [messages, setMessages] = useState([{ text: "Hi! I'm Bob. How can I help you?", isBot: true }]);
    const scrollViewRef = useRef();
    const [refund_phase, setRefundPhase] = useState('none');
    const [wrong_drink_phase, setWrongDrinkPhase] = useState('none');
    const [order_num, setOrderNum] = useState('none');
    const [drink_nums, setDrinkNums] = useState('none');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const getDrinkData = async (drinkID) => {
         try {
             const token = await AsyncStorage.getItem('userToken');
             const drinkData = await fetch(`${BASE_URL}/backend/drinks/${drinkID}/`, {
                  method: 'GET',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Token ${token}`,
                 },
             });
     
             if (!drinkData.ok) {
                 console.error(`Error fetching drink data: ${drinkData.status} ${drinkData.statusText}`);
                 return null;
             }
     
            const jsonForm = await drinkData.json();
            return jsonForm.data;
        } catch (error) {
            console.error('Error getting drink:', error);
            return null;
        }
    };

    const complaintAI = async () => {
        if (searchText.trim() === '') return;

        const userRequest = searchText.trim();

        setMessages((prev) => [...prev, { text: userRequest, isBot: false }]);
        setSearchText('');

        setMessages((prev) => [
            ...prev,
            { text: "Bob is typing...", isBot: true, isLoading: true },
        ]);
        setLoading(true);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const token = await AsyncStorage.getItem('userToken');
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers.Authorization = `Token ${token}`;
            }

            const response = await fetch(`${BASE_URL}/backend/chatbot/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: userRequest,
                    refund_phase,
                    wrong_drink_phase,
                    order_num,
                    drink_nums,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.text().catch(() => '');
                throw new Error(
                    `Chatbot HTTP ${response.status}${errorBody ? `: ${errorBody}` : ''}`
                );
            }

            const payload = await response.json();
            const botTextRaw =
                payload?.response ??
                payload?.message ??
                (typeof payload === 'string' ? payload : null);

            const botResponse =
                typeof botTextRaw === 'string'
                    ? botTextRaw.replace('"', '')
                    : Array.isArray(botTextRaw)
                      ? botTextRaw.join('\n')
                      : JSON.stringify(payload);

            const responseRefundPhase = payload?.refund_phase ?? payload?.refundPhase;
            const responseWrongDrinkPhase = payload?.wrong_drink_phase ?? payload?.wrongDrinkPhase;

            if (responseRefundPhase != null) setRefundPhase(responseRefundPhase);
            if (responseWrongDrinkPhase != null) setWrongDrinkPhase(responseWrongDrinkPhase);
            if (payload?.order_num != null || payload?.orderNum != null) {
                setOrderNum(payload.order_num ?? payload.orderNum);
            }
            if (payload?.drink_nums != null || payload?.drinkNums != null) {
                setDrinkNums(payload.drink_nums ?? payload.drinkNums);
            }

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.isLoading ? { text: botResponse, isBot: true } : msg
                )
            );

            const resolvedOrderNum = payload?.order_num ?? payload?.orderNum;
            const shouldLoadOrder =
                resolvedOrderNum != null &&
                resolvedOrderNum !== '' &&
                resolvedOrderNum !== 'none' &&
                token;

            if (shouldLoadOrder) {
                try {
                    const orderResponse = await fetch(
                        `${BASE_URL}/backend/orders/${resolvedOrderNum}/`,
                        {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Token ${token}`,
                            },
                        }
                    );

                    if (orderResponse.ok) {
                        const orderPayload = await orderResponse.json();
                        const orderData = orderPayload.data ?? orderPayload;
                        const drinks = orderData.drinks ?? [];
                        const drinkPromises = drinks.map((id) => getDrinkData(id));
                        const resolvedDrinks = (await Promise.all(drinkPromises)).filter(Boolean);

                        console.log('Backend complaints:', JSON.stringify(resolvedDrinks));

                        await AsyncStorage.setItem('purchasedDrinks', JSON.stringify(resolvedDrinks));
                        await AsyncStorage.setItem('orderNum', String(resolvedOrderNum));

                        setTimeout(() => navigation.navigate('PostCheckout'), 2000);
                    } else {
                        console.log('problem getting order data');
                    }
                } catch (orderErr) {
                    console.error('Order fetch after chatbot:', orderErr);
                }
            }
        } catch (error) {
            console.error('Error in chatbot response:', error);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.isLoading
                        ? {
                              text: "I'm having trouble understanding right now. Please try again later.",
                              isBot: true,
                          }
                        : msg
                )
            );
        } finally {
            setLoading(false);
        }
    };

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
                source={require('../../assets/codepop_ai_logo.png')}
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
                        <Text style={[styles.messageText, !message.isBot && styles.userMessageText]}>{message.text}</Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Type your complaint..."
                    placeholderTextColor="#6f7f91"
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
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 27,
        fontWeight: '800',
        marginTop: 16,
        textAlign: 'center',
        color: '#1c334d',
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
        paddingHorizontal: 12,
        paddingBottom: 10,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 14,
        marginBottom: 10,
        maxWidth: '80%',
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#E1E5F2',
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#1F7A8C',
    },
    messageText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1c334d',
    },
    userMessageText: {
        color: '#ffffff',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 110,
        paddingTop: 14,
        paddingHorizontal: 12,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#E1E5F2',
    },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d6e5f3',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        backgroundColor: '#fff',
        color: '#243b52',
    },
    sendButton: {
        marginLeft: 8,
        backgroundColor: '#1F7A8C',
        borderRadius: 12,
        padding: 10,
    },
});

export default ComplaintsPage;


