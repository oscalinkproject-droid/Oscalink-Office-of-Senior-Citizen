# Database Schema

## Tables

### `seniors` (PhilHealth & Legal Compliance)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `registration_id` | TEXT | Unique registration number |
| `full_name` | TEXT | Senior's full name |
| `age` | INTEGER | Age in years |
| `sex` | TEXT | Gender (M/F) |
| `birthdate` | DATE | Date of birth |
| `place_of_birth` | TEXT | Place of birth |
| `civil_status` | TEXT | Single, Married, Widowed, Divorced |
| `contact_number` | TEXT | Mobile/landline number |
| `email` | TEXT | Email address |
| `address` | TEXT | Full address string |
| `barangay` | TEXT | Barangay |
| `status` | TEXT | Active, Pending, Pending Barangay, Pending OSCA, Pending Mayor, Archived, Deceased, Transferred |
| `religion` | TEXT | Religious affiliation |
| `education` | TEXT | Highest educational attainment |
| `employment_status` | TEXT | Employed, Unemployed, Retired |
| `monthly_income` | NUMERIC | Monthly income in PHP |
| `income_range` | TEXT | Formatted income range |
| **Address (PhilHealth Breakdown)** | | |
| `address_unit` | TEXT | Unit/Room/Floor |
| `address_building` | TEXT | Building/House No. |
| `address_lot_block` | TEXT | Lot/Block No. |
| `address_street` | TEXT | Street name |
| `address_subdivision` | TEXT | Village/Subdivision |
| `address_city` | TEXT | City/Municipality (default Cotabato City) |
| `address_province` | TEXT | Province (default Maguindanao) |
| `address_region` | TEXT | Region (default BARMM) |
| **Identifiers** | | |
| `philhealth_no` | TEXT | PhilHealth PIN |
| `gsis_no` | TEXT | GSIS Number |
| `sss_no` | TEXT | SSS Number |
| `tin` | TEXT | Tax Identification Number |
| **Socio-Economic** | | |
| `classification` | TEXT | Pensioner, Indigent, Supported, Private |
| `blood_type` | TEXT | A+, B+, etc. |
| **Digital Archiving** | | |
| `profile_photo_url` | TEXT | Cloudinary URL for photo |
| `birth_certificate_url` | TEXT | Cloudinary URL for birth certificate |
| `voter_id_url` | TEXT | Cloudinary URL for voter ID |
| `digital_signature_url` | TEXT | Cloudinary URL for digital signature |
| `is_verified` | BOOLEAN | Status of official verification |
| `verified_by` | UUID | Reference to auth.users who verified |
| `verified_at` | TIMESTAMP | When verification occurred |
| `is_bedridden` | BOOLEAN | Bedridden flag |
| `emergency_contact` | TEXT | Emergency contact info (legacy) |
| `is_social_pension_applicant` | BOOLEAN | Social pension applicant flag |
| `last_verified_at` | TIMESTAMP | Last verification date |
| `auth_id` | UUID | Reference to auth.users (resident self-service) |
| **Multi-Stage Approval** | | |
| `osca_approved` | BOOLEAN | OSCA Head approval flag |
| `osca_approved_by` | UUID | Reference to auth.users (OSCA Head) |
| `osca_approved_at` | TIMESTAMP | When OSCA approved |
| `mayor_approved` | BOOLEAN | Mayor approval flag |
| `mayor_approved_by` | UUID | Reference to auth.users (Mayor) |
| `mayor_approved_at` | TIMESTAMP | When Mayor approved |
| `created_at` | TIMESTAMP | Record creation date |
| `updated_at` | TIMESTAMP | Last update date |

### `assistance_requests`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `senior_id` | UUID | Reference to seniors table |
| `registration_id` | TEXT | Reference to seniors.registration_id |
| `full_name` | TEXT | Requester's full name |
| `title` | TEXT | Request title |
| `description` | TEXT | Request details |
| `category` | TEXT | Medical, Financial, Burial, Assistive Devices |
| `priority` | TEXT | URGENT, ROUTINE, VALIDATED, LOGISTICS, COMPLETED |
| `status` | TEXT | Pending, Processing, Approved, Released, Rejected, On Hold |
| `barangay` | TEXT | Barangay of the senior (for RLS filtering) |
| `beneficiary_email` | TEXT | Email for release notifications |
| `pmrf_attachment_url` | TEXT | PhilHealth PMRF attachment |
| `pmrf_uploaded_at` | TIMESTAMP | When PMRF was uploaded |
| `created_at` | TIMESTAMP | Creation date |
| `updated_at` | TIMESTAMP | Last update date |

### `complaints` (RA 9257 / MC 2005-63)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `senior_id` | UUID | Reference to senior (nullable) |
| `complainant_name` | TEXT | Name of complainant |
| `complainant_contact` | TEXT | Contact number |
| `respondent_name` | TEXT | Name of respondent |
| `respondent_address` | TEXT | Address of respondent |
| `violation_type` | TEXT | Refusal of Discount, Refusal of Privilege, Discrimination, Unfair Practice, Other |
| `incident_date` | DATE | Date of occurrence |
| `incident_location` | TEXT | Location of incident |
| `description` | TEXT | Detailed narrative |
| `status` | TEXT | Pending, Investigating, Resolved, Escalated, Closed |
| `priority` | TEXT | Urgent, Routine |
| `assigned_to` | UUID | Reference to auth.users |
| `resolution_notes` | TEXT | Resolution details |
| `created_at` | TIMESTAMP | Creation date |
| `updated_at` | TIMESTAMP | Last update date |

