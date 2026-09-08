export const COTABATO_BARANGAYS = [
  'Bagua I', 'Bagua II', 'Bagua III', 'Mother Bagua',
  'Kalanganan I', 'Kalanganan II', 'Mother Kalanganan',
  'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Poblacion V', 
  'Poblacion VI', 'Poblacion VII', 'Poblacion VIII', 'Poblacion IX', 'Mother Poblacion',
  'Rosary Heights I', 'Rosary Heights II', 'Rosary Heights III', 'Rosary Heights IV', 
  'Rosary Heights V', 'Rosary Heights VI', 'Rosary Heights VII', 'Rosary Heights VIII', 
  'Rosary Heights IX', 'Rosary Heights X', 'Rosary Heights XI', 'Rosary Heights XII', 
  'Rosary Heights XIII', 'Mother Rosary Heights',
  'Tamontaka I', 'Tamontaka II', 'Tamontaka III', 'Tamontaka IV', 'Tamontaka V', 'Mother Tamontaka'
] as const;

export type Barangay = typeof COTABATO_BARANGAYS[number];

export const SENIOR_STATUSES = [
  'Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor', 'FOR_HEAD_APPROVAL',
  'APPROVED', 'REJECTED', 'Active', 'Inactive', 'Deceased', 'Transferred',
  'Disqualified', 'Cancelled', 'Disapproved', 'Archived',
] as const;
export type SeniorStatus = typeof SENIOR_STATUSES[number];

export const PENSIONER_TYPES = ['subsidized', 'government', 'private'] as const;
export type PensionerType = typeof PENSIONER_TYPES[number];

export const PENSIONER_TYPE_LABELS: Record<PensionerType, string> = {
  subsidized: 'Subsidized Pensioner',
  government: 'Government Pensioner',
  private: 'Private Pensioner',
};

export const DISQUALIFICATION_REASONS = [
  'Duplicate entry',
  'Non-resident of the municipality',
  'Falsified or missing requirements',
  'Below minimum age',
  'Deceased',
  'Other',
] as const;

export const CLASSIFICATIONS = ['Pensioner', 'Indigent', 'Supported', 'Private'] as const;
export type Classification = typeof CLASSIFICATIONS[number];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] as const;

export const EDUCATION_LEVELS = [
  'No Formal Education',
  'Elementary Undergraduate',
  'Elementary Graduate',
  'High School Undergraduate',
  'High School Graduate',
  'College Undergraduate',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctoral Degree',
  'Vocational/Technical'
] as const;

export const EMPLOYMENT_STATUSES = [
  'Employed',
  'Self-Employed',
  'Unemployed',
  'Retired',
  'Pensioner',
  'Volunteer'
] as const;

export const USER_ROLES = ['super_admin', 'osca_head', 'osca_staff', 'barangay_president', 'barangay_official', 'senior_citizen'] as const;
export type UserRole = typeof USER_ROLES[number];

export const NEWS_CATEGORIES = ['News', 'Activity', 'Announcement', 'Alert'] as const;

export const DOWNLOAD_CATEGORIES = ['PMRF', 'Forms', 'Guidelines', 'Reports', 'Other'] as const;

export const FAMILY_RELATIONSHIPS = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandchild',
  'In-law',
  'Niece/Nephew',
  'Cousin',
  'Guardian',
  'Other'
] as const;

export const SUFFIX_OPTIONS = ['Jr.', 'Sr.', 'I', 'II', 'III', 'IV', 'V', 'VI'] as const;

export const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'] as const;

// Official purok ranges per barangay in Cotabato City.
// Source: Local barangay resolutions. Each purok follows sequential numbering.
export const BARANGAY_PUROK_RANGES: Record<string, number> = {
  // Bagua District
  'Mother Bagua': 7,
  'Bagua I': 7,
  'Bagua II': 7,
  'Bagua III': 7,
  // Kalanganan District
  'Mother Kalanganan': 8,
  'Kalanganan I': 8,
  'Kalanganan II': 8,
  // Poblacion District
  'Mother Poblacion': 6,
  'Poblacion I': 4,
  'Poblacion II': 4,
  'Poblacion III': 4,
  'Poblacion IV': 4,
  'Poblacion V': 4,
  'Poblacion VI': 4,
  'Poblacion VII': 4,
  'Poblacion VIII': 4,
  'Poblacion IX': 4,
  // Rosary Heights District
  'Mother Rosary Heights': 9,
  'Rosary Heights I': 12,
  'Rosary Heights II': 12,
  'Rosary Heights III': 12,
  'Rosary Heights IV': 12,
  'Rosary Heights V': 12,
  'Rosary Heights VI': 12,
  'Rosary Heights VII': 8,
  'Rosary Heights VIII': 8,
  'Rosary Heights IX': 12,
  'Rosary Heights X': 12,
  'Rosary Heights XI': 12,
  'Rosary Heights XII': 12,
  'Rosary Heights XIII': 12,
  // Tamontaka District
  'Mother Tamontaka': 7,
  'Tamontaka I': 7,
  'Tamontaka II': 7,
  'Tamontaka III': 7,
  'Tamontaka IV': 7,
  'Tamontaka V': 7,
};

export function getPurokOptions(barangay: string): string[] {
  const max = BARANGAY_PUROK_RANGES[barangay];
  if (!max) return [];
  return Array.from({ length: max }, (_, i) => `Purok ${i + 1}`);
}
