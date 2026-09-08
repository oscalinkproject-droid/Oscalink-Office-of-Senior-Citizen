import { z } from 'zod';
import { COTABATO_BARANGAYS, SENIOR_STATUSES, PENSIONER_TYPES } from './constants';

export const phMobileRegex = /^09\d{9}$/;

export const statusSchema = z.enum(SENIOR_STATUSES);

export const pensionerTypeSchema = z.enum(PENSIONER_TYPES).nullable().optional();

export const barangaySchema = z.string().refine(
  (val) => (COTABATO_BARANGAYS as readonly string[]).includes(val),
  { message: `Barangay must be one of the 37 official Cotabato City barangays` }
);

const VALID_SEXES = ['Male', 'Female'] as const;

export const sexSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return undefined;
    const s = String(val).trim();
    if (s === 'M') return 'Male';
    if (s === 'F') return 'Female';
    const match = VALID_SEXES.find(v => v.toLowerCase() === s.toLowerCase());
    return match ?? s;
  },
  z.enum(VALID_SEXES).optional().nullable()
);

const VALID_CIVIL_STATUSES = ['Single', 'Married', 'Separated', 'Divorced', 'Widowed'] as const;

export const civilStatusSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return undefined;
    const s = String(val).trim();
    const match = VALID_CIVIL_STATUSES.find(v => v.toLowerCase() === s.toLowerCase());
    return match ?? s;
  },
  z.enum(VALID_CIVIL_STATUSES).optional().nullable()
);

const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] as const;

export const bloodTypeSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return undefined;
    const s = String(val).trim();
    const match = VALID_BLOOD_TYPES.find(v => v.toLowerCase() === s.toLowerCase());
    return match ?? s;
  },
  z.enum(VALID_BLOOD_TYPES).optional().nullable()
);

export const classificationSchema = z.enum(['Pensioner', 'Indigent', 'Supported', 'Private']);

export const contactNumberSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return undefined;
    return String(val).trim();
  },
  z.string().trim()
    .regex(phMobileRegex, 'Contact number must be an 11-digit Philippine mobile number starting with 09 (e.g. 09123456789)')
    .optional().nullable()
);

export const cloudinaryUrlSchema = z.string().trim()
  .url('Must be a valid URL')
  .refine(
    (url) => url.includes('cloudinary.com') || url.startsWith('http'),
    { message: 'Document URL must be a valid Cloudinary resource URL' }
  ).optional().nullable();

export const requiredCloudinaryUrlSchema = z.string()
  .url('Must be a valid URL')
  .refine(
    (url) => url.includes('cloudinary.com') || url.startsWith('http'),
    { message: 'Document URL must be a valid Cloudinary resource URL' }
  );

export const ageSchema = z.number()
  .int('Age must be a whole number')
  .min(60, 'Senior must be at least 60 years old');

export const createSeniorSchema = z.object({
  registration_id: z.string().trim().min(1, 'Registration ID is required').max(255),
  full_name: z.string().trim().min(1, 'Full name is required').max(255),
  middle_name: z.string().trim().optional().nullable(),
  suffix: z.string().optional().nullable(),
  age: z.union([z.number().int().min(60), z.null()]).optional(),
  barangay: barangaySchema,
  status: z.string().default('Active'),
  contact_number: contactNumberSchema,
  address: z.string().trim().optional().nullable(),
  birthdate: z.string().optional().nullable(),
  emergency_contact_name: z.string().min(2, 'Emergency contact name is required').optional().nullable(),
  emergency_contact_number: z.string().regex(phMobileRegex, 'Emergency contact number must be an 11-digit Philippine mobile number starting with 09').optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  address_unit: z.string().optional().nullable(),
  address_building: z.string().optional().nullable(),
  address_lot_block: z.string().optional().nullable(),
  address_street: z.string().optional().nullable(),
  purok: z.string().trim().optional().nullable(),
  address_subdivision: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_province: z.string().optional().nullable(),
  address_region: z.string().optional().nullable(),
  philhealth_no: z.string().optional().nullable(),
  sss_no: z.string().optional().nullable(),
  gsis_no: z.string().optional().nullable(),
  pvao_no: z.string().optional().nullable(),
  tin: z.string().optional().nullable(),
  sex: sexSchema,
  civil_status: civilStatusSchema,
  blood_type: bloodTypeSchema,
  religion: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  employment_status: z.string().optional().nullable(),
  classification: classificationSchema.optional().nullable(),
  profile_photo_url: cloudinaryUrlSchema,
  birth_certificate_url: cloudinaryUrlSchema,
  voter_id_url: cloudinaryUrlSchema,
  digital_signature_url: cloudinaryUrlSchema,
  thumbmark_url: cloudinaryUrlSchema,
  is_bedridden: z.boolean().default(false),
  is_pensioner: z.boolean().default(false),
  pensioner_type: pensionerTypeSchema,
  is_voter: z.boolean().default(false),
  place_of_birth: z.string().trim().optional().nullable(),
});

export type CreateSeniorInput = z.infer<typeof createSeniorSchema>;

export const updateSeniorSchema = z.object({
  barangay: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    barangaySchema.optional()
  ),
  contact_number: contactNumberSchema,
  sex: sexSchema,
  civil_status: civilStatusSchema,
  blood_type: bloodTypeSchema,
  purok: z.string().trim().optional().nullable(),
  is_pensioner: z.boolean().optional(),
  pensioner_type: pensionerTypeSchema,
  status: statusSchema.optional(),
  decision_reason: z.string().optional().nullable(),
  decision_note: z.string().optional().nullable(),
  inactive_reason: z.string().optional().nullable(),
}).passthrough();
