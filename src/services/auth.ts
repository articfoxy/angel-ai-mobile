import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';
import type { AuthResponse, User } from '../types';

const TOKEN_KEY = 'angel_ai_token';
const REFRESH_TOKEN_KEY = 'angel_ai_refresh_token';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function storeRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

async function getStoredRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Login failed');
  }

  const data: AuthResponse = await response.json();
  await storeToken(data.token);
  if (data.refreshToken) {
    await storeRefreshToken(data.refreshToken);
  }
  return data.user;
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Registration failed' }));
    throw new Error(error.message || 'Registration failed');
  }

  const data: AuthResponse = await response.json();
  await storeToken(data.token);
  if (data.refreshToken) {
    await storeRefreshToken(data.refreshToken);
  }
  return data.user;
}

export async function logout(): Promise<void> {
  await clearTokens();
}

export async function refreshToken(): Promise<string> {
  const storedRefresh = await getStoredRefreshToken();
  if (!storedRefresh) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: storedRefresh }),
  });

  if (!response.ok) {
    await clearTokens();
    throw new Error('Token refresh failed');
  }

  const data: AuthResponse = await response.json();
  await storeToken(data.token);
  if (data.refreshToken) {
    await storeRefreshToken(data.refreshToken);
  }
  return data.token;
}
