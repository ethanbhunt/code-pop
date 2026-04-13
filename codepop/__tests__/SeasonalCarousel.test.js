import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SeasonalCarousel from '../src/components/SeasonalCarousel';

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

jest.mock('react-native-reanimated-carousel', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ data = [], renderItem }) => (
    <View>
      {data.map((item, index) => (
        <View key={String(index)}>{renderItem({ item, index })}</View>
      ))}
    </View>
  );
});

describe('SeasonalCarousel', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    global.fetch = jest.fn();
  });

  it('skips loading drinks when no token exists', async () => {
    mockGetItem.mockResolvedValueOnce(null);

    render(<SeasonalCarousel />);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('loads drinks and adds selected item to checkout list', async () => {
    mockGetItem.mockImplementation(async (key) => {
      if (key === 'userToken') return 'token-1';
      if (key === 'checkoutList') return '[]';
      return null;
    });

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ drinkId: 1, name: 'Fizz', price: 2.5, sodaUsed: ['Coke'], syrupsUsed: [], addIns: [] }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { drinkId: 2, name: 'Fizz', price: 2.5, sodaUsed: ['Coke'], syrupsUsed: [], addIns: [] } }),
      });

    const { getByText } = render(<SeasonalCarousel />);

    await waitFor(() => expect(getByText('Fizz')).toBeTruthy());

    fireEvent.press(getByText('Fizz'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockSetItem).toHaveBeenCalledWith('checkoutList', expect.any(String));
      expect(mockNavigate).toHaveBeenCalledWith('Cart');
    });
  }, 15000);
});
