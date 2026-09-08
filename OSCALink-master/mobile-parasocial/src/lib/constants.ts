export const COTABATO_BARANGAYS = [
  'Bagua I', 'Bagua II', 'Bagua III', 'Mother Bagua',
  'Kalanganan I', 'Kalanganan II', 'Mother Kalanganan',
  'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Poblacion V',
  'Poblacion VI', 'Poblacion VII', 'Poblacion VIII', 'Poblacion IX', 'Mother Poblacion',
  'Rosary Heights I', 'Rosary Heights II', 'Rosary Heights III', 'Rosary Heights IV',
  'Rosary Heights V', 'Rosary Heights VI', 'Rosary Heights VII', 'Rosary Heights VIII',
  'Rosary Heights IX', 'Rosary Heights X', 'Rosary Heights XI', 'Rosary Heights XII',
  'Rosary Heights XIII', 'Mother Rosary Heights',
  'Tamontaka I', 'Tamontaka II', 'Tamontaka III', 'Tamontaka IV', 'Tamontaka V', 'Mother Tamontaka',
] as const;

export const ENDORSEMENT_TYPES = [
  'Pension Application',
  'New Registration',
  'ID Issuance',
  'Assistance Request',
  'Bedridden Verification',
  'Other',
] as const;

export const ROLES = {
  mssd_admin: {
    key: 'mssd_admin',
    label: 'MSSD Admin',
    level: 'Ministry',
    levelIndex: 0,
    description: 'Ministry of Social Services and Development',
  },
  lgu_admin: {
    key: 'lgu_admin',
    label: 'LGU Admin',
    level: 'City/Municipal',
    levelIndex: 1,
    description: 'Local Government Unit',
  },
  blgu_official: {
    key: 'blgu_official',
    label: 'BLGU Official',
    level: 'Barangay',
    levelIndex: 2,
    description: 'Barangay Local Government Unit',
  },
  official: {
    key: 'official',
    label: 'BLGU Official',
    level: 'Barangay',
    levelIndex: 2,
    description: 'Barangay Local Government Unit',
  },
  para_social_worker: {
    key: 'para_social_worker',
    label: 'Para-Social Worker',
    level: 'Field',
    levelIndex: 3,
    description: 'Community-based social service worker',
  },
} as const;

export const ROLE_LEVELS = [
  { key: 'mssd', label: 'MSSD', icon: '🏛️', color: '#1E40AF' },
  { key: 'lgu', label: 'LGU', icon: '🏢', color: '#7C3AED' },
  { key: 'blgu', label: 'BLGU', icon: '🏘️', color: '#006837' },
  { key: 'psw', label: 'PSW', icon: '👤', color: '#D97706' },
] as const;

export const ALLOWED_MOBILE_ROLES = ['para_social_worker', 'blgu_official', 'official'] as const;

export const PARTNERSHIP_STEPS = [
  {
    level: 'MSSD',
    title: 'Funding & Oversight',
    description: 'Ministry provides funding and program guidelines',
  },
  {
    level: 'LGU',
    title: 'Administrative Partnership',
    description: 'LGU coordinates resources and assigns workers',
  },
  {
    level: 'BLGU',
    title: 'Ground-Level Execution',
    description: 'Barangay executes programs at the community level',
  },
  {
    level: 'PSW',
    title: 'Direct Community Contact',
    description: 'Data gathering, registration, and program awareness',
  },
] as const;

export const SENIOR_STATUS_FLOW = [
  { status: 'Pending Barangay', level: 'BLGU', description: 'Awaiting barangay verification' },
  { status: 'Pending LGU', level: 'LGU', description: 'Under LGU review' },
  { status: 'Pending MSSD', level: 'MSSD', description: 'Under ministry review' },
  { status: 'Active', level: 'Completed', description: 'Fully verified and active' },
] as const;

export const COLORS = {
  primary: '#006837',
  primaryLight: '#E8F5E9',
  secondary: '#FDB913',
  tertiary: '#CE1126',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  outline: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  lgu: '#7C3AED',
  mssd: '#1E40AF',
  blgu: '#006837',
} as const;
