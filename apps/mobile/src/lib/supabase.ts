import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

// Validate at runtime — cast is safe only after this guard
if (!supabaseUrl || typeof supabaseUrl !== 'string') {
  throw new Error(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL is not set.\n' +
    'Copy .env.example → .env.local and add your Supabase URL.'
  );
}
if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string') {
  throw new Error(
    '[Supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY is not set.\n' +
    'Copy .env.example → .env.local and add your anon key.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Deep-link OAuth callback (for future Google/GitHub OAuth)
    // flowType: 'pkce',  — enable when adding OAuth providers
  },
});
