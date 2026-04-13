import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import NavBar from '../src/components/NavBar';

const mockNavigate = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('NavBar', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseRoute.mockReset();
  });

  it('renders all nav labels', () => {
    mockUseRoute.mockReturnValue({ name: 'GeneralHome' });
    const { getByText } = render(<NavBar />);

    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Order')).toBeTruthy();
    expect(getByText('Cart')).toBeTruthy();
    expect(getByText('Tracking')).toBeTruthy();
    expect(getByText('Support')).toBeTruthy();
  });

  it('navigates when a nav item is pressed', () => {
    mockUseRoute.mockReturnValue({ name: 'GeneralHome' });
    const { getByText } = render(<NavBar />);

    fireEvent.press(getByText('Order'));

    expect(mockNavigate).toHaveBeenCalledWith('CreateDrink');
  });
});
