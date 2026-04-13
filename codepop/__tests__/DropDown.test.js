import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import DropDown from '../src/components/DropDown';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('DropDown', () => {
  const options = [
    { value: 'Vanilla', label: 'Vanilla', color: '#ffffff' },
    { value: 'Cola', label: 'Cola', color: '#222222' },
  ];

  it('renders title and toggles open callback', () => {
    const onOpen = jest.fn();
    const { getByText } = render(
      <DropDown
        title="Syrups"
        options={options}
        onSelect={jest.fn()}
        isOpen={false}
        setOpen={onOpen}
        selectedValues={[]}
      />,
    );

    fireEvent.press(getByText('Syrups'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('renders option buttons and inventory when open', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <DropDown
        title="Syrups"
        options={options}
        onSelect={onSelect}
        isOpen
        setOpen={jest.fn()}
        selectedValues={['vanilla']}
        tintByFlavor
        inventoryMap={{ Vanilla: { quantity: 2, lowStock: true } }}
      />,
    );

    fireEvent.press(getByText('Vanilla'));

    expect(onSelect).toHaveBeenCalledWith('Vanilla');
    expect(getByText('⚠️ 2')).toBeTruthy();
  });
});
