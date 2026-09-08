import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qbdbxwcsvitlmikmdhso.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGJ4d2Nzdml0bG1pa21kaHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjY1NzMsImV4cCI6MjA5MDg0MjU3M30.GcFZGYfwEQpztJgRp6VjiPFe3qxarOrAxcEx8H7Aj2k';

const storage = Platform.OS === 'web'
  ? {
      getItem: (key: string) => {
        try { return Promise.resolve(localStorage.getItem(key)); }
        catch { return Promise.resolve(null); }
      },
      setItem: (key: string, value: string) => {
        try { localStorage.setItem(key, value); } catch {}
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        try { localStorage.removeItem(key); } catch {}
        return Promise.resolve();
      },
    }
  : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
