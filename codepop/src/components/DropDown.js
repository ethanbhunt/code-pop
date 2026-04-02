import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

/** Dark text on light fills, light text on dark — for flavor-colored chips. */
function contrastTextForBackground(hexColor) {
  if (!hexColor || typeof hexColor !== 'string') return '#444';
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#444';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return '#444';
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#1c334d' : '#ffffff';
}

const DropDown = ({
  title,
  options = [],
  onSelect,
  isOpen,
  setOpen,
  selectedValues = [],
  tintByFlavor = false,
}) => {
  const toggleItemSelection = (item) => {
    onSelect(item);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={setOpen} style={[
        styles.collapsible,
        isOpen && styles.collapsibleOpen,
      ]}>
        <Text style={styles.collapsibleText}>{title}</Text>
        <Icon name={isOpen ? "caret-up-outline" : "caret-down-outline"} size={24} color="#000" />
      </TouchableOpacity>
      {isOpen && options.length > 0 && (
        <View style={styles.content}>
          <View style={styles.buttonContainer}>
            {options.map((option) => {
              const selected = selectedValues.includes(option.value.toLowerCase());
              const flavorColor = tintByFlavor && option.color ? option.color : null;
              const labelColor = flavorColor ? contrastTextForBackground(flavorColor) : '#444';
              return (
                <View key={option.value} style={styles.buttonWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.circularButton,
                      flavorColor && { backgroundColor: flavorColor, borderColor: flavorColor },
                      selected && (flavorColor ? styles.circularButtonSelectedFlavor : styles.circularButtonSelected),
                    ]}
                    onPress={() => toggleItemSelection(option.value)}
                  >
                    {option.image ? (
                      <Image source={option.image} style={{ width: 50, height: 50 }} resizeMode="contain" />
                    ) : (
                      <Text
                        style={[
                          styles.buttonText,
                          flavorColor && { color: labelColor },
                          selected && !flavorColor && styles.buttonTextSelected,
                          selected && flavorColor && { color: labelColor, fontWeight: '800' },
                        ]}
                        numberOfLines={3}
                      >
                        {option.value}
                      </Text>
                    )}
                  </TouchableOpacity>
                  {option.image && <Text style={styles.buttonLabel}>{option.label}</Text>}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 10,
  },
  collapsible: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: '#E1E5F2',
    backgroundColor: '#E1E5F2',
    borderRadius: 15,
    padding: 18,
    width: '100%',
    borderWidth: 2,
  },
  collapsibleText: {
    color: '#444',
    fontSize: 15,
    textAlign: 'left',
  },
  collapsibleOpen: {
    backgroundColor: '#E1E5F2',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  content: {
    padding: 18,
    backgroundColor: '#E1E5F2',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  circularButton: {
    width: 60,
    height: 60,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BFDBF7',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5, // For Android
  },
  circularButtonSelected: {
    borderColor: '#1F7A8C',
    backgroundColor: '#1F7A8C',
    shadowColor: '#1F7A8C',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
  },
  circularButtonSelectedFlavor: {
    borderColor: '#1F7A8C',
    borderWidth: 3,
    shadowColor: '#1F7A8C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonWrapper: {
    alignItems: 'center',
    margin: 5,
    width: 70,
  },
  buttonText: {
    color: '#444',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonTextSelected: {
    color: '#ffffff',
  },
  buttonLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#444',
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedOption: {
    backgroundColor: '#8DF1D3',
    color: '#fff', // Change text color for selected options
  }
});

export default DropDown;
