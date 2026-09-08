import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, ENDORSEMENT_TYPES } from '@/lib/constants';
import {
  getPendingEndorsements,
  addPendingEndorsement,
  syncPendingEndorsements,
  PendingEndorsement,
} from '@/lib/sync';
import { getCache, setCache } from '@/lib/cache';

const UPLOAD_ENDPOINT = 'https://osca-link.vercel.app/api/upload';

interface RemoteEndorsement {
  id: string;
  endorsement_type: string;
  status: string;
  created_at: string;
  senior_id?: string | null;
  seniors?: { full_name: string } | null;
  case_study_report_url?: string | null;
  clearance_cert_url?: string | null;
  president_countersignature_url?: string | null;
  recommended_amount?: number | null;
}

type EndorsementItem = RemoteEndorsement | PendingEndorsement;

export default function EndorsementsScreen() {
  const { seniorId: querySeniorId, seniorName: querySeniorName } = useLocalSearchParams<{ seniorId?: string; seniorName?: string }>();
  const [items, setItems] = useState<EndorsementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [type, setType] = useState<typeof ENDORSEMENT_TYPES[number]>(ENDORSEMENT_TYPES[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [selectedSeniorId, setSelectedSeniorId] = useState<string | null>(null);
  const [selectedSeniorName, setSelectedSeniorName] = useState<string | null>(null);
  const [seniorSearch, setSeniorSearch] = useState('');
  const [seniorResults, setSeniorResults] = useState<any[]>([]);
  const [showSeniorDropdown, setShowSeniorDropdown] = useState(false);

  const [caseStudyUrl, setCaseStudyUrl] = useState<string | null>(null);
  const [clearanceCertUrl, setClearanceCertUrl] = useState<string | null>(null);
  const [presidentSigUrl, setPresidentSigUrl] = useState<string | null>(null);
  const [caseStudyUploading, setCaseStudyUploading] = useState(false);
  const [clearanceUploading, setClearanceUploading] = useState(false);
  const [presidentUploading, setPresidentUploading] = useState(false);
  const [recommendedAmount, setRecommendedAmount] = useState('');

  useEffect(() => {
    if (querySeniorId && querySeniorName) {
      setSelectedSeniorId(querySeniorId);
      setSelectedSeniorName(querySeniorName);
      setSeniorSearch(querySeniorName);
    }
  }, [querySeniorId, querySeniorName]);

  useEffect(() => {
    if (seniorSearch.length > 2 && !selectedSeniorId) {
      const search = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const barangay = session?.user?.user_metadata?.barangay;
        let query = supabase.from('seniors').select('id, full_name').ilike('full_name', `%${seniorSearch}%`);
        if (barangay) {
          query = query.eq('barangay', barangay);
        }
        const { data } = await query.limit(5);
        setSeniorResults(data || []);
        setShowSeniorDropdown(true);
      };
      search();
    } else {
      setSeniorResults([]);
      setShowSeniorDropdown(false);
    }
  }, [seniorSearch, selectedSeniorId]);

  const loadAll = useCallback(async () => {
    const netState = await NetInfo.fetch();
    const offline = !netState.isConnected && !netState.isInternetReachable;

    const { data: { session } } = await supabase.auth.getSession();
    const barangay = session?.user?.user_metadata?.barangay as string;

    if (!barangay && offline) {
      const cached = await getCache<RemoteEndorsement[]>('endorsements');
      const pending = await getPendingEndorsements();
      mergeItems(pending, cached || []);
      setLoading(false);
      return;
    }

    if (!offline && barangay) {
      try {
        const { data: remote } = await supabase
          .from('endorsements')
          .select('id, endorsement_type, status, created_at, senior_id, seniors(full_name)')
          .eq('barangay', barangay)
          .order('created_at', { ascending: false });
        setCache('endorsements', remote || []);
      } catch {}
    }

    const pending = await getPendingEndorsements();
    const cached = await getCache<RemoteEndorsement[]>('endorsements');
    mergeItems(pending, cached || []);
    setLoading(false);
  }, []);

  function mergeItems(pending: PendingEndorsement[], remote: RemoteEndorsement[]) {
    const merged: EndorsementItem[] = [...pending, ...remote];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setItems(merged);
  }

  useEffect(() => {
    (async () => {
      setSyncing(true);
      await syncPendingEndorsements();
      setSyncing(false);
      loadAll();
    })();
  }, [loadAll]);

  async function handleSubmit() {
    if (!selectedSeniorId) {
      setError('Please select a senior citizen');
      return;
    }

    if (type === 'Other' && !note.trim()) {
      setError('Notes are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    const barangay = session?.user?.user_metadata?.barangay as string;
    const userId = session?.user?.id as string;

    await addPendingEndorsement({
      endorsement_type: type,
      notes: note.trim() || null,
      barangay,
      submitted_by: userId,
      senior_id: selectedSeniorId,
      senior_name: selectedSeniorName,
      case_study_report_url: caseStudyUrl,
      clearance_cert_url: clearanceCertUrl,
      president_countersignature_url: presidentSigUrl,
      recommended_amount: recommendedAmount ? parseFloat(recommendedAmount) : null,
    });

    setNote('');
    setCaseStudyUrl(null);
    setClearanceCertUrl(null);
    setPresidentSigUrl(null);
    setRecommendedAmount('');
    setSelectedSeniorId(null);
    setSelectedSeniorName(null);
    setSeniorSearch('');
    setSubmitting(false);

    const { synced } = await syncPendingEndorsements();
    if (synced === 0) {
      setError('Saved offline — will sync when connected');
    } else {
      setError(null);
    }

    loadAll();
  }

  async function uploadDocument(uri: string, field: string): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id as string;
      if (!userId) { Alert.alert('Error', 'Not authenticated'); return null; }

      const fileName = `${field}-${userId}-${Date.now()}.jpg`;
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);
      }

      formData.append('folder', 'oscalink/endorsements');
      formData.append('publicId', `${field}_${userId}_${Date.now()}`);

      const uploadRes = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: formData });
      const data = await uploadRes.json();

      if (!uploadRes.ok) {
        Alert.alert('Upload Error', data.error || 'Failed to upload');
        return null;
      }

      return data.url;
    } catch (e) {
      console.error('Upload failed:', e);
      Alert.alert('Upload Error', 'Failed to upload document. Please try again.');
      return null;
    }
  }

  async function pickDocument(
    setUrl: (url: string | null) => void,
    setUploading: (v: boolean) => void,
    label: string,
  ) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', `Allow access to your photo library to upload the ${label}.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploading(true);
    const url = await uploadDocument(result.assets[0].uri, label.toLowerCase().replace(/\s+/g, '_'));
    setUploading(false);

    if (url) setUrl(url);
  }

  async function handleRetry() {
    setSyncing(true);
    const pending = await getPendingEndorsements();
    if (pending.length === 0) {
      setError(null);
      setSyncing(false);
      loadAll();
      return;
    }
    const { synced, failed } = await syncPendingEndorsements();
    setSyncing(false);

    if (failed.length > 0) {
      setError(`${synced} synced, ${failed.length} still pending`);
    } else {
      setError(null);
    }
    loadAll();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function isPending(item: EndorsementItem): item is PendingEndorsement {
    return (item as PendingEndorsement).local_id !== undefined;
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
        <Text style={styles.title}>Endorsements</Text>
        <TouchableOpacity style={styles.headerSyncBtn} onPress={handleRetry} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.headerSyncText}>Sync Now</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Senior Citizen *</Text>
        {selectedSeniorId ? (
          <View style={styles.seniorSelectedContainer}>
            <Text style={styles.seniorSelectedText}>{selectedSeniorName}</Text>
            <TouchableOpacity onPress={() => { setSelectedSeniorId(null); setSelectedSeniorName(null); setSeniorSearch(''); }}>
              <Text style={styles.seniorChangeText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ zIndex: 10 }}>
            <TextInput
              style={styles.input}
              value={seniorSearch}
              onChangeText={setSeniorSearch}
              placeholder="Search senior by name..."
              placeholderTextColor={COLORS.textSecondary}
            />
            {showSeniorDropdown && seniorResults.length > 0 && (
              <View style={styles.dropdown}>
                {seniorResults.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedSeniorId(s.id);
                      setSelectedSeniorName(s.full_name);
                      setSeniorSearch(s.full_name);
                      setShowSeniorDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{s.full_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={styles.label}>Endorsement Type</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(!showPicker)}>
          <Text style={styles.pickerText}>{type}</Text>
          <Text style={styles.pickerArrow}>{showPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showPicker && (
          <View style={styles.pickerOptions}>
            {ENDORSEMENT_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.pickerOption, t === type && styles.pickerOptionActive]}
                onPress={() => { setType(t); setShowPicker(false); setError(null); }}
              >
                <Text style={[styles.pickerOptionText, t === type && styles.pickerOptionTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Notes{type === 'Other' ? '' : ' (optional)'}</Text>
        <TextInput
          style={styles.textArea}
          value={note}
          onChangeText={setNote}
          placeholder="Additional notes..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Case Study Report</Text>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => pickDocument(setCaseStudyUrl, setCaseStudyUploading, 'Case Study Report')}
          disabled={caseStudyUploading}
        >
          {caseStudyUploading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.uploadBtnText}>
              {caseStudyUrl ? '✓ Case Study Uploaded' : 'Upload Case Study Report'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Certificate of Indigency / Residency</Text>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => pickDocument(setClearanceCertUrl, setClearanceUploading, 'Clearance Cert')}
          disabled={clearanceUploading}
        >
          {clearanceUploading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.uploadBtnText}>
              {clearanceCertUrl ? '✓ Clearance Uploaded' : 'Upload Clearance Certificate'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Barangay SC President Countersignature</Text>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => pickDocument(setPresidentSigUrl, setPresidentUploading, 'President Countersignature')}
          disabled={presidentUploading}
        >
          {presidentUploading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.uploadBtnText}>
              {presidentSigUrl ? '✓ Countersignature Uploaded' : 'Upload Countersignature'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Recommended Amount (₱)</Text>
        <TextInput
          style={styles.input}
          value={recommendedAmount}
          onChangeText={setRecommendedAmount}
          placeholder="e.g. 5000"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="numeric"
        />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Endorsement</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>History</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => isPending(item) ? item.local_id : item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No endorsements submitted yet.</Text>
        }
        renderItem={({ item }) => {
          const seniorName = isPending(item) 
            ? item.senior_name 
            : (item.seniors?.full_name || 'General Endorsement');
          return (
            <View style={[styles.historyCard, isPending(item) && styles.historyCardPending]}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyType}>{item.endorsement_type}</Text>
                <Text style={styles.historySenior}>For: {seniorName}</Text>
                <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                {(item as any).recommended_amount != null && (
                  <Text style={styles.historyAmount}>
                    ₱{Number((item as any).recommended_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </Text>
                )}
              </View>
              <View style={[
                styles.historyBadge,
                isPending(item) ? styles.historyBadgePending :
                item.status === 'Active' ? styles.historyBadgeActive :
                item.status === 'Completed' ? styles.historyBadgeCompleted :
                styles.historyBadgeDefault,
              ]}>
                <Text style={[
                  styles.historyBadgeText,
                  isPending(item) ? styles.historyBadgeTextPending :
                  item.status === 'Active' ? styles.historyBadgeTextActive :
                  item.status === 'Completed' ? styles.historyBadgeTextCompleted :
                  styles.historyBadgeTextDefault,
                ]}>
                  {isPending(item) ? 'Pending' : item.status}
                </Text>
              </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSyncBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    marginBottom: 2,
  },
  headerSyncText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  form: {
    margin: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 12,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  pickerText: {
    fontSize: 15,
    color: COLORS.text,
  },
  pickerArrow: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  pickerOptions: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outline,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outline,
  },
  pickerOptionActive: {
    backgroundColor: COLORS.primaryLight,
  },
  pickerOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  pickerOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.outline,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 13,
    color: COLORS.tertiary,
    marginTop: 8,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  historyCardPending: {
    borderColor: COLORS.warning,
    borderStyle: 'dashed',
  },
  historyLeft: {
    flex: 1,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  historyBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  historyBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  historyBadgeCompleted: {
    backgroundColor: '#DBEAFE',
  },
  historyBadgeDefault: {
    backgroundColor: COLORS.outline,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  historyBadgeTextPending: {
    color: '#92400E',
  },
  historyBadgeTextActive: {
    color: COLORS.success,
  },
  historyBadgeTextCompleted: {
    color: '#2563EB',
  },
  historyBadgeTextDefault: {
    color: COLORS.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    paddingVertical: 32,
  },
  seniorSelectedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.outline,
    marginTop: 8,
    marginBottom: 8,
  },
  seniorSelectedText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  seniorChangeText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.outline,
    marginTop: 8,
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outline,
    marginTop: 2,
    overflow: 'hidden',
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outline,
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.text,
  },
  historySenior: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  uploadBtn: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 4,
  },
  uploadBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