### `id_inventory` (ID Tracking)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `senior_id` | UUID | Reference to senior |
| `id_card_serial` | TEXT | Physical ID Card number |
| `id_issued_date` | DATE | When ID was issued |
| `id_expiry_date` | DATE | ID expiration date |
| `id_status` | TEXT | Pending, Issued, Lost, Expired, Returned |
| `booklet_serial` | TEXT | Medicine/Grocery booklet number |
| `booklet_issued_date` | DATE | When booklet was issued |
| `booklet_status` | TEXT | Pending, Issued, Lost, Returned |
| `issued_by` | UUID | Reference to auth.users who issued |
| `received_by` | TEXT | Name of recipient |
| `created_at` | TIMESTAMP | Creation date |
| `updated_at` | TIMESTAMP | Last update date |

### `profiles` (User RBAC)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (matches auth.users) |
| `email` | TEXT | User's email |
| `full_name` | TEXT | User's full name |
| `role` | TEXT | osca_head, admin, mswd_officer, mayor, official, para_social_worker, resident |
| `barangay` | TEXT | Assigned barangay (for officials) |
| `is_active` | BOOLEAN | Active status flag |
| `created_at` | TIMESTAMP | Creation date |
| `updated_at` | TIMESTAMP | Last update date |

### `appointments`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `senior_id` | UUID | Reference to senior |
| `senior_name` | TEXT | Senior display name (denormalized) |
| `service_type` | TEXT | Type of service |
| `appointment_date` | TIMESTAMP | Scheduled date/time |
| `status` | TEXT | Scheduled, Completed, Cancelled, No-show |
| `notes` | TEXT | Additional notes |
| `created_at` | TIMESTAMP | Creation date |

### `bedridden_verifications`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `senior_id` | UUID | Reference to senior |
| `official_id` | UUID | Reference to verifying official |
| `status` | TEXT | Pending, Uploaded, Validated, Rejected, Expired |
| `verified_at` | TIMESTAMP | When verified |
| `validated_by` | UUID | Reference to auth.users who validated |
| `validated_at` | TIMESTAMP | When validated |
| `photo_url` | TEXT | Proof of life photo URL |
| `notes` | TEXT | Verification notes |
| `rejection_reason` | TEXT | Reason for rejection |
| `created_at` | TIMESTAMP | Creation date |

### `family_composition`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `senior_id` | UUID | Reference to senior (FK CASCADE) |
| `member_name` | TEXT | Family member name |
| `relationship` | TEXT | Relationship to senior |
| `birthdate` | DATE | Member's birthdate |
| `occupation` | TEXT | Member's occupation |
| `monthly_income` | NUMERIC | Member's monthly income |
| `is_dependent` | BOOLEAN | Whether member is a dependent |
| `created_at` | TIMESTAMP | Creation date |

### `quarterly_updates`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `quarter` | TEXT | Quarter (Q1, Q2, Q3, Q4) |
| `year` | INTEGER | Report year |
| `generated_at` | TIMESTAMP | When generated |
| `verified_at` | TIMESTAMP | When verified |

### `news` (Announcements)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | News title |
| `content` | TEXT | News content |
| `category` | TEXT | News, Activity, Announcement, Alert |
| `created_at` | TIMESTAMP | Creation date |

### `downloads`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Download title |
| `file_url` | TEXT | File URL |
| `category` | TEXT | PMRF, Forms, Guidelines, Reports, Other |
| `created_at` | TIMESTAMP | Creation date |

### `batch_endorsements`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `batch_number` | TEXT | Batch identifier |
| `barangay` | TEXT | Source barangay |
| `status` | TEXT | Draft, Submitted, Approved, Rejected |
| `created_at` | TIMESTAMP | Creation date |

### `batch_endorsement_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `batch_id` | UUID | Reference to batch_endorsements |
| `senior_id` | UUID | Reference to senior |

### `municipal_config`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `mayor_name` | TEXT | Name of the Mayor |
| `mayor_signature_url` | TEXT | Mayor's digital signature Cloudinary URL |
| `osca_head_name` | TEXT | Name of the OSCA Head |
| `osca_head_signature_url` | TEXT | OSCA Head's digital signature Cloudinary URL |
| `municipality_name` | TEXT | Municipality name |
| `updated_at` | TIMESTAMP | Last update date |

## Row-Level Security (RLS)

The system enforces data privacy using PostgreSQL RLS:
- **Barangay Officials** and **Para-Social Workers** are restricted to records where `barangay` matches their profile `barangay` (sectorLocked).
- **OSCA Head**, **Admin**, and **MSWD Officers** have city-wide access for processing and reporting.
- **Residents** are self-locked to their own `senior_id`.
- **Verification Logic**: Only authorized roles can set `is_verified` to true.
- Anonymous users can read seniors (for resident self-service) but cannot modify.

## Multi-Stage Approval Pipeline

Senior registrations flow through a 4-stage pipeline:

```
Pending → Pending Barangay → Pending OSCA → Pending Mayor → Active
```

| Stage | Action | Role(s) |
|-------|--------|---------|
| Pending | Initial registration | All roles with `canVerifySeniors` |
| Pending Barangay | Barangay-level verification | Official, Para-Social Worker |
| Pending OSCA | City-level review | Official, Para-Social Worker |
| Pending Mayor | OSCA Head/Admin review | OSCA Head, Admin |
| Active | Mayor's final approval | Mayor |
