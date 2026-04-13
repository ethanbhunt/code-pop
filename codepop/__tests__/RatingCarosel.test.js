import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import RatingCarosel from '../src/components/RatingCarosel';

const mockGetItem = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args) => mockGetItem(...args),
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

jest.mock('../src/components/Gif', () => 'Gif');

jest.mock('../src/components/StarRating', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ onRatingSelected }) => (
    <TouchableOpacity onPress={() => onRatingSelected(5)}>
      <Text>Rate</Text>
    </TouchableOpacity>
  );
});

describe('RatingCarosel', () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('renders purchased drink item and sends a rating update', async () => {
    mockGetItem.mockResolvedValue('token-1');

    const purchasedDrinks = [
      {
        drinkId: 5,
        name: 'Cloud Nine',
        price: 3,
        sodaUsed: ['Sprite'],
        syrupsUsed: ['Vanilla'],
        addIns: ['Cream'],
        userCreated: true,
        size: '24oz',
        ice: 'regular',
      },
    ];

    const { getByText } = render(<RatingCarosel purchasedDrinks={purchasedDrinks} />);

    fireEvent.press(getByText('Rate'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/backend/drinks/5/'),
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });
});
