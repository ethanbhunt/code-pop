// Ingredients.js
// you may have to change juice options to add ins
const sodaOptions = [
  { label: 'mtn. dew', value: 'mtn. dew', color: '#76cfae', image: require('../../assets/sodas/mtn_dew.png') },  // Bright yellow-green
  { label: 'diet mtn. dew', value: 'diet mtn. dew', color: '#a9dbc9', image: require('../../assets/sodas/diet_mtn_dew.png') },  // Light green-yellow
  { label: 'dr. pepper', value: 'dr. pepper', color: '#6A1B9A', image: require('../../assets/sodas/dr_pepper.png') },  // Purple
  { label: 'diet dr. pepper', value: 'diet dr. pepper', color: '#9C27B0', image: require('../../assets/sodas/dr_pepper.png') },  // Light purple
  { label: 'dr. pepper zero', value: 'dr. pepper zero', color: '#9C27B9', image: require('../../assets/sodas/dr_pepper.png') },
  { label: 'dr pepper cream soda', value: 'dr pepper cream soda', color: '#fc1947', image: require('../../assets/sodas/dr_pepper.png') },  // Dark red
  { label: 'sprite', value: 'sprite', color: '#A2D2A6', image: require('../../assets/sodas/sprite.png') },  // Mint green
  { label: 'sprite zero', value: 'sprite zero', color: '#C8E6C9', image: require('../../assets/sodas/sprite.png') },  // Soft green
  { label: 'coke', value: 'coke', color: '#fc1947', image: require('../../assets/sodas/coke.png') },  // Dark red
  { label: 'diet coke', value: 'diet coke', color: '#f75979', image: require('../../assets/sodas/diet_coke.png') },  // Light gray
  { label: 'coke zero', value: 'coke zero', color: '#fc1940', image: require('../../assets/sodas/coke_zero.png') },  // Dark red
  { label: 'pepsi', value: 'pepsi', color: '#1565C0', image: require('../../assets/sodas/pepsi.png') },  // Blue
  { label: 'diet pepsi', value: 'diet pepsi', color: '#1E88E5', image: require('../../assets/sodas/diet_pepsi.png') },  // Lighter blue
  { label: 'rootbeer', value: 'rootbeer', color: '#4E342E', image: require('../../assets/sodas/rootbeer.png') },  // Dark brown
  { label: 'fanta', value: 'fanta', color: '#FF7043', image: require('../../assets/sodas/fanta.png') },  // Orange
  { label: 'big red', value: 'big red', color: '#c75552', image: require('../../assets/sodas/big_red.png') },  // Red
  { label: 'powerade', value: 'powerade', color: '#71bde3', image: require('../../assets/sodas/powerade.png') },  // Purple pink
  { label: 'lemonade', value: 'lemonade', color: '#FBC02D', image: require('../../assets/sodas/lemonade.png') },  // Lemon yellow
  { label: 'light lemonade', value: 'light lemonade', color: '#FFF176', image: require('../../assets/sodas/lemonade.png') },  // Soft yellow
];

