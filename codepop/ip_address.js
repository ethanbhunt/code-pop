import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Optional Expo .env: EXPO_PUBLIC_CODEPOP_API_HOST, EXPO_PUBLIC_CODEPOP_API_PORT
const API_HOST_OVERRIDE = process.env.EXPO_PUBLIC_CODEPOP_API_HOST?.trim();
const parsedPort = parseInt(process.env.EXPO_PUBLIC_CODEPOP_API_PORT ?? "", 10);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3001;

/**
 * Your PC's Wi‑Fi IPv4 when testing on a *physical* phone (same network as PC).
 * Windows: ipconfig → "Wireless LAN" IPv4. Not used on Android emulator.
 */
const LAN_HOST = '10.0.0.105';

/**
 * Host that reaches the machine running the OrbitDB peer (port PORT).
 * Uses expo-device (not Constants.isDevice) so Android Studio emulators reliably use 10.0.2.2.
 */
function devApiHost() {
  if (API_HOST_OVERRIDE) {
    return API_HOST_OVERRIDE;
  }
  if (Platform.OS === 'web') {
    return 'localhost';
  }
  const physical = Device.isDevice === true;
  if (Platform.OS === 'android') {
    return physical ? LAN_HOST : '10.0.2.2';
  }
  if (Platform.OS === 'ios') {
    return physical ? LAN_HOST : 'localhost';
  }
  return LAN_HOST;
}

const BASE_URL = `http://${devApiHost()}:${PORT}`;

if (__DEV__) {
  console.log('[CodePop API]', BASE_URL);
}

/** Same Orbit peer as BASE_URL; path matches peer-node mounts. */
export function getAiDrinkUrl(userId = null) {
  const base = `${BASE_URL}/peer-ai-drink`;
  if (userId == null || userId === '' || userId === 'null') {
    return base;
  }
  return `${base}/${String(userId)}`;
}

export { BASE_URL };
