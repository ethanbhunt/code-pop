import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';

import StarRating from '../src/components/StarRating';

jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon');

describe('StarRating', () => {
  it('renders 5 selectable stars', () => {
    const { UNSAFE_getAllByType } = render(<StarRating onRatingSelected={jest.fn()} />);

    expect(UNSAFE_getAllByType(TouchableOpacity)).toHaveLength(5);
  });

  it('emits selected rating when a star is tapped', () => {
    const onRatingSelected = jest.fn();
    const { UNSAFE_getAllByType } = render(<StarRating onRatingSelected={onRatingSelected} />);

    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[3]);

    expect(onRatingSelected).toHaveBeenCalledWith(4);
  });
});
