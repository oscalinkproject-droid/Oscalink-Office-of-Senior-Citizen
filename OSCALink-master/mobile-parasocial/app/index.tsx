import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';

export default function IndexScreen() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session);
    });
  }, []);

  if (session === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
