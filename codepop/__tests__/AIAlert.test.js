import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import AIAlert from '../src/components/AIAlert';

const mockNavigate = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args) => mockGetItem(...args),
  setItem: (...args) => mockSetItem(...args),
}));

jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => <View>{children}</View>;
});

jest.mock('../src/components/Gif', () => 'Gif');

describe('AIAlert', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    global.fetch = jest.fn();
  });

  it('renders drink details from normalized dict data', () => {
    const { getByText } = render(
      <AIAlert
        isModalVisible
        toggleModal={jest.fn()}
        drinkDict={{ Size: '32oz', Ice: 'Light', SodaUsed: ['Sprite'], SyrupsUsed: ['Vanilla'], AddIns: ['Cream'] }}
      />,
    );

    expect(getByText('Size: 32oz')).toBeTruthy();
    expect(getByText('Ice: Light')).toBeTruthy();
    expect(getByText('Soda: Sprite')).toBeTruthy();
  });

  it('creates drink and adds it to cart when Add to Cart is pressed', async () => {
    const toggleModal = jest.fn();
    mockGetItem
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('[]');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { drinkId: 44, name: 'AI drink' } }),
    });

    const { getByText } = render(
      <AIAlert
        isModalVisible
        toggleModal={toggleModal}
        drinkDict={{ sodaUsed: ['Sprite'], syrupsUsed: ['Vanilla'], addIns: ['Cream'], size: '24oz', ice: 'regular' }}
      />,
    );

    fireEvent.press(getByText('Add to Cart'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSetItem).toHaveBeenCalledWith('checkoutList', JSON.stringify([{ drinkId: 44, name: 'AI drink' }]));
      expect(mockNavigate).toHaveBeenCalledWith('Cart');
      expect(toggleModal).toHaveBeenCalled();
    });
  });
});
