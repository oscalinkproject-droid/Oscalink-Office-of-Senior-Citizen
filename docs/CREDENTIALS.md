# OSCALink Roles & Login Credentials

## 🔑 Login Credentials (Production)

All test accounts use the same password: **`password123`**

| Role | Email | Password | Full Name | Barangay |
|------|-------|----------|-----------|--------|
| **OSCA Head** | `head@gmail.com` | `password123` | OSCA Head | City-Wide |
| **Admin** | `staff@gmail.com` | `password123` | OSCA Staff | City-Wide |
| **MSWD Officer** | `mswd@gmail.com` | `password123` | MSWD Officer | City-Wide |
| **Barangay Official** | `official@gmail.com` | `password123` | Barangay Official | Poblacion IV |
| **Mayor** | `mayor@gmail.com` | `password123` | City Mayor | N/A |

> [!NOTE]
> Senior Citizen (resident) accounts use a separate portal at `/resident/login` and are registered directly through the resident registration flow.

---

## 👥 Role Definitions

| Role | Key | Description | Access Level |
|------|-----|-------------|--------------|
| **OSCA Head** | `osca_head` | Super Admin — Full system control, "Certified & Correct" approval | City-Wide + All Features |
| **Admin** | `admin` | OSCA Staff — Day-to-day operations | City-Wide + Most Features |
| **MSWD Officer** | `mswd_officer` | Verification & assistance liaison | City-Wide + Verify |
| **Official** | `official` | Barangay Official — Barangay locked | Own Barangay Only |
| **Para-Social Worker** | `para_social_worker` | Barangay data gatherer — Barangay locked, read-heavy | Own Barangay (Limited Write) |
| **Mayor** | `mayor` | View-only executive access | View-Only (Reports, Dashboard) |
| **Resident** | `resident` | Senior Citizen self-service | Own Profile Only |

---

## 🗺️ Dashboard & Page Access by Role

| Page | OSCA Head | Admin | MSWD | Barangay Official | Para-Social Worker | Mayor |
|------|-----------|-------|------|-------------------|--------------------|-------|
| Dashboard | ✅ Full | ✅ Full | ✅ Full | ✅ Barangay | ✅ Barangay | ✅ View |
| Directory | ✅ All | ✅ All | ✅ All | ✅ Barangay | ✅ Barangay (read) | ✅ View |
| Requests Board | ✅ | ✅ | ✅ | ✅ Barangay | ✅ Barangay (read) | ❌ |
| Timeline | ✅ | ✅ | ✅ | ✅ Barangay | ✅ Barangay (read) | ✅ View |
| Complaints | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| ID Inventory | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| PhilHealth Export | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Quarterly Reports | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ View |
| Reports Analytics | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ View |
| Staff Management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Verifications | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Endorsements | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Settings | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## 🚪 Login URLs

| Portal | URL | Users |
|--------|-----|-------|
| **Admin/Staff Portal** | `/login` | Head, Admin, MSWD, Official, Mayor |
| **Resident Portal** | `/resident/login` | Senior Citizens |

---

## 🔐 Creating New Users

New staff users can be created by:
1. **OSCA Head** or **Admin** logged in
2. Navigate to `/staff` (Staff Management)
3. Click "Add New Official" and fill the form
4. System will generate credentials automatically

---

## ⚠️ Security Notes

- Change default passwords in production
- Each user should have their own account
- Contact admin if credentials are forgotten
- Resident portal uses a separate Supabase auth flow

---

## Last Updated: May 20, 2026