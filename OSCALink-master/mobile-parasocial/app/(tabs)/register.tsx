import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';

const CIVIL_STATUS = ['Single', 'Married', 'Widowed', 'Separated', 'Others'] as const;
const CLASSIFICATIONS = ['Indigent', 'Non-Indigent', 'Solo Parent', 'PWD', 'Lives Alone'] as const;
const EDUCATION = ['None', 'Elementary', 'High School', 'Vocational', 'College', 'Post Graduate'] as const;
const EMPLOYMENT = ['Employed', 'Self-Employed', 'Unemployed', 'Retired', 'OFW', 'Housewife'] as const;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function Picker({ label, value, options, onSelect, error }: {
  label: string; value: string; options: readonly string[];
  onSelect: (v: string) => void; error?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.picker, error && styles.inputError]} onPress={() => setOpen(!open)}>
        <Text style={[styles.pickerText, !value && styles.placeholder]}>{value || `Select ${label.toLowerCase()}...`}</Text>
        <Text style={styles.pickerArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {error && <Text style={styles.fieldError}>{error}</Text>}
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

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | ''>('');
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  function generateRegId() {
    const now = new Date();
    return `OSC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Full name is required';
    if (!birthdate.trim()) errors.birthdate = 'Birthdate is required';
    else if (isNaN(new Date(birthdate).getTime())) errors.birthdate = 'Invalid date format (use YYYY-MM-DD)';
    else if (Math.floor((Date.now() - new Date(birthdate).getTime()) / 31557600000) < 60) errors.birthdate = 'Must be at least 60 years old';
    if (!sex) errors.sex = 'Select a sex';
    if (!address.trim()) errors.address = 'Address is required';
    const cDigits = contact.replace(/\D/g, '');
    if (cDigits && !/^09\d{9}$/.test(cDigits)) errors.contact = 'Must be 11 digits starting with 09';
    const eDigits = emergencyNumber.replace(/\D/g, '');
    if (eDigits && !/^09\d{9}$/.test(eDigits)) errors.emergencyNumber = 'Must be 11 digits starting with 09';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function clearFieldError(field: string) {
    setFieldErrors(p => { const c = { ...p }; delete c[field]; return c; });
  }

  async function handleSubmit() {
    if (!validate()) return;
    const age = Math.floor((Date.now() - new Date(birthdate + 'T00:00:00').getTime()) / 31557600000);
    setLoading(true); setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const barangay = session?.user?.user_metadata?.barangay as string;
    if (!barangay) { setError('No barangay assigned to your account'); setLoading(false); return; }

    const cleanBirthdate = birthdate.trim();

    const { error: insertError } = await supabase.from('seniors').insert({
      registration_id: generateRegId(),
      full_name: fullName.trim(),
      birthdate: cleanBirthdate, age, sex, barangay,
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
      is_bedridden: isBedridden || false,
      is_social_pension_applicant: false,
      has_other_pension: false,
      status: 'Pending Barangay',
    });

    if (insertError) { setError(insertError.message); setLoading(false); return; }
    setSuccess(true); setLoading(false);
  }

  if (success) {
    return (
      <View style={styles.centered}>
        <View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View>
        <Text style={styles.successTitle}>Registration Submitted!</Text>
        <Text style={styles.successSub}>The senior has been registered with Pending Barangay status.</Text>
        <TouchableOpacity style={styles.button} onPress={() => {
          setSuccess(false); setFullName(''); setBirthdate(''); setSex(''); setCivilStatus('');
          setContact(''); setEmail(''); setAddress(''); setPlaceOfBirth('');
          setPhilhealth(''); setSss(''); setGsis(''); setTin('');
          setClassification(''); setMonthlyIncome(''); setEducation(''); setEmployment('');
          setOccupation(''); setBloodType(''); setReligion('');
          setEmergencyName(''); setEmergencyNumber(''); setIsBedridden(false);
        }}><Text style={styles.buttonText}>Register Another</Text></TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/dashboard')}><Text style={styles.linkText}>Back to Dashboard</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Register Senior</Text>
          <Text style={styles.subtitle}>Complete senior registration form</Text>
        </View>

        {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput style={[styles.input, fieldErrors.fullName && styles.inputError]} value={fullName} onChangeText={(v) => { setFullName(v); clearFieldError('fullName'); }} placeholder="Full name" placeholderTextColor={COLORS.textSecondary} />
          {fieldErrors.fullName && <Text style={styles.fieldError}>{fieldErrors.fullName}</Text>}

          <Text style={styles.label}>Place of Birth</Text>
          <TextInput style={styles.input} value={placeOfBirth} onChangeText={setPlaceOfBirth} placeholder="City, Province" placeholderTextColor={COLORS.textSecondary} />

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Birthdate *</Text>
              <TextInput style={[styles.input, fieldErrors.birthdate && styles.inputError]} value={birthdate} onChangeText={(v) => { setBirthdate(v); clearFieldError('birthdate'); }} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textSecondary} keyboardType="numbers-and-punctuation" />
              {fieldErrors.birthdate && <Text style={styles.fieldError}>{fieldErrors.birthdate}</Text>}
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Sex *</Text>
              <View style={styles.sexRow}>
                {([['M', 'Male'], ['F', 'Female']] as const).map(([val, lbl]) => (
                  <TouchableOpacity key={val} style={[styles.sexBtn, sex === val && styles.sexBtnActive]} onPress={() => { setSex(val); clearFieldError('sex'); }}>
                    <Text style={[styles.sexBtnText, sex === val && styles.sexBtnTextActive]}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {fieldErrors.sex && <Text style={styles.fieldError}>{fieldErrors.sex}</Text>}
            </View>
          </View>

          <Picker label="Civil Status" value={civilStatus} options={CIVIL_STATUS} onSelect={setCivilStatus} />
          <Picker label="Religion" value={religion} options={['Roman Catholic', 'Muslim', 'Iglesia ni Cristo', 'Born Again', 'Seventh-day Adventist', 'Other']} onSelect={setReligion} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput style={[styles.input, fieldErrors.contact && styles.inputError]} value={contact} onChangeText={(v) => { const d = v.replace(/\D/g, ''); if (d === '' || d === '0' || d.startsWith('09')) setContact(d.slice(0, 11)); clearFieldError('contact'); }} placeholder="09171234567" placeholderTextColor={COLORS.textSecondary} keyboardType="phone-pad" />
          {fieldErrors.contact && <Text style={styles.fieldError}>{fieldErrors.contact}</Text>}
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor={COLORS.textSecondary} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.label}>Full Address *</Text>
          <TextInput style={[styles.input, styles.textArea, fieldErrors.address && styles.inputError]} value={address} onChangeText={(v) => { setAddress(v); clearFieldError('address'); }} placeholder="House no., Street, Barangay, City" placeholderTextColor={COLORS.textSecondary} multiline numberOfLines={3} />
          {fieldErrors.address && <Text style={styles.fieldError}>{fieldErrors.address}</Text>}
          <Text style={styles.hint}>Barangay will be set to your assigned barangay</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Government IDs</Text>
          <Text style={styles.label}>PhilHealth No.</Text>
          <TextInput style={styles.input} value={philhealth} onChangeText={setPhilhealth} placeholder="12-123456789-0" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" />
          <Text style={styles.label}>SSS No.</Text>
          <TextInput style={styles.input} value={sss} onChangeText={setSss} placeholder="XX-XXXXXXX-X" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" />
          <Text style={styles.label}>GSIS No.</Text>
          <TextInput style={styles.input} value={gsis} onChangeText={setGsis} placeholder="XXXXXXXXX" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" />
          <Text style={styles.label}>TIN</Text>
          <TextInput style={styles.input} value={tin} onChangeText={setTin} placeholder="XXX-XXX-XXX" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classification & Income</Text>
          <Picker label="Classification" value={classification} options={CLASSIFICATIONS} onSelect={setClassification} />
          <Text style={styles.label}>Monthly Income</Text>
          <TextInput style={styles.input} value={monthlyIncome} onChangeText={setMonthlyIncome} placeholder="e.g. 5000" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education & Employment</Text>
          <Picker label="Highest Education" value={education} options={EDUCATION} onSelect={setEducation} />
          <Picker label="Employment Status" value={employment} options={EMPLOYMENT} onSelect={setEmployment} />
          <Text style={styles.label}>Occupation</Text>
          <TextInput style={styles.input} value={occupation} onChangeText={setOccupation} placeholder="e.g. Farmer, Vendor" placeholderTextColor={COLORS.textSecondary} />
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
          <TextInput style={styles.input} value={emergencyName} onChangeText={setEmergencyName} placeholder="Full name" placeholderTextColor={COLORS.textSecondary} />
          <Text style={styles.label}>Contact Number</Text>
          <TextInput style={[styles.input, fieldErrors.emergencyNumber && styles.inputError]} value={emergencyNumber} onChangeText={(v) => { const d = v.replace(/\D/g, ''); if (d === '' || d === '0' || d.startsWith('09')) setEmergencyNumber(d.slice(0, 11)); clearFieldError('emergencyNumber'); }} placeholder="09171234567" placeholderTextColor={COLORS.textSecondary} keyboardType="phone-pad" />
          {fieldErrors.emergencyNumber && <Text style={styles.fieldError}>{fieldErrors.emergencyNumber}</Text>}
        </View>

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.buttonText}>Register Senior</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 32 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  section: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.outline, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.outline },
  inputError: { borderColor: COLORS.tertiary },
  fieldError: { color: COLORS.tertiary, fontSize: 12, marginTop: 4, marginBottom: -4 },
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
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: COLORS.tertiary, fontSize: 14 },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  linkBtn: { paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  linkText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successIconText: { fontSize: 32, color: COLORS.success, fontWeight: '700' },
  successTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  successSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.outline, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  checkLabel: { fontSize: 15, color: COLORS.text, flex: 1 },
});
