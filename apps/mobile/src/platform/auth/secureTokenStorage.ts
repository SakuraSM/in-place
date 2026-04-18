import * as SecureStore from 'expo-secure-store';
import type { TokenStorage } from '@inplace/api-client';

const AUTH_TOKEN_KEY = 'inplace.auth.token';

export const secureTokenStorage: TokenStorage = {
  async get() {
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },
  async set(token: string | null) {
    if (token) {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      return;
    }

    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
};
