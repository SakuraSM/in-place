import * as SecureStore from 'expo-secure-store';

const SERVER_API_BASE_URL_KEY = 'inplace.server.apiBaseUrl';

export const secureServerConfigStorage = {
  async getApiBaseUrl() {
    return SecureStore.getItemAsync(SERVER_API_BASE_URL_KEY);
  },
  async setApiBaseUrl(apiBaseUrl: string | null) {
    if (apiBaseUrl) {
      await SecureStore.setItemAsync(SERVER_API_BASE_URL_KEY, apiBaseUrl);
      return;
    }

    await SecureStore.deleteItemAsync(SERVER_API_BASE_URL_KEY);
  },
};