const syrupOptions = [
  { label: 'coconut', value: 'coconut', color: '#faf7f2' },  // Light beige
  { label: 'passion fruit', value: 'passion fruit', color: '#FF7043' },  // Orange
  { label: 'mango', value: 'mango', color: '#FFB300' },  // Mango yellow-orange
  { label: 'guava', value: 'guava', color: '#fc86a5' },  // Bright pink
  { label: 'pineapple', value: 'pineapple', color: '#f5b12a' },
  { label: 'banana', value: 'banana', color: '#FBC02D' },  // Yellow
  { label: 'strawberry', value: 'strawberry', color: '#d91129' },  // Strawberry pink
  { label: 'raspberry', value: 'raspberry', color: '#b5093f' },  // Red
  { label: 'blackberry', value: 'blackberry', color: '#4A148C' },  // Dark purple
  { label: 'pomegranate', value: 'pomegranate', color: '#b31537' },  // Purple-pink
  { label: 'cranberry', value: 'cranberry', color: '#660143' },  // Red
  { label: 'grape', value: 'grape', color: '#673AB7' },  // Purple
  { label: 'kiwi', value: 'kiwi', color: '#689e52' },  // Kiwi green
  { label: 'huckleberry', value: 'huckleberry', color: '#3a0a70' },  // Purple
  { label: 'peach', value: 'peach', color: '#FF7043' },  // Light orange
  { label: 'watermelon', value: 'watermelon', color: '#F44336' },  // Watermelon red
  { label: 'green apple', value: 'green apple', color: '#8BC34A' },  // Green
  { label: 'pear', value: 'pear', color: '#A5D6A7' },  // Light green
  { label: 'cherry', value: 'cherry', color: '#D32F2F' },  // Red
  { label: 'orange', value: 'orange', color: '#FF9800' },  // Orange
  { label: 'blood orange', value: 'blood orange', color: '#F57C00' },  // Blood orange
  { label: 'grapefruit', value: 'grapefruit', color: '#FF4081' },  // Pink
  { label: 'sweetened lime', value: 'sweetened lime', color: '#8BC34A' },  // Lime green
  { label: 'lemon', value: 'lemon', color: '#FFEB3B' },  // Lemon yellow
  { label: 'lime', value: 'lime', color: '#CDDC39' },  // Lime green
  { label: 'vanilla', value: 'vanilla', color: '#ffeccf' },  // Warm yellow
  { label: 'cupcake', value: 'cupcake', color: '#FF4081' },  // Pink
  { label: 'salted caramel', value: 'salted caramel', color: '#6D4C41' },  // Brown
  { label: 'chocolate milano', value: 'chocolate milano', color: '#3E2723' },  // Dark brown
  { label: 'cinnamon', value: 'cinnamon', color: '#795548' },  // Brown
  { label: 'choc chip cookie dough', value: 'choc chip cookie dough', color: '#D7CCC8' },  // Beige
  { label: 'brown sugar cinnamon', value: 'brown sugar cinnamon', color: '#6D4C41' },  // Brown
  { label: 'hazelnut', value: 'hazelnut', color: '#5D4037' },  // Brownish
  { label: 'white chocolate', value: 'white chocolate', color: '#F5F5F5' },  // Light white
  { label: 'butterscotch', value: 'butterscotch', color: '#FFB74D' },  // Warm yellow-orange
  { label: 'blue raspberry', value: 'blue raspberry', color: '#2196F3' },  // Blue
  { label: 'sour', value: 'sour', color: '#CDDC39' },  // Sour green
  { label: 'blue curacao', value: 'blue curacao', color: '#1E88E5' },  // Bright blue
  { label: 'bubble gum', value: 'bubble gum', color: '#fc49b5' },
  { label: 'cotton candy', value: 'cotton candy', color: '#b9f8fa' },
  { label: 'mojito', value: 'mojito', color: '#8cc740' },  
  { label: 'cucumber', value: 'cucumber', color: '#35751b' },  
  { label: 'lavender', value: 'lavender', color: '#d894f7' },  
  { label: 'pumpkin spice', value: 'pumpkin spice', color: '#db7d3d' },  // Sour green
  { label: 'peppermint', value: 'peppermint', color: '#fc5372' },
  { label: 'irish cream', value: 'irish cream', color: '#e1f7dc' },
  { label: 'gingerbread', value: 'gingerbread', color: '#804619' },
  { label: 'butterbrew mix', value: 'butterbrew mix', color: '#ad632a' },  // Sour green

];
const AddInOptions = [
  { label: 'cream', value: 'cream', color: '#ffdba6' },
  { label: 'coconot cream', value: 'coconot cream', color: '#ffdba0' },
  { label: 'whip', value: 'whip', color: '#ffdbaf' },
  { label: 'lime wedge', value: 'lime wedge', color: '#d3fc3f' },
  { label: 'lemon wedge', value: 'lemon wedge', color: '#fae170' },
  { label: 'french vanilla creamer', value: 'french vanilla creamer', color: '#deb695' },
  { label: 'candy', value: 'candy', color: '#FF9800' },  // Orange
  { label: 'sprinkles', value: 'sprinkles', color: '#FF4081' },  // Pink
  { label: 'strawberry puree', value: 'strawberry puree', color: '#E91E63' },  // Pink
  { label: 'peach puree', value: 'peach puree', color: '#FF7043' },
  { label: 'mango puree', value: 'mango puree', color: '#faab23' },
  { label: 'raspberry puree', value: 'raspberry puree', color: '#D50000' },  // Red
];

export { sodaOptions, syrupOptions, AddInOptions };
