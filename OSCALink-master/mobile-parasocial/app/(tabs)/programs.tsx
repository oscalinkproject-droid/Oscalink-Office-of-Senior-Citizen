import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';

interface Program {
  id: string;
  title: string;
  content: string;
  category: string;
  publish_date: string;
}

export default function ProgramsScreen() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('news')
      .select('id, title, content, category, publish_date')
      .eq('is_published', true)
      .order('publish_date', { ascending: false })
      .then(({ data }) => {
        setPrograms(data || []);
        setLoading(false);
      });
  }, []);

  const categoryColors: Record<string, { bg: string; text: string }> = {
    News: { bg: '#DBEAFE', text: '#2563EB' },
    Activity: { bg: '#D1FAE5', text: COLORS.primary },
    Announcement: { bg: '#FEF3C7', text: '#D97706' },
    Alert: { bg: '#FEE2E2', text: COLORS.tertiary },
  };

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Programs & Services</Text>
        <Text style={styles.subtitle}>Active programs from MSWD and OSCA</Text>
      </View>

      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No programs or announcements available.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const colors = categoryColors[item.category] || { bg: COLORS.outline, text: COLORS.textSecondary };
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.categoryText, { color: colors.text }]}>{item.category}</Text>
                </View>
              </View>
              <Text style={styles.cardContent} numberOfLines={4}>{item.content}</Text>
              {item.publish_date && (
                <Text style={styles.cardDate}>{formatDate(item.publish_date)}</Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  cardDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
