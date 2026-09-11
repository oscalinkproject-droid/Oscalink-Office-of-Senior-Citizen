import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';
import { addPendingSeniorUpdate } from '@/lib/sync';
import { getCache, setCache } from '@/lib/cache';

const CIVIL_STATUS = ['Single', 'Married', 'Widowed', 'Separated', 'Others'] as const;
const CLASSIFICATIONS = ['Indigent', 'Non-Indigent', 'Solo Parent', 'PWD', 'Lives Alone'] as const;
const EDUCATION = ['None', 'Elementary', 'High School', 'Vocational', 'College', 'Post Graduate'] as const;
const EMPLOYMENT = ['Employed', 'Self-Employed', 'Unemployed', 'Retired', 'OFW', 'Housewife'] as const;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function Picker({ label, value, options, onSelect }: {
  label: string; value: string; options: readonly string[]; onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.picker} onPress={() => setOpen(!open)}>
        <Text style={[styles.pickerText, !value && styles.placeholder]}>{value || `Select ${label.toLowerCase()}...`}</Text>
        <Text style={styles.pickerArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.pickerOptions}>
          {options.map(o => (
            <TouchableOpacity key={o} style={[styles.pickerOption, o === value && styles.pickerOptionActive]} onPress={() => { onSelect(o); setOpen(false); }}>
              <Text style={[styles.pickerOptionText, o === value && styles.pickerOptionTextActive]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SeniorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [senior, setSenior] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState('');
  const [civilStatus, setCivilStatus] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [philhealth, setPhilhealth] = useState('');
  const [sss, setSss] = useState('');
  const [gsis, setGsis] = useState('');
  const [tin, setTin] = useState('');
  const [classification, setClassification] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [education, setEducation] = useState('');
  const [employment, setEmployment] = useState('');
  const [occupation, setOccupation] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [religion, setReligion] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [isBedridden, setIsBedridden] = useState(false);

  useEffect(() => { loadSenior(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSenior() {
    if (!id) return;

    const netState = await NetInfo.fetch();
    const offline = !netState.isConnected && !netState.isInternetReachable;

    const applyData = (data: any) => {
      setSenior(data);
      setFullName(data.full_name || '');
      setBirthdate(data.birthdate || '');
      setSex(data.sex || '');
      setCivilStatus(data.civil_status || '');
      setContact(data.contact_number || '');
      setEmail(data.email || '');
      setAddress(data.address || '');
      setPlaceOfBirth(data.place_of_birth || '');
      setPhilhealth(data.philhealth_no || '');
      setSss(data.sss_no || '');
      setGsis(data.gsis_no || '');
      setTin(data.tin || '');
      setClassification(data.classification || '');
      setMonthlyIncome(data.monthly_income || '');
      setEducation(data.education || '');
      setEmployment(data.employment_status || '');
      setOccupation(data.occupation || '');
      setBloodType(data.blood_type || '');
      setReligion(data.religion || '');
      setEmergencyName(data.emergency_contact_name || '');
      setEmergencyNumber(data.emergency_contact_number || '');
      setIsBedridden(data.is_bedridden || false);
    };

    if (offline) {
      const cached = await getCache<any>(`senior:${id}`);
      if (cached) applyData(cached);
      setLoading(false);
      return;
    }

    const { data } = await supabase.from('seniors').select('*').eq('id', id).single();
    if (data) {
      applyData(data);
      setCache(`senior:${id}`, data);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!fullName.trim() || !birthdate || !sex || !address.trim()) {
      Alert.alert('Error', 'Full name, birthdate, sex, and address are required');
      return;
    }
    setSaving(true);

    const updateData = {
      full_name: fullName.trim(), birthdate, sex,
      civil_status: civilStatus || null,
      contact_number: contact.replace(/\D/g, '') || null,
      email: email.trim() || null,
      address: address.trim(),
      place_of_birth: placeOfBirth.trim() || null,
      philhealth_no: philhealth.trim() || null,
      sss_no: sss.trim() || null,
      gsis_no: gsis.trim() || null,
      tin: tin.trim() || null,
      classification: classification || null,
      monthly_income: monthlyIncome || null,
      education: education || null,
      employment_status: employment || null,
      occupation: occupation.trim() || null,
      blood_type: bloodType || null,
      religion: religion.trim() || null,
      emergency_contact_name: emergencyName.trim() || null,
      emergency_contact_number: emergencyNumber.replace(/\D/g, '') || null,
      is_bedridden: isBedridden,
    };

    const netState = await NetInfo.fetch();
    const offline = !netState.isConnected && !netState.isInternetReachable;

    if (offline) {
      await addPendingSeniorUpdate(id, updateData);
      Alert.alert('Saved Offline', 'Changes will sync when internet is back.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('seniors').update(updateData).eq('id', id);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Saved', 'Senior information updated.');
      setCache(`senior:${id}`, { ...senior, ...updateData });

      // Trigger web server cache revalidation for data freshness
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://osca-link.vercel.app';
          fetch(`${webUrl}/api/revalidate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ paths: ['/directory', '/dashboard', '/reports', '/inventory'] }),
          }).catch(() => {});
        }
      } catch (_e) {}
    }
    setSaving(false);
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!senior) return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>Senior not found.</Text>
      <TouchableOpacity onPress={() => router.back()}><Text style={styles.backLink}>Go Back</Text></TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Text style={styles.backBtnText}>← Back</Text></TouchableOpacity>
      <Text style={styles.title}>{senior.full_name}</Text>
      <Text style={styles.regId}>{senior.registration_id}</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: senior.status === 'Active' ? '#D1FAE5' : '#FEF3C7' }]}>
          <Text style={[styles.statusText, { color: senior.status === 'Active' ? '#065F46' : '#92400E' }]}>{senior.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
        <Text style={styles.label}>Place of Birth</Text>
        <TextInput style={styles.input} value={placeOfBirth} onChangeText={setPlaceOfBirth} />
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Birthdate</Text>
            <TextInput style={styles.input} value={birthdate} onChangeText={setBirthdate} placeholder="YYYY-MM-DD" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Sex</Text>
            <View style={styles.sexRow}>
              {([['M', 'Male'], ['F', 'Female']] as const).map(([val, lbl]) => (
                <TouchableOpacity key={val} style={[styles.sexBtn, sex === val && styles.sexBtnActive]} onPress={() => setSex(val)}>
                  <Text style={[styles.sexBtnText, sex === val && styles.sexBtnTextActive]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        <Picker label="Civil Status" value={civilStatus} options={CIVIL_STATUS} onSelect={setCivilStatus} />
        <Picker label="Religion" value={religion} options={['Roman Catholic', 'Muslim', 'Iglesia ni Cristo', 'Born Again', 'Seventh-day Adventist', 'Other']} onSelect={setReligion} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Details</Text>
        <Text style={styles.label}>Contact Number</Text>
        <TextInput style={styles.input} value={contact} onChangeText={(v) => { const d = v.replace(/\D/g, ''); if (d === '' || d === '0' || d.startsWith('09')) setContact(d.slice(0, 11)); }} placeholder="09171234567" keyboardType="phone-pad" />
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <Text style={styles.label}>Full Address</Text>
        <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress} multiline numberOfLines={3} />
        <Text style={styles.infoRow}><Text style={styles.infoLabel}>Barangay: </Text>{senior.barangay}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Government IDs</Text>
        <Text style={styles.label}>PhilHealth No.</Text>
        <TextInput style={styles.input} value={philhealth} onChangeText={setPhilhealth} />
        <Text style={styles.label}>SSS No.</Text>
        <TextInput style={styles.input} value={sss} onChangeText={setSss} />
        <Text style={styles.label}>GSIS No.</Text>
        <TextInput style={styles.input} value={gsis} onChangeText={setGsis} />
        <Text style={styles.label}>TIN</Text>
        <TextInput style={styles.input} value={tin} onChangeText={setTin} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Classification & Income</Text>
        <Picker label="Classification" value={classification} options={CLASSIFICATIONS} onSelect={setClassification} />
        <Text style={styles.label}>Monthly Income</Text>
        <TextInput style={styles.input} value={monthlyIncome} onChangeText={setMonthlyIncome} keyboardType="numeric" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Education & Employment</Text>
        <Picker label="Highest Education" value={education} options={EDUCATION} onSelect={setEducation} />
        <Picker label="Employment Status" value={employment} options={EMPLOYMENT} onSelect={setEmployment} />
        <Text style={styles.label}>Occupation</Text>
        <TextInput style={styles.input} value={occupation} onChangeText={setOccupation} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health</Text>
        <Picker label="Blood Type" value={bloodType} options={BLOOD_TYPES} onSelect={setBloodType} />
        <TouchableOpacity style={styles.checkRow} onPress={() => setIsBedridden(!isBedridden)}>
          <View style={[styles.checkbox, isBedridden && styles.checkboxActive]}>
            {isBedridden && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>Bedridden / Confined to bed</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        <Text style={styles.label}>Contact Name</Text>
        <TextInput style={styles.input} value={emergencyName} onChangeText={setEmergencyName} />
        <Text style={styles.label}>Contact Number</Text>
        <TextInput style={styles.input} value={emergencyNumber} onChangeText={(v) => { const d = v.replace(/\D/g, ''); if (d === '' || d === '0' || d.startsWith('09')) setEmergencyNumber(d.slice(0, 11)); }} keyboardType="phone-pad" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Info</Text>
        <Text style={styles.infoRow}><Text style={styles.infoLabel}>Registration ID: </Text>{senior.registration_id}</Text>
        <Text style={styles.infoRow}><Text style={styles.infoLabel}>Age: </Text>{senior.age}</Text>
        <Text style={styles.infoRow}><Text style={styles.infoLabel}>Status: </Text>{senior.status}</Text>
      </View>

      <TouchableOpacity 
        style={styles.endorseBtn} 
        onPress={() => router.push({ pathname: '/(tabs)/endorsements', params: { seniorId: id, seniorName: fullName } })}
      >
        <Text style={styles.endorseBtnText}>Endorse Senior Citizen</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
      </TouchableOpacity>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 32 },
  backBtn: { marginBottom: 16 },
  backBtnText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  regId: { fontSize: 13, color: COLORS.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },
  statusRow: { flexDirection: 'row', marginTop: 12, marginBottom: 20 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  section: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.outline },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.outline },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  sexRow: { flexDirection: 'row', gap: 8 },
  sexBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.outline, backgroundColor: COLORS.background, alignItems: 'center' },
  sexBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  sexBtnText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  sexBtnTextActive: { color: COLORS.primary, fontWeight: '600' },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.outline, marginTop: 8 },
  pickerText: { fontSize: 15, color: COLORS.text },
  placeholder: { color: COLORS.textSecondary },
  pickerArrow: { fontSize: 10, color: COLORS.textSecondary },
  pickerOptions: { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.outline, marginTop: 4, overflow: 'hidden', marginBottom: 8 },
  pickerOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.outline },
  pickerOptionActive: { backgroundColor: COLORS.primaryLight },
  pickerOptionText: { fontSize: 14, color: COLORS.text },
  pickerOptionTextActive: { color: COLORS.primary, fontWeight: '600' },
  infoRow: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  infoLabel: { fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  errorText: { fontSize: 16, color: COLORS.tertiary, marginBottom: 16 },
  backLink: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.outline, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  checkLabel: { fontSize: 15, color: COLORS.text, flex: 1 },
  endorseBtn: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  endorseBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
});
