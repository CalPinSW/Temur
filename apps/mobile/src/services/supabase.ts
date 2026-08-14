import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// SecureStore has a 2048 byte limit, so we need to chunk large values
const CHUNK_SIZE = 1800; // Leave some headroom

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      console.log(`[SecureStore] Getting item: ${key}`);
      const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);

      if (chunkCountStr) {
        // Value was chunked
        const chunkCount = parseInt(chunkCountStr, 10);
        const chunks: string[] = [];

        for (let i = 0; i < chunkCount; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (chunk) chunks.push(chunk);
        }

        console.log(`[SecureStore] Retrieved ${chunks.length} chunks for ${key}`);
        return chunks.join('');
      }

      // Try regular storage (for small values or migration)
      const value = await SecureStore.getItemAsync(key);
      console.log(`[SecureStore] Retrieved value for ${key}:`, value ? 'exists' : 'null');
      return value;
    } catch (error) {
      console.error(`[SecureStore] Error getting item ${key}:`, error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      console.log(`[SecureStore] Setting item: ${key}, length: ${value.length}`);
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
        console.log(`[SecureStore] Stored ${key} directly`);
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
        console.log(`[SecureStore] Stored ${key} in ${chunks.length} chunks`);
      }
    } catch (error) {
      console.error(`[SecureStore] Error setting item ${key}:`, error);
      throw error;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      console.log(`[SecureStore] Removing item: ${key}`);
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
      console.log(`[SecureStore] Removed ${key}`);
    } catch (error) {
      console.error(`[SecureStore] Error removing item ${key}:`, error);
      throw error;
    }
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
