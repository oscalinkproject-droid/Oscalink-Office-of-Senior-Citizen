# OSCALink Institutional Role & Page Map

This document outlines the security architecture and current implementation status of the OSCALink municipal portal.

**Last Updated:** May 20, 2026

---

## 👥 Role Definitions

### 1. Super Admin (`osca_head`)
- **Authority**: City-Wide.
- **Permissions**: Full Read/Write access, system configuration, "Certified & Correct" final approval power.
- **Oversight**: Full system oversight and final approvals for all senior registrations, assistance releases, and quarterly reports.
- **Status**: ✅ **ACTIVE / FULLY IMPLEMENTED**.

### 2. Admin (`admin` / OSCA Staff)
- **Authority**: City-Wide.
- **Permissions**: Full Read/Write access city-wide to manage records and process assistance.
- **Oversight**: Can generate consolidated reports for the entire municipality.
- **Status**: ✅ **ACTIVE / FULLY IMPLEMENTED**.

### 3. MSWD Liaison (`mswd_officer`)
- **Authority**: City-Wide (Social Programs).
- **Permissions**: Legally mandated assistant to the OSCA Head for social programs. Can verify seniors, access endorsements, and view reports.
- **Oversight**: Programmatic oversight for social service distributions.
- **Status**: ✅ **ACTIVE / FULLY IMPLEMENTED**.

### 4. Barangay Official (`official`)
- **Authority**: Barangay-Locked (Assigned Barangay).
- **Permissions**: Read/Write access restricted to their assigned barangay's seniors, requests, and endorsements. Field-based monitoring and bedridden verification.
- **Oversight**: Cannot see or modify data from other barangays.
- **Sidebar Pages**: Dashboard, Directory, Requests, Timeline, Appointments, Endorsements, Programs, Settings.
- **Status**: ✅ **ACTIVE / FULLY IMPLEMENTED** (RLS enforced at DB level).

### 5. Para-Social Worker (`para_social_worker`)
- **Authority**: Barangay-Locked (Assigned Barangay).
- **Permissions**: Data-gathering field role. Can view seniors in their barangay and submit reports, but cannot process assistance, manage complaints, or export data. Primarily read-access with limited write for record tagging.
- **Oversight**: Cannot see data from other barangays. Lower hierarchy than Barangay Official.
- **Status**: ✅ **ACTIVE / IMPLEMENTED** (defined in RBAC, barangay-locked via RLS).

### 6. Mayor (`mayor`)
- **Authority**: View-Only Executive.
- **Permissions**: Read-only access to the analytics dashboard, reports, and quarterly summaries. No write capabilities.
- **Sidebar Pages**: Dashboard, Reports, Quarterly, Timeline, Settings.
- **Status**: ✅ **ACTIVE / FULLY IMPLEMENTED**.

### 7. Resident (`resident` / Senior Citizen)
- **Authority**: Self-Locked (Individual Record).
- **Permissions**: Read-Only access to their own profile, status of assistance requests, and appointment calendar.
- **Oversight**: Can view their own digital OSCA ID and verify their information is correct.
- **Routes**: `/resident/login`, `/resident/register`, `/resident/dashboard`, `/resident/profile`, `/resident/requests`, `/resident/appointments`, `/resident/settings`.
- **Status**: ✅ **ACTIVE / FULLY IMPLEMENTED**.

---

## 🗺️ Page Mapping & Implementation

| Page | OSCA Head | Admin | MSWD | Official | Para-Social Worker | Mayor | Resident | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Dashboard** | ✅ Full | ✅ Full | ✅ Full | ✅ Barangay | ✅ Barangay | ✅ View | ✅ Personal | ✅ Implemented |
| **Seniors Directory** | ✅ All | ✅ All | ✅ All | ✅ Barangay | ✅ Barangay (read) | ❌ | ✅ Own Profile | ✅ Implemented |
| **Assistance Board** | ✅ | ✅ | ✅ | ✅ Barangay | ✅ Barangay (read) | ❌ | ✅ Own Requests | ✅ Implemented |
| **Timeline** | ✅ Full | ✅ Full | ✅ Full | ✅ Barangay | ✅ Barangay (read) | ✅ View | ✅ Own Appts | ✅ Implemented |
| **Complaints** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ Implemented |
| **ID Inventory** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Implemented |
| **PhilHealth Export** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Implemented |
| **Quarterly Reports** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ View | ❌ | ✅ Implemented |
| **Reports Analytics** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ View | ❌ | ✅ Implemented |
| **Staff Management** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Implemented |
| **Verifications** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ Implemented |
| **Endorsements** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ Implemented |
| **Settings** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ Implemented |

---

## 🛠️ Security Architecture: Row-Level Security (RLS)

The system uses **Postgres RLS** to enforce data boundaries automatically at the database level.

- All tables have RLS enabled
- The `profiles` table is the source of truth for `role` and `barangay`
- Middleware (`middleware.ts`) enforces route-level access before the page renders
- The RBAC library (`src/lib/rbac.ts`) provides `hasPermission()` for UI-level enforcement

### Permission Flags

| Permission | osca_head | admin | mswd_officer | official | para_social_worker | mayor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| canManageUsers | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| canExportPhilHealth | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| canExportReports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canApproveFinal | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| canVerifySeniors | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canProcessAssistance | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| canManageComplaints | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canViewReports | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| sectorLocked | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
