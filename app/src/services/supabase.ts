import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// SecureStore has a 2048 byte limit, so we need to chunk large values
const CHUNK_SIZE = 1800; // Leave some headroom

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);

    if (chunkCountStr) {
      // Value was chunked
      const chunkCount = parseInt(chunkCountStr, 10);
      const chunks: string[] = [];

      for (let i = 0; i < chunkCount; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        if (chunk) chunks.push(chunk);
      }

      return chunks.join('');
    }

    // Try regular storage (for small values or migration)
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    // First, clean up any existing chunks
    const existingChunks = await SecureStore.getItemAsync(`${key}_chunks`);
    if (existingChunks) {
      const count = parseInt(existingChunks, 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }

    // Also clean up non-chunked version if it exists
    await SecureStore.deleteItemAsync(key);

    if (value.length <= CHUNK_SIZE) {
      // Small enough to store directly
      await SecureStore.setItemAsync(key, value);
    } else {
      // Need to chunk
      const chunks = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      // Store chunk count
      await SecureStore.setItemAsync(`${key}_chunks`, chunks.length.toString());

      // Store each chunk
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
      }
    }
  },

  removeItem: async (key: string): Promise<void> => {
    // Remove chunked data if it exists
    const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
    if (chunkCountStr) {
      const chunkCount = parseInt(chunkCountStr, 10);
      for (let i = 0; i < chunkCount; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }

    // Also remove non-chunked version
    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase config. Check your app/.env file has EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
