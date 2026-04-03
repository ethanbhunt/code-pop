const resolveBaseUrl = () => {
	const configuredUrl =
		process.env.EXPO_PUBLIC_BACKEND_URL ||
		process.env.EXPO_PUBLIC_API_URL ||
		'http://localhost:3001';

	return configuredUrl.replace(/\/$/, '');
};

export const BASE_URL = resolveBaseUrl();