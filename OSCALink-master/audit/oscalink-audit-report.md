# OSCALink System Audit Report
**Date:** June 21, 2026  
**Project:** Cotabato City — Office for Senior Citizen Affairs (OSCA) Digital Information System  
**Framework:** Next.js 16 + Supabase (PostgreSQL) + React Native/Expo (mobile)

---

## 1. System Scope

OSCALink is a digital governance platform for senior citizen registration, ID management, and record keeping. The system serves **exactly 4 user roles** across a web portal and a mobile app.

### What the System IS
- Senior citizen registry and biodata management
- OSCA ID issuance support (manual ID numbering, Green/White color coding)
- Barangay-level master list viewing (per-purok filtering)
- Digital terms acknowledgment as physical signature bypass
- In-app notification system for senior citizens

### What the System IS NOT
- Financial assistance / social pension tracking (removed — handled directly by Barangay→DSWD)
- MSWD/DSWD program management (removed — outside OSCA scope)
- Complaint filing or resolution
- Barangay official / Barangay Captain functions (certificate issuance stays offline)
- Endorsement / batch processing workflows

---

## 2. User Roles (4 roles)

| Role Key | Display Name | Scope | Permissions |
|----------|-------------|-------|------------|
| `osca_head` | OSCA Head | City-wide | Full CRUD on all tables, staff management, senior verification/approval, ID review & signing |
| `osca_staff` | OSCA Staff | City-wide | Full CRUD on all tables, staff management, senior registration, senior verification |
| `barangay_president` | Barangay President | Barangay-locked | READ-ONLY master list of seniors in their barangay, filterable by purok/status/age |
| `senior_citizen` | Senior Citizen | Self-locked | View/edit own record, view own appointments, mobile app access |

**Key Rules:**
- Only OSCA Head/Staff can provision new user accounts (no self-registration)
- Barangay President = elected Senior Citizen Association President per barangay (37 total in Cotabato)
- Federation President (oversees all 37 barangays) is future scope
- Certificate of Residency/Indigency remains offline — issued by Barangay Captain

---

## 3. Database Schema (9 tables)

### 3.1 `seniors` — Core senior citizen registry

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK, auto-generated |
| `registration_id` | TEXT | **Manual input** — no auto-generation. OSCA follows legacy numbering sequence |
| `full_name` | TEXT | Required |
| `middle_name` | TEXT | Optional |
| `suffix` | TEXT | Jr., Sr., I-VI |
| `birthdate` | DATE | Age auto-computed |
| `age` | INTEGER | CHECK >= 60 |
| `sex` | TEXT | CHECK IN ('M','F') |
| `civil_status` | TEXT | Single, Married, Widowed, Separated, Divorced |
| `barangay` | TEXT | CHECK constrained to 37 Cotabato City barangays |
| `purok` | TEXT | Zone/subdivision within barangay |
| `contact_number` | TEXT | Philippine mobile 09XXXXXXXXX |
| `address` | TEXT | Street address |
| `place_of_birth` | TEXT | |
| `occupation` | TEXT | Previous/current occupation |
| `classification` | TEXT | Pensioner, Indigent, Supported, Private |
| `is_pensioner` | BOOLEAN | **Green ID** (true) vs **White ID** (false) |
| `is_voter` | BOOLEAN | Registered voter in barangay |
| `is_bedridden` | BOOLEAN | |
| `is_verified` | BOOLEAN | |
| `status` | TEXT | Pending, Active, Deceased, Transferred, Archived |
| `philhealth_no` | TEXT | |
| `sss_no` | TEXT | |
| `gsis_no` | TEXT | |
| `pvao_no` | TEXT | **NEW** — For retired AFP/military personnel |
| `tin` | TEXT | |
| `blood_type` | TEXT | A+/A-/B+/B-/AB+/AB-/O+/O-/Unknown |
| `religion` | TEXT | |
| `education` | TEXT | |
| `employment_status` | TEXT | |
| `profile_photo_url` | TEXT | Cloudinary URL |
| `birth_certificate_url` | TEXT | Cloudinary URL |
| `voter_id_url` | TEXT | Cloudinary URL |
| `digital_signature_url` | TEXT | Cloudinary URL (optional) |
| `thumbmark_url` | TEXT | **NEW** — Cloudinary URL (optional, alternative to signature) |
| `emergency_contact_name` | TEXT | |
| `emergency_contact_number` | TEXT | Philippine mobile 09XXXXXXXXX |
| `emergency_contact_relationship` | TEXT | |
| `verified_by` | UUID | FK → profiles.id |
| `verified_at` | TIMESTAMPTZ | |
| `osca_approved` | BOOLEAN | |
| `osca_approved_by` | UUID | FK → auth.users.id |
| `osca_approved_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

### 3.2 `profiles` — User accounts (linked to Supabase Auth)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK = auth.users.id |
| `full_name` | TEXT | |
| `email` | TEXT | |
| `role` | TEXT | CHECK IN ('osca_head','osca_staff','barangay_president','senior_citizen') |
| `barangay` | TEXT | For barangay_president assignment |
| `purok` | TEXT | Optional informational field |
| `contact_number` | TEXT | |

### 3.3 `family_composition` — Kin/dependents tracking

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `senior_id` | UUID | FK → seniors.id |
| `member_name` | TEXT | Kin full name |
| `relationship` | TEXT | Spouse, Child, Parent, Sibling, Grandchild, etc. |
| `birthdate` | DATE | |
| `occupation` | TEXT | |
| `civil_status` | TEXT | |
| `monthly_income` | NUMERIC | |
| `created_at` | TIMESTAMPTZ | |

### 3.4 `appointments` — Senior scheduling

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `senior_id` | UUID | FK → seniors.id |
| `service_type` | TEXT | |
| `appointment_date` | TIMESTAMPTZ | |
| `status` | TEXT | Scheduled, Completed, Missed, Cancelled |
| `notes` | TEXT | |
| `location` | TEXT | |

### 3.5–3.9 — Supporting tables

| Table | Purpose |
|-------|---------|
| `news` | Published announcements (public read) |
| `downloads` | Forms/documents (public read) |
| `government_links` | External agency links (public read) |
| `audit_logs` | OSCA-only audit trail |
| `notifications` | Per-user in-app notifications |

### Dropped Tables
`assistance_requests`, `endorsements`, `batch_endorsements`, `batch_endorsement_items`, `municipal_config`, `id_inventory`, `bedridden_verifications`, `quarterly_updates`, `complaints`

### Dropped Columns (from seniors)
`is_social_pension_applicant`, `has_other_pension`, `pension_source`, `monthly_income`, `emergency_contact`, `mayor_approved`, `mayor_approved_by`, `mayor_approved_at`

---

## 4. Row-Level Security (RLS)

All 9 tables have RLS enabled with **45 policies** across 4 roles.

### Access Matrix

| Table | OSCA Head/Staff | Barangay President | Senior Citizen | Public |
|-------|----------------|-------------------|----------------|--------|
| `seniors` | Full CRUD | SELECT (barangay match) | SELECT/UPDATE (own id) | — |
| `profiles` | Full CRUD | SELECT all, UPDATE own | SELECT all, UPDATE own | — |
| `family_composition` | Full CRUD | SELECT (via senior barangay) | SELECT (own senior_id) | — |
| `appointments` | Full CRUD | SELECT (via senior barangay) | SELECT/INSERT/UPDATE/DELETE (own) | — |
| `news` | Full CRUD | — | — | SELECT published |
| `downloads` | Full CRUD | — | — | SELECT active |
| `government_links` | Full CRUD | — | — | SELECT active |
| `audit_logs` | SELECT | — | — | — |
| `notifications` | INSERT (system) | — | SELECT/UPDATE (own) | — |

### Helper Functions
- `get_user_role()` — returns role from JWT `user_metadata`
- `get_user_barangay()` — returns barangay from JWT `user_metadata`
- `get_user_purok()` — returns purok from JWT `user_metadata`
- `is_osca_role()` — true for osca_head or osca_staff

---

## 5. Web Application (Next.js)

### Route Structure

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Landing page — stats, news, downloads, gov links, hotlines |
| `/login` | Public | Supabase Auth login |
| `/programs` | Public | Programs & events |
| `/dashboard` | OSCA only | Operational overview — stats, demographics, appointments |
| `/directory` | OSCA only | Senior citizen registry with search/filter |
| `/directory/register` | OSCA only | 3-step senior registration form (manual ID input) |
| `/staff` | OSCA only | Staff management — commission Barangay President accounts |
| `/barangay/dashboard` | Barangay President | READ-ONLY Master List with 6 stat cards + filters |

### Barangay Master List Features
- 6 stat cards: Total, Active, Pending, Male, Female, Age 80+
- Filters: Purok dropdown, Status dropdown, Age range (All / 60-79 / 80+)
- Sortable columns: Name, Registration ID, Purok, Age, Status
- Pensioner indicator column (Yes/No)
- Search by name, ID, or purok
- Pagination (20 per page)

### Registration Form (OSCA Staff)
- **Step 1:** Personal Info — Registration ID (manual), Last/First/Middle name, Suffix, Birthdate, Sex, Civil Status, Barangay, Purok, Contact Number, Place of Birth, Address
- **Step 2:** Classification & IDs — Classification, Pensioner Status (Green/White), PhilHealth No., SSS No., GSIS No., PVAO No., TIN, Registered Voter toggle, Blood Type, Religion, Occupation, Education, Employment Status, Bedridden checkbox
- **Step 3:** Emergency Contact — Name, Number, Relationship

---

## 6. Mobile Application (React Native/Expo)

### Screens

| Screen | Status | Notes |
|--------|--------|-------|
| **Auth/Login** | Active | Registration disabled — redirects to OSCA office |
| **Dashboard** | Active | Tabs: Home, Requests, Appointments, Profile, Settings, Reports |
| **MyProfile** | Active | Shows `is_pensioner` (Green/White ID). View/edit personal info |
| **MyAppointments** | Active | Book/view appointments |
| **MyRequests** | Redirect | Shows "Visit OSCA office" message (assistance removed) |
| **MyComplaints** | Redirect | Shows "Visit OSCA office" message (complaints removed) |
| **Reports** | Redirect | Shows "Use web portal" message |
| **Settings** | Active | Notification toggle, account settings |

### New Components
- **TermsAgreementModal** — Digital acknowledgment as physical signature bypass. Scroll-to-accept UX. Persists acceptance in AsyncStorage.
- **InAppNotification** — Notification bell with unread badge + dropdown list. Real-time Supabase subscription. Mark-as-read functionality.

---

## 7. API Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `api/auth/callback` | OAuth | Supabase auth callback |
| `api/push` | Bearer + role check | Push notification delivery via Expo |
| `api/revalidate` | Bearer + role check | ISR cache revalidation |
| `api/upload` | Auth | Cloudinary file uploads |
| `api/download/latest` | Public | Latest download |
| `api/mobile/login` | Public | Mobile auth endpoint |

---

## 8. ID System Specifics

- **ID Number:** Manual string input — no auto-generation or shuffling
- **Color Coding:** `is_pensioner` boolean drives Green (pensioner) vs White (non-pensioner) ID display
- **Thumbmark:** Optional — stored as Cloudinary URL in `thumbmark_url`
- **Digital Signature:** Optional — stored as Cloudinary URL in `digital_signature_url`
- **OSCA Head Review:** OSCA Head reviews and signs IDs via `osca_approved` fields

---

## 9. Removed Features (with rationale)

| Feature | Reason |
|---------|--------|
| MSWD Officer role | Outside OSCA scope |
| Mayor role | Outside OSCA scope |
| Para-Social Worker role | Outside OSCA scope |
| DSWD references / links | Outside OSCA scope |
| Social pension tracking | Handled directly by Barangay→DSWD, bypasses OSCA |
| Financial assistance modules | No money/assistance in OSCA scope — ID only |
| Assistance requests board | Dropped `assistance_requests` table |
| Complaints management | Dropped `complaints` table |
| Batch endorsements | Dropped `batch_endorsements` tables |
| ID inventory / booklet tracking | Dropped `id_inventory` table |
| Bedridden verification workflow | Dropped `bedridden_verifications` table |
| Quarterly reporting | Dropped `quarterly_updates` table |
| Municipal config / Mayor settings | Dropped `municipal_config` table |
| Medicine/RH6 modules | Outside scope |
| Senior self-registration | Registration restricted to OSCA staff only |

---

## 10. Future Scope (not implemented)

- Federation President dashboard (oversees all 37 barangays)
- PDF ID card generation with QR code
- Integration with national senior citizen database (NCC)
- Certificate of Residency/Indigency digital issuance (requires Barangay Captain role)

---

## 11. Verification Status

| Check | Result |
|-------|--------|
| TypeScript compilation (web) | Zero errors |
| Database tables | 9 tables, all correct |
| RLS policies | 45 policies, all 4 roles covered |
| Column additions (pvao_no, is_voter, thumbmark_url, is_pensioner) | All present |
| Dropped tables/columns | Confirmed gone, no FK violations |
| Profile role migration | 24 profiles migrated to new role keys |
| Security advisors | No critical issues (only search_path warnings) |
| MSWD/DSWD/pension code references (web) | Zero found |
| MSWD/DSWD/pension code references (mobile) | Zero found (dead code removed) |
| Landing page | Clean — no assistance/financial/pension content |
