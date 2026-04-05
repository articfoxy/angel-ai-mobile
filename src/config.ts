const PRODUCTION_URL = 'https://angel-ai-server-production.up.railway.app';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_URL;
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || PRODUCTION_URL;
