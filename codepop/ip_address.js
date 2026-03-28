// Android emulator special IP: 10.0.2.2 maps to host machine's localhost.
// Default to Django backend on :8000. Use :3001 when testing OrbitDB service.
const BASE_URL = 'http://localhost:3001';

export { BASE_URL };