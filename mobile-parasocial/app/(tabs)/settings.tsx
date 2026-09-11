import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';
import { getCache, setCache } from '@/lib/cache';

const UPLOAD_ENDPOINT = (process.env.EXPO_PUBLIC_WEB_URL || 'https://osca-link.vercel.app') + '/api/upload';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [barangay, setBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      const cached = await getCache<{ fullName: string; barangay: string; email: string; profile_picture?: string | null }>('settings');
      if (cached) {
        setFullName(cached.fullName);
        setBarangay(cached.barangay);
        setEmail(cached.email);
        setProfilePicture(cached.profile_picture || null);
      }
      setLoading(false);
      return;
    }

    setFullName((user.user_metadata?.full_name as string) || '');
    setBarangay((user.user_metadata?.barangay as string) || '');
    setEmail(user.email || '');

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_picture')
        .eq('id', user.id)
        .single();
      const pic = profile?.profile_picture || null;
      setProfilePicture(pic);
      setCache('settings', {
        fullName: (user.user_metadata?.full_name as string) || '',
        barangay: (user.user_metadata?.barangay as string) || '',
        email: user.email || '',
        profile_picture: pic,
      });
    } catch {
      const existing = await getCache<{ profile_picture?: string | null }>('settings');
      setCache('settings', {
        fullName: (user.user_metadata?.full_name as string) || '',
        barangay: (user.user_metadata?.barangay as string) || '',
        email: user.email || '',
        profile_picture: existing?.profile_picture || null,
      });
    }
    setLoading(false);
  }

  async function pickImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Allow access to your photo library to change your profile picture.');
        return;
      }
    } catch (e: any) {
      console.warn('[Settings] Media library permission request failed (Expo Go fallback):', e?.message);
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (e: any) {
      console.error('[Settings] Image picker failed:', e);
      Alert.alert('Error', 'Unable to open image picker. If you are using Expo Go, some features may be limited.');
    }
  }

  async function uploadImage(uri: string) {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not authenticated'); return; }

      const fileName = `avatar-${user.id}.jpg`;
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);
      }

      formData.append('folder', 'oscalink/avatars');
      formData.append('publicId', `avatar_${user.id}`);

      const uploadRes = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: formData });
      const data = await uploadRes.json();

      if (!uploadRes.ok) {
        Alert.alert('Upload Error', data.error || 'Failed to upload');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, profile_picture: data.url });

      if (updateError) {
        Alert.alert('Error', updateError.message);
        return;
      }

      setProfilePicture(data.url);
      setCache('settings', {
        fullName, barangay, email,
        profile_picture: data.url,
      });
      const role = user?.user_metadata?.role as string || '';
      setCache('user', {
        barangay, fullName, role, profile_picture: data.url,
      });
      Alert.alert('Updated', 'Profile picture saved.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong');
    } finally {
      setUploading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const initials = fullName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.profileSection}>
        <TouchableOpacity onPress={pickImage} disabled={uploading} style={styles.avatarWrapper}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.editOverlay}>
            {uploading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Image source={require('../../assets/edit-text.png')} style={styles.editOverlayImage} />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{fullName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Barangay</Text>
          <Text style={styles.infoValue}>{barangay}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{email}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutBtnText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.outline,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 44,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  editOverlayImage: {
    width: 16,
    height: 16,
    tintColor: '#000',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.outline,
  },
  signOutBtn: {
    backgroundColor: COLORS.tertiary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
