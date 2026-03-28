import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {BASE_URL} from '../../ip_address'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RNPickerSelect from 'react-native-picker-select';

const AdminDash = () => {

  const [users, setUsers] = useState([]);
  const [popupIsOpen, setPopupIsOpen] = useState(false);
  const [editorIsOpen, setEditorIsOpen] = useState(false);

  const [userToDelete, setUserToDelete] = useState(null)
  const [userToEdit, setUserToEdit] = useState(null);
  const [userInfo, setUserInfo] = useState({
    username: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "",
  });

  useFocusEffect(React.useCallback(() => {
    getUsers();
  }, []));

  const placeholder = {
    label: 'Select a role...',
    value: null,
  };

  const roleOptions = [
    { label: 'User', value: 'user' },
    { label: 'Staff', value: 'staff' },
    { label: 'Admin', value: 'admin' },
  ];

  const openPopup = (user) => {
    setUserToDelete(user)
    setPopupIsOpen(true)
  }
  const closePopup = () => {
    setPopupIsOpen(false)
    setUserToDelete(null)
  }

   const openEditor = (user) => {
     setUserToEdit(user)
     setUserInfo({
       username: user.username,
       firstName: user.firstName,
       lastName: user.lastName,
       password: "",
       role: user.isSuperuser ? "admin" : user.isStaff ? "staff" : "user",
     })
     setEditorIsOpen(true)
   }
  const closeEditor = () => {
    setEditorIsOpen(false)
    setUserToEdit(null)
    setUserInfo({
      username: "",
      firstName: "",
      lastName: "",
      password: "",
      role: "",
    })
  }


  const getUsers = async () => {
    const token = await AsyncStorage.getItem("userToken");

    try {
      const response = await fetch(`${BASE_URL}/backend/users/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
         throw new Error(`Error when trying to fetch a list of users. Status: ${response.status}`);
       }

       const userResponse = await response.json();
       setUsers(userResponse.data);
    }
    catch (error) {
      console.error('Error when trying to fetch a list of users:', error);
    }
  }

  const deleteUser = async (user) => {
    try {
      const user_id = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('userToken');

      if (!user_id) {
        console.log("Error: Failed to get active user's id.")
        return
      }

      if (Number(user_id) === Number(user.id)) {
        Alert.alert('Error: You cannot delete yourself')
        closePopup();
      }
      else {
        console.log("Deleting user...");
        const response = await fetch(`${BASE_URL}/backend/users/delete/${user.id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          }
        });
  
        if (!response.ok) {
          throw new Error(`Error when trying to delete a user. Status: ${response.status}`);
        }

        const result = await response.json()
        Alert.alert(result.message)
        getUsers();
        closePopup();
      }
    }
    catch (error) {
      console.error('Error when trying to delete a user:', error);
    }
  };

  const editUser = async (user) => {
    const token = await AsyncStorage.getItem("userToken");

    try {
      const edits = {}
      if (!userInfo.username) {
        edits["username"] = "unchanged";
      }
      else {
        edits["username"] = userInfo.username;
      }

      if (!userInfo.firstName) {
        edits["firstName"] = "unchanged";
      }
      else {
        edits["firstName"] = userInfo.firstName;
      }

      if (!userInfo.lastName) {
        edits["lastName"] = "unchanged";
      }
      else {
        edits["lastName"] = userInfo.lastName;
      }

      if (!userInfo.password) {
        edits["password"] = "unchanged";
      }
      else {
        edits["password"] = userInfo.password;
      }

      if (!userInfo.role) {
        edits["role"] = "unchanged";
      }
      else {
        edits["role"] = userInfo.role;
      }
      
      console.log("Updating user...");
      const response = await fetch(`${BASE_URL}/backend/users/edit/${user.id}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({edits}),
      });
  
      if (!response.ok) {
        throw new Error(`Error when trying to edit a user. Status: ${response.status}`);
      }

      const result = await response.json()
      Alert.alert(result.message)
      getUsers();
      closeEditor();
    }
    catch (error) {
      console.error('Error when trying to edit a user:', error);
    }
  };

   const renderUser = ({ item }) => {
     return (
       <GestureHandlerRootView style={{ flex: 1 }}>
         <View style={styles.box}>
           <View>
             <Text style={styles.mainText}>{item.username}</Text>
             <Text style={styles.secondaryText}>{item.firstName} {item.lastName}</Text>
             <Text style={styles.secondaryText}>Role: {item.isSuperuser ? <Text style={styles.role}>Admin</Text> : item.isStaff ? <Text style={styles.role}>Staff</Text> : "User"}</Text>
           </View>

          <View style={styles.userButtonContainer}>
            <TouchableOpacity onPress={() => openEditor(item)} style={styles.button}>
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openPopup(item)} style={styles.button}>
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>

          <Modal transparent={true} visible={popupIsOpen} onRequestClose={closePopup}>
              <View style={styles.modalBackground}>
                <View style={styles.popup}>
                    <Text style={styles.modalText}>Are you sure you want to delete user "{userToDelete?.username}"?</Text>
                    <View styles={styles.modalButtonContainer}>
                      <TouchableOpacity onPress={() => deleteUser(userToDelete)} style={styles.button}><Text style={styles.buttonText}>Yes</Text></TouchableOpacity>
                      <TouchableOpacity onPress={closePopup} style={styles.button}><Text style={styles.buttonText}>No</Text></TouchableOpacity>
                    </View>
                  </View>
              </View>
            </Modal>
            <Modal transparent={true} visible={editorIsOpen} onRequestClose={closeEditor}>
              <View style={styles.modalBackground}>
                <View style={styles.editor}>
                  <TouchableOpacity onPress={closeEditor} style={styles.xButton}><Text style={styles.x}>X</Text></TouchableOpacity>
                  <Text style={styles.editorHeader}>Edit user "{userToEdit?.username}"</Text>
                  <Text style={styles.editorText}>Username:</Text><TextInput onChangeText={(text) => setUserInfo(prev => ({ ...prev, username: text }))} value={userInfo.username} style={styles.textBox}/>
                  <Text style={styles.editorText}>First Name:</Text><TextInput onChangeText={(text) => setUserInfo(prev => ({ ...prev, firstName: text }))} value={userInfo.firstName} style={styles.textBox}/>
                  <Text style={styles.editorText}>Last Name:</Text><TextInput onChangeText={(text) => setUserInfo(prev => ({ ...prev, lastName: text }))} value={userInfo.lastName} style={styles.textBox}/>
                  <Text style={styles.editorText}>Password:</Text><TextInput onChangeText={(text) => setUserInfo(prev => ({ ...prev, password: text }))} value={userInfo.password} placeholder={"Empty for security purposes"} style={styles.textBox}/>
                  <Text style={styles.editorText}>Role: {"(Currently is " + userInfo.role + ")"}</Text>
                  <RNPickerSelect
                    style={styles.dropdown}
                    placeholder={placeholder}
                    items={roleOptions}
                    onValueChange={(value) => setUserInfo(prev => ({ ...prev, role: value }))}
                    value={userInfo.role}
                    pickerProps={{
                      style: { backgroundColor: '#C6C8EE' }
                    }}
                  />
                  <TouchableOpacity onPress={() => editUser(userToEdit)} style={styles.button}><Text style={styles.buttonText}>Save</Text></TouchableOpacity>
                </View>
              </View>
            </Modal>
        </View>
      </GestureHandlerRootView>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <Image 
            source={require('../../assets/PinkBubbles.png')}
            style={styles.image}
            resizeMode="cover"
        />
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Admin Dashboard</Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={(user) => user.username}
        renderItem={renderUser}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '150%',
    height: '200%',
    ...StyleSheet.absoluteFillObject,
  },
  mainContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#C6C8EE',
  },
  headerContainer: {
    flex: 0,
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 5,
    borderColor: '#D30C7B',
    marginBottom: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  box: {
    backgroundColor: '#f4f4f4',
    padding: 10,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 2,

    flex: 0,
    flexDirection: "row",
    justifyContent: 'space-between',
    backgroundColor: '#8DF1D3',
    zIndex: 2, // Ensure it's above the image
  },
  mainText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  secondaryText: {
    fontSize: 20,
    marginTop: 10,
  },
  role: {
    fontWeight: 'bold',
  },
  userButtonContainer: {
    flexDirection: 'column',
    justifyContent: 'space-evenly',
  },
  button: {
    flex: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#D30C7B',
    padding: 10,
    borderRadius: 5,
    height: 45,
    width: 100,
    margin: 7,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalBackground: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 2,
  },
  popup: {
    flex: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#f4f4f4',
    height: 300,
    width: 380,
    zIndex: 3,
    padding: 15,
    borderRadius: 10,
  },
  modalText: {
    fontSize: 23,
    textAlign: "center",
    marginBottom: 25,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  editor: {
    flex: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#FFA686',
    height: 600,
    width: 360,
    zIndex: 3,
    padding: 20,
    borderRadius: 10,
  },
  editorText: {
    fontSize: 20,
  },
  xButton: {
    flex: 0,
    alignItems: "center",
    justifyContent: "center",
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 100,
    backgroundColor: "#D30C7B",
    width: 45,
    height: 45,
  },
  x: {
    fontSize: 30,
    fontWeight: "bold",
    color: '#FFFFFF'
  },
  editorHeader: {
    fontSize: 25,
    fontWeight: "bold",
    marginBottom: 30,
  },
  textBox: {
    borderWidth: 2,
    borderColor: '#D30C7B',
    borderRadius: 10,
    padding: 5,
    width: '100%',
    height: 35,
    fontSize: 20,
    marginBottom: 20,
    backgroundColor: '#C6C8EE',
  },
  dropdown: {
    inputIOS: {
      height: 50,
      paddingLeft: 10,
      color: '#000',
      backgroundColor: '#C6C8EE',
      marginBottom: 15,
    },
    inputAndroid: {
      height: 50,
      paddingLeft: 10,
      color: '#000',
      backgroundColor: '#C6C8EE',
      marginBottom: 15,
    },
    iconContainer: {
      top: 15,
      right: 12,
    },
  },
});

export default AdminDash;