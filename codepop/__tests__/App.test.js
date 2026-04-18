import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import App from '../App';

let mockInitialRoute;
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
    const Navigator = ({ children, initialRouteName }) => {
      mockInitialRoute = initialRouteName;
      return children;
    };
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
jest.mock('../src/pages/CheckoutSuccessPage', () => 'CheckoutSuccessPage');
jest.mock('../src/pages/PostCheckout', () => 'PostCheckout');
jest.mock('../src/pages/PreferencesPage', () => 'PreferencesPage');
jest.mock('../src/pages/StoreSelectPage', () => 'StoreSelectPage');
jest.mock('../src/pages/UpdateDrink', () => 'UpdateDrink');

jest.mock('../ip_address', () => ({
  BASE_URL: 'http://localhost:3001',
  initializeBaseURL: jest.fn(),
  setStoreAndUpdateURL: jest.fn(),
}));

describe('App bootstrap', () => {
  beforeEach(() => {
    mockInitialRoute = null;
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
    mockLoadAsync.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  });

    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue();
    mockLoadAsync.mockResolvedValue();
  });

  it('initializes checkout cart storage and routes guests without a store to StoreSelect', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockSetItem.mockResolvedValueOnce();
    mockLoadAsync.mockResolvedValueOnce();

    render(<App />);

    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith('checkoutList', JSON.stringify([]));
      expect(mockRemoveItem).toHaveBeenCalledWith('purchasedDrinks');
      expect(mockLoadAsync).toHaveBeenCalled();
      expect(mockInitialRoute).toBe('StoreSelect');
    });
  });

  it('routes guests with a selected store to GeneralHome without validating a token', async () => {
    mockGetItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('store-1');
    mockLoadAsync.mockResolvedValueOnce();

    render(<App />);

    await waitFor(() => {
      expect(mockInitialRoute).toBe('GeneralHome');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('uses GeneralHome route when token is valid and a store is selected', async () => {
    mockGetItem
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('store-1');
    mockLoadAsync.mockResolvedValueOnce();

    render(<App />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/backend/auth/me'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(mockInitialRoute).toBe('GeneralHome');
    });
  });

  it('clears stale auth fields when token validation fails', async () => {
    mockGetItem
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('store-1');
    mockLoadAsync.mockResolvedValueOnce();
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

    render(<App />);

    await waitFor(() => {
      expect(mockRemoveItem).toHaveBeenCalledWith('userToken');
      expect(mockRemoveItem).toHaveBeenCalledWith('userId');
      expect(mockRemoveItem).toHaveBeenCalledWith('first_name');
      expect(mockRemoveItem).toHaveBeenCalledWith('userRole');
      expect(mockInitialRoute).toBe('GeneralHome');
    });
  });
});
