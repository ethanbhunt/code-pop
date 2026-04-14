import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import App from '../App';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockLoadAsync = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args) => mockGetItem(...args),
  setItem: (...args) => mockSetItem(...args),
  removeItem: (...args) => mockRemoveItem(...args),
}));

jest.mock('expo-font', () => ({
  loadAsync: (...args) => mockLoadAsync(...args),
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => {
    const Screen = () => null;
    const Navigator = ({ children }) => children;
    return { Navigator, Screen };
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('../src/pages/AdminDash', () => 'AdminDash');
jest.mock('../src/pages/AuthPage', () => 'AuthPage');
jest.mock('../src/pages/CartPage', () => 'CartPage');
jest.mock('../src/pages/CheckoutForm', () => 'CheckoutForm');
jest.mock('../src/pages/ComplaintsPage', () => 'ComplaintsPage');
jest.mock('../src/pages/CompletePage', () => 'CompletePage');
jest.mock('../src/pages/CreateAccountPage', () => 'CreateAccountPage');
jest.mock('../src/pages/CreateDrinkPage', () => 'CreateDrinkPage');
jest.mock('../src/pages/GeneralHomePage', () => 'GeneralHomePage');
jest.mock('../src/pages/ManagerDash', () => 'ManagerDash');
jest.mock('../src/pages/PaymentPage', () => 'PaymentPage');
jest.mock('../src/pages/PostCheckout', () => 'PostCheckout');
jest.mock('../src/pages/PreferencesPage', () => 'PreferencesPage');
jest.mock('../src/pages/UpdateDrink', () => 'UpdateDrink');

describe('App bootstrap', () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
    mockLoadAsync.mockReset();
  });

  it('initializes checkout cart storage on startup (empty cart + clear purchased drinks)', async () => {
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue();
    mockLoadAsync.mockResolvedValue();

    render(<App />);

    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        'checkoutList',
        JSON.stringify([])
      );
      expect(mockRemoveItem).toHaveBeenCalledWith('purchasedDrinks');
    });
  });
});
