// Android emulator special IP: 10.0.2.2 maps to host machine's localhost
// For iOS simulator and web: would use localhost:3001
// For physical devices: would use machine's actual IP address
const BASE_URL = 'http://10.0.2.2:3001'; // Android emulator → host machine

export { BASE_URL };