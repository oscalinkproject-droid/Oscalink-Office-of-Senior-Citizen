# OSCALink System Overview

## Project Description

**OSCALink** is a centralized web-based portal for the **Office for Senior Citizen Affairs (OSCA)** in **Cotabato City**, Philippines. The system digitizes paper-based record management for senior citizens, providing tools for records management, assistance request processing, appointment scheduling, complaints handling, ID inventory tracking, and PhilHealth compliance reporting.

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16.2.4 (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 with custom design system
- **Animations:** Framer Motion 12 — using `LazyMotion` + `m.*` for deferred bundle loading (performance-optimized)
- **Fonts:** Inter, Manrope (Google Fonts)
- **Icons:** Material Symbols Outlined

### Backend & Database
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with SSR support
- **Row-Level Security (RLS):** Enabled for data protection

### Third-Party Integrations
- **Email:** Resend - Automated notifications for assistance requests, complaints, and quarterly reminders
- **Media Storage:** Cloudinary - Digital document/image storage for senior records

### Development Tools
- **Linting:** ESLint
- **Type Checking:** TypeScript
- **Testing:** Playwright (E2E role-based navigation suite)
- **Runtime:** Node.js

---

## Key Source Files

### RBAC System
- `web/src/lib/rbac.ts` - Core RBAC types, role permissions, and helper functions
- `web/src/lib/use-auth-role.ts` - React hook for accessing user role and permissions
- `web/src/components/ui/role-guard.tsx` - Reusable component for role-based UI rendering

### UI Components
- `web/src/components/ui/toast.tsx` - Toast notification system (replaces alert())
- `web/src/components/ui/confirm-dialog.tsx` - Confirmation dialog (replaces confirm())

### Constants
- `web/src/lib/constants.ts` - User roles, barangays, complaint types, etc.

---

## Core Features Implemented

### 1. Authentication & Authorization
- **Supabase Auth** with email-based login
- **Middleware** protection for all dashboard routes
- **Role-based Access Control (RBAC):**
  - `osca_head` - Super Admin (Full system oversight, "Certified & Correct" final approval power)
  - `admin` - Full access (OSCA Staff)
  - `mswd_officer` - Liaison (City Social Welfare, social program oversight)
  - `official` - Limited access (Barangay Officials, barangay-locked)
  - `mayor` - View-Only Executive Dashboard
  - `resident` - Personal Beneficiary Portal (Planned)
- **Permission System:**
   - canManageUsers: Manage staff accounts
   - canExportPhilHealth: Export PhilHealth CSV
   - canExportReports: Generate PDF/CSV reports
   - canApproveFinal: "Certified & Correct" final approval (osca_head only)
   - canVerifySeniors: Verify and activate senior records
   - canProcessAssistance: Process assistance requests
   - canManageComplaints: Handle complaints
   - canViewReports: View analytics dashboards
   - sectorLocked: Restrict to assigned barangay
   - selfLocked: Restrict to own individual record
- **Route Protection:** Middleware enforces admin-only access to /staff, /verifications, /reports; Resident-only access to /my-portal

- **Sidebar Navigation:** Dynamically filters menu items based on user permissions
- Redirect logic: unauthenticated users → login page; authenticated users → dashboard

### 2. Senior Citizens Directory (Enhanced)
- **PhilHealth-Mandated Address Breakdown:**
  - Unit/Room/Floor No.
  - Building Name
  - Lot/Block/House No.
  - Street
  - Subdivision/Village
- **Government Identifiers:**
  - PhilHealth No. (PIN)
  - SSS No.
  - GSIS No.
  - TIN
- **Socio-Economic Classification:**
  - Pensioner / Indigent / Supported / Private
  - Monthly Income tracking
- **Demographic Fields:**
  - Blood Type
  - Religion
  - Highest Educational Attainment
  - Employment Status
- **Status Tracking:** Active, Pending, Archived, Deceased, **Transferred** (new)
- **Search & Filter:** By name and barangay
- **Registration:** Multi-step registration modal with digital signature verification
- **Profile View:** Individual senior profile modal with edit capabilities
- **Digital Archiving:** Cloudinary upload for Birth/Voter certificates
- **Verification:** Administrative "Verify & Activate" workflow for OSCA Staff
- **Bedridden Tracking:** specialized "is_bedridden" flag for homebound senior liaison services
- **PhilHealth Geographic Sync:** Separate fields for City, Province, and Region for LHIO transmittal

### 3. Assistance Request System
- **Kanban Board UI:** Drag-and-drop workflow
- **Request Categories:**
  - Medical Support
  - Financial Aid
  - Burial Assistance
  - Assistive Devices
- **Status Workflow:** Pending → Approved → Released
- **Priority Levels:** URGENT, ROUTINE, LOGISTICS, VALIDATED, COMPLETED
- **Auto-generated Registration IDs:** Format: AX-XXX-XXXX

### 4. Complaints & Violations System (NEW)
- **Refusal of Benefits:** File complaints against establishments refusing discounts
- **Violation Types:** Refusal of Discount, Refusal of Privilege, Discrimination, Unfair Practice
- **Status Tracking:** Pending → Investigating → Resolved → Escalated → Closed
- **Priority Levels:** Urgent, Routine
- **Reporting:** Generate reports for Office of the Mayor
- **Email Notifications:** Automated complaint status updates via Resend

### 5. ID & Booklet Inventory (NEW)
- **ID Card Tracking:**
  - Serial number
  - Issue date
  - Expiry date
  - Status: Pending, Issued, Lost, Expired, Returned
- **Purchase Booklet Tracking:**
  - Serial number
  - Issue date
  - Status: Pending, Issued, Lost, Returned
- **Issuance Records:** Track who issued and received

### 6. PhilHealth Export (NEW)
- **LHIO-Compliant Format:** Export senior data in PhilHealth-required CSV format
- **Filters:** By barangay
- **Fields Included:**
  - PhilHealth No., Full Name, Birth Date, Sex, Civil Status
  - Complete Address (PhilHealth breakdown)
  - Government IDs (GSIS, SSS, TIN)
  - Classification and Monthly Income
- **Password-Protected:** Export for secure transmittal

### 7. Quarterly Maintenance (NEW)
- **Automated Report Generation:**
  - Total seniors, Active, Transferred, Deceased counts
  - New registrations for the quarter
- **Status Tracking:** Pending → Verified → Submitted
- **Automated Reminders:** Email notifications via Resend for quarterly deadlines

### 8. Appointment/Service Scheduling
- **Calendar View:** Interactive appointment calendar
- **Service Types:** Health checkups, ID renewals, program registrations
- **Status Tracking:** Scheduled, Completed, Missed
- **Upcoming Appointments Widget:** Dashboard quick view

### 9. Dashboard & Analytics
- **Metrics Cards:** Total seniors, active accounts, pending requests, deceased verified
- **Demographic Charts:**
  - Age group distribution (60-64, 65-69, 70-74, 75-79, 80-84, 85+)
  - Status distribution (Active, Pending, Archived, Deceased, Transferred)
  - Barangay distribution
  - Monthly registration trends (last 6 months)
- **Recent Activity Feed:** System events display

### 10. Reports Module
- Seniors count by barangay
- Assistance metrics
- Service delivery logs
- PDF generation with jsPDF and jsPDF-AutoTable

### 11. Staff Management (Enhanced)
- Commission new officials with roles
- Role assignment: OSCA Head, MSWD Officer, Mayor (View-Only), Admin, Barangay Official
- Barangay assignment
- Staff list with status indicators

### 12. UI Components & UX Enhancements
- **Custom Toast Notifications:** Replaced native browser `alert()` with themed toast system
- **Confirmation Dialogs:** Replaced native browser `confirm()` with modal confirmation dialogs
- **Dark Theme Consistency:** All dialogs match OSCALink "Midnight Institutional" design
- **Animation:** Smooth transitions using Framer Motion

### 13. Public Landing Page (Enhanced)
- **News & Activities:** Updates on programs and national laws
- **Downloads:** PMRF forms, Assistance applications, ID applications, Complaint forms
- **Government Links:** DSWD, PhilHealth, DILG, SSS, GSIS, OSCA National

---

## Database Schema

### Tables

#### `seniors` (Enhanced)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| full_name | TEXT | Senior's full name |
| age | INTEGER | Age |
| barangay | TEXT | Barangay |
| status | TEXT | Active/Pending/Archived/Deceased/Transferred |
| registration_id | TEXT | Unique ID (AX-XXX-XXXX) |
| contact_number | TEXT | Phone number |
| address | TEXT | Legacy address field |
| address_unit | TEXT | PhilHealth: Unit/Room |
| address_building | TEXT | PhilHealth: Building |
| address_lot_block | TEXT | PhilHealth: Lot/Block |
| address_street | TEXT | PhilHealth: Street |
| address_subdivision | TEXT | PhilHealth: Village |
| address_city | TEXT | PhilHealth: City/Municipality |
| address_province | TEXT | PhilHealth: Province |
| address_region | TEXT | PhilHealth: Region |
| birthdate | TEXT | Date of birth |
| sex | TEXT | M/F |
| civil_status | TEXT | Single/Married/Widowed/Separated |
| emergency_contact | TEXT | Emergency contact info |
| gsis_no | TEXT | GSIS Number |
| sss_no | TEXT | SSS Number |
| tin | TEXT | TIN |
| philhealth_no | TEXT | PhilHealth PIN |
| classification | TEXT | Pensioner/Indigent/Supported/Private |
| monthly_income | NUMERIC | Monthly income |
| income_range | TEXT | Income bracket |
| blood_type | TEXT | Blood type |
| religion | TEXT | Religion |
| education | TEXT | Education level |
| employment_status | TEXT | Employment status |
| is_bedridden | BOOLEAN | Bedridden / Homebound status |
| birth_certificate_url | TEXT | Cloudinary URL |
| voter_id_url | TEXT | Cloudinary URL |
| profile_photo_url | TEXT | Cloudinary URL |
| is_verified | BOOLEAN | Verification status |
| verified_by | UUID | Verifier user ID |
| verified_at | TIMESTAMP | Verification timestamp |
| digital_signature_url | TEXT | Digital signature |
| last_check_in | TIMESTAMP | Last status update |
| created_at | TIMESTAMP | Record creation date |

#### `family_composition` (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| senior_id | UUID | Foreign key to seniors |
| member_name | TEXT | Family member name |
| relationship | TEXT | Relationship to senior |
| birthdate | DATE | Member birthdate |
| occupation | TEXT | Member occupation |
| monthly_income | NUMERIC | Member income |
| is_dependent | BOOLEAN | Dependent status |
| created_at | TIMESTAMP | Record creation date |

#### `complaints` (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| senior_id | UUID | Foreign key to seniors |
| complainant_name | TEXT | Complainant name |
| complainant_contact | TEXT | Contact info |
| respondent_name | TEXT | Respondent name |
| respondent_address | TEXT | Respondent address |
| violation_type | TEXT | Type of violation |
| incident_date | DATE | Date of incident |
| incident_location | TEXT | Location |
| description | TEXT | Description |
| status | TEXT | Pending/Investigating/Resolved/Escalated/Closed |
| priority | TEXT | Urgent/Routine |
| assigned_to | UUID | Assigned staff |
| resolution_notes | TEXT | Resolution details |
| created_at | TIMESTAMP | Record creation date |
| updated_at | TIMESTAMP | Last update |

#### `id_inventory` (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| senior_id | UUID | Foreign key to seniors |
| id_card_serial | TEXT | ID card serial |
| id_issued_date | DATE | ID issue date |
| id_expiry_date | DATE | ID expiry date |
| id_status | TEXT | Pending/Issued/Lost/Expired/Returned |
| booklet_serial | TEXT | Booklet serial |
| booklet_issued_date | DATE | Booklet issue date |
| booklet_status | TEXT | Pending/Issued/Lost/Returned |
| issued_by | UUID | Issuing staff |
| received_by | TEXT | Recipient name |
| received_signature | TEXT | Signature |
| created_at | TIMESTAMP | Record creation date |
| updated_at | TIMESTAMP | Last update |

#### `quarterly_updates` (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| quarter | TEXT | Q1/Q2/Q3/Q4 |
| year | INTEGER | Year |
| total_seniors | INTEGER | Total count |
| active_seniors | INTEGER | Active count |
| transferred_seniors | INTEGER | Transferred count |
| deceased_seniors | INTEGER | Deceased count |
| new_registrations | INTEGER | New registrations |
| dropped_seniors | INTEGER | Dropped count |
| verified_by | UUID | Verifier user ID |
| verified_at | TIMESTAMP | Verification timestamp |
| status | TEXT | Pending/Verified/Submitted |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMP | Record creation date |

#### `news` (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | News title |
| content | TEXT | News content |
| category | TEXT | News/Activity/Announcement/Alert |
| is_published | BOOLEAN | Published status |
| publish_date | TIMESTAMP | Publication date |
| author_id | UUID | Author user ID |
| created_at | TIMESTAMP | Record creation date |
| updated_at | TIMESTAMP | Last update |

#### `downloads` (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Download title |
| description | TEXT | Description |
| file_url | TEXT | File URL |
| category | TEXT | PMRF/Forms/Guidelines/Reports/Other |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Record creation date |

#### `government_links` (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agency_name | TEXT | Agency name |
| description | TEXT | Description |
| website_url | TEXT | Website URL |
| icon | TEXT | Icon name |
| is_active | BOOLEAN | Active status |
| display_order | INTEGER | Display order |
| created_at | TIMESTAMP | Record creation date |

#### `verification_queue` (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| senior_id | UUID | Foreign key to seniors |
| verification_type | TEXT | Registration/Bedridden/ID/Transfer |
| status | TEXT | Pending/Approved/Rejected/Cancelled |
| requested_by | UUID | Requester ID |
| requested_at | TIMESTAMP | Request date |
| reviewed_by | UUID | Reviewer ID |
| reviewed_at | TIMESTAMP | Review date |
| review_notes | TEXT | Reviewer feedback |
| created_at | TIMESTAMP | Creation date |

#### `discount_violations` (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| senior_id | UUID | Foreign key to seniors |
| establishment_name | TEXT | Venue name |
| violation_type | TEXT | Nature of violation |
| status | TEXT | Pending/Resolved/Escalated |
| complainant_name | TEXT | Complainant name |
| created_at | TIMESTAMP | Creation date |

#### `id_issuance_log` (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| senior_id | UUID | Foreign key to seniors |
| id_type | TEXT | OSCA ID/Booklet |
| serial_number | TEXT | Unique ID |
| booklet_serial | TEXT | Booklet ID |
| issued_date | DATE | Issuance date |
| status | TEXT | Issued/Lost/Replaced |
| created_at | TIMESTAMP | Creation date |

#### `assistance_requests`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| senior_id | UUID | Foreign key to seniors |
| title | TEXT | Request title |
| description | TEXT | Request details |
| category | TEXT | Request type |
| status | TEXT | Pending/Approved/Released |
| priority | TEXT | Priority level |
| full_name | TEXT | Requester name |
| created_at | TIMESTAMP | Creation date |

#### `appointments`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| senior_id | UUID | Foreign key to seniors |
| service_type | TEXT | Service description |
| appointment_date | TIMESTAMP | Scheduled date/time |
| status | TEXT | Scheduled/Completed/Missed |
| created_at | TIMESTAMP | Creation date |

#### `profiles` (Enhanced)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (links to auth.users) |
| email | TEXT | User email |
| full_name | TEXT | User's full name |
| role | TEXT | admin/osca_head/mswd_officer/mayor/official |
| barangay | TEXT | Assigned barangay |

---

## UI/UX Design System

### Theme: "Midnight Institutional"
- **Background:** Dark theme (#0e141b foundation)
- **Glassmorphism:** backdrop-blur-xl, bg-white/5 for floating elements
- **No solid borders:** Use tonal shifts and negative space

### Components
- **Metric Cards:** Stats display with icons and trends
- **Data Tables:** Sortable, paginated tables
- **Kanban Board:** Drag-and-drop request management
- **Calendar:** Appointment scheduling interface
- **Charts:** Donut charts, bar charts, trend lines, demographic charts

### Pages
1. **Landing Page** (`/`) - Public landing page with News, Downloads, Government Links
2. **Login** (`/login`) - Authentication
3. **Dashboard** (`/dashboard`) - Main overview
4. **Resident Portal** (`/my-portal`) - Personal dashboard for senior citizens (Planned)
5. **Directory** (`/directory`) - Seniors management
5. **Requests** (`/requests`) - Assistance requests kanban
6. **Complaints** (`/complaints`) - Complaints registry
7. **ID Inventory** (`/inventory`) - ID & Booklet tracking
8. **PhilHealth** (`/philhealth`) - PhilHealth export
9. **Quarterly** (`/quarterly`) - Quarterly maintenance
10. **Timeline** (`/timeline`) - Appointments calendar
11. **Appointments** (`/timeline/appointments`) - Detailed appointments
12. **Reports** (`/reports`) - Analytics and reports (restricted: osca_head, admin, mswd_officer, mayor)
13. **Staff** (`/staff`) - Staff management (osca_head, admin only)
14. **Verifications** (`/verifications`) - Bedridden verification queue (osca_head, admin only)
15. **Settings** (`/settings`) - User settings

---

## Cotabato City Barangays Covered

37 barangays across 5 districts:

**Bagua District (4):** Mother Bagua, Bagua I, Bagua II, Bagua III

**Kalanganan District (3):** Mother Kalanganan, Kalanganan I, Kalanganan II

**Poblacion District (10):** Mother Poblacion, Poblacion I, Poblacion II, Poblacion III, Poblacion IV, Poblacion V, Poblacion VI, Poblacion VII, Poblacion VIII, Poblacion IX

**Rosary Heights District (14):** Mother Rosary Heights, Rosary Heights I, Rosary Heights II, Rosary Heights III, Rosary Heights IV, Rosary Heights V, Rosary Heights VI, Rosary Heights VII, Rosary Heights VIII, Rosary Heights IX, Rosary Heights X, Rosary Heights XI, Rosary Heights XII, Rosary Heights XIII

**Tamontaka District (6):** Mother Tamontaka, Tamontaka I, Tamontaka II, Tamontaka III, Tamontaka IV, Tamontaka V

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
```

---

## Current Status — May 2026

### Production-Ready Features:
- ✅ Authentication flow with RBAC (6 roles fully implemented)
- ✅ Seniors directory with PhilHealth-compliant fields (all 24 fields saved)
- ✅ Multi-step registration with digital signature verification
- ✅ Assistance request management (Kanban with full status workflow)
- ✅ Complaints registry with email notifications
- ✅ ID & Booklet inventory tracking
- ✅ PhilHealth CSV export for LHIO transmittal
- ✅ Quarterly maintenance reports with reminders
- ✅ Appointment scheduling
- ✅ Dashboard analytics
- ✅ Reports generation
- ✅ Staff management with 6-tier role system (incl. Mayor & Resident)
- ✅ Public landing page with News/Downloads/Links
- ✅ Cloudinary document archiving
- ✅ Resident (Senior Citizen) self-service portal (`/resident/*`)
- ✅ Barangay Official dedicated portal (`/barangay/*`)
- ✅ Endorsements module

### Performance:
- ✅ Framer Motion refactored to `LazyMotion` + `m.*` — ~100 KB deferred from initial JS bundle
- ✅ WCAG AA accessibility contrast fixes applied to landing page and footer
- ✅ PageSpeed Insights score improving from 58 → 85+ (pending post-deploy retest)

### Security:
- ✅ RLS policies enabled across all tables
- ✅ Middleware route protection with role-based access
- ✅ 6-Tier RBAC with permission system
- ✅ Digital signature verification

### Testing:
- ✅ Playwright E2E suite implemented (`e2e/roles.spec.ts`)
- ✅ All 4 role-based navigation tests passing

### UI/UX Improvements:
- ✅ Replaced native browser dialogs (alert/confirm) with custom toast notifications
- ✅ Confirmation dialogs for destructive actions
- ✅ Modal scrollbar fixes
- ✅ Avatar fallback with initials for Appointments Timeline
- ✅ Role-differentiated dashboards (each role sees only their relevant sidebar items)

### Compliance:
- ✅ PhilHealth Circular 033-2017 address breakdown
- ✅ RA 9257 (Senior Citizens Act) requirements
- ✅ Memorandum Circular 2005-63 (Liaison Center functions)
- ✅ DSWD quarterly reporting
