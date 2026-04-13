module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'App.js',
    'src/components/**/*.{js,jsx}',
    '!src/components/**/Gif.js',
    '!**/*.test.js',
  ],
  coverageReporters: ['text', 'html'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo-google-fonts/.*|react-native-vector-icons))',
  ],
};
