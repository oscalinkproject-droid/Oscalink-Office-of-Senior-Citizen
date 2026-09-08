import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'cache:';

function key(name: string) { return PREFIX + name; }

export async function getCache<T>(name: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key(name));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiry && Date.now() > parsed.expiry) {
      await AsyncStorage.removeItem(key(name));
      return null;
    }
    return parsed.data as T;
  } catch { return null; }
}

export async function setCache<T>(name: string, data: T, ttlMs = 24 * 60 * 60 * 1000) {
  try {
    await AsyncStorage.setItem(key(name), JSON.stringify({ data, expiry: Date.now() + ttlMs }));
  } catch {}
}

export async function clearCache(name: string) {
  try { await AsyncStorage.removeItem(key(name)); } catch {}
}
