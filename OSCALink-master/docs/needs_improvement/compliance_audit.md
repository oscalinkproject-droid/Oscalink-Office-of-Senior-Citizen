# OSCALink Compliance Audit Report: Documentation vs. Implementation

**Date:** May 9, 2026  
**Scope:** `web/src/` compared against `docs/` and `docs/reference/`

---

## 🔴 CRITICAL

| # | Issue | Location |
|---|-------|----------|
| 1 | ~~**"Disbursed" status fails DB constraint** — Code writes `"Disbursed"` but DB only allows `Pending, Approved, Released, Rejected`. Updating a request to `"Disbursed"` will throw a PostgreSQL error.~~ ✅ **Fixed** — All `"Disbursed"` references renamed to `"Released"` across codebase, types, and migration. | `requests.ts, request-board.tsx, migrations` |
| 2 | ~~**No middleware file** — Docs say "Middleware enforces admin-only access to /staff, /verifications, /reports" but no `middleware.ts` exists. Route protection is entirely client-side (runs after JS loads).~~ ✅ **Fixed** — Created `middleware.ts` protecting `/staff`, `/verifications`, `/reports` (admin-only) and `/resident/*` (resident-only). | `middleware.ts` |
| 3 | ~~**Officials see all assistance requests city-wide** — `requests/page.tsx:58` filters by `barangay` but the `assistance_requests` table has NO `barangay` column. Filter silently does nothing — data leak.~~ ✅ **Fixed** — `barangay` column exists on table; `createAssistanceRequest` now injects it from user metadata. Dashboard stats also barangay-filtered for officials. | `requests.ts, dashboard/page.tsx` |
| 4 | ~~**Reports page has zero server-side access control** — Any authenticated user can hit `/reports` directly and get all data. Sidebar hides it but URL is unprotected.~~ ✅ **Fixed** — Added RBAC check via `canViewReports` permission with redirect to `/dashboard`. | `reports/page.tsx` |
| 5 | ~~**`resident` role can't be stored in profiles table** — DB constraint only allows `admin, osca_head, mswd_officer, mayor, official`. Resident portal uses localStorage auth instead.~~ ✅ **Fixed** — Added `'resident'` to `profiles_role_check` constraint in migration. | DB constraint |

## 🟠 HIGH

| # | Issue | Location |
|---|-------|----------|
| 6 | ~~**Dashboard complaints may leak data to officials** — Code comment acknowledges "potential leak" for barangay filtering of complaints.~~ ✅ **Fixed** — Now joins through seniors table to filter complaints by official's barangay. | `dashboard/page.tsx` |
| 7 | ~~**`getStaffList()` only returns barangay officials** — Function name implies all staff but query is `.eq('role', 'official')`.~~ ✅ **Fixed** — Now returns all staff roles (`official`, `admin`, `osca_head`, `mswd_officer`, `mayor`). | `users.ts:77` |
| 8 | ~~**Hardcoded admin roles in staff page** — `staff/page.tsx:41` duplicates `ADMIN_ROLES` from `rbac.ts`. Will drift if RBAC changes.~~ ✅ **Fixed** — Now imports `ADMIN_ROLES` from `rbac.ts`. | `staff/page.tsx:41` |

## 🟡 MEDIUM

| # | Issue | Location |
|---|-------|----------|
| 9 | ~~**`pages.md` missing 14 implemented routes** — Complaints, Inventory, PhilHealth, Quarterly, Staff, Verifications, Endorsements, plus 7 resident portal routes all undocumented.~~ ✅ **Fixed** — All routes documented with descriptions. | `docs/reference/pages.md` |
| 10 | ~~**`api-actions.md` missing 25+ server actions** — Only lists 9 actions; code has 30+ (complaints, inventory, philhealth, quarterly, staff, bedridden, etc.).~~ ✅ **Fixed** — All 30+ server actions documented across 9 action files. | `docs/reference/api-actions.md` |
| 11 | ~~**`database-schema.md` lists 3 phantom tables** — `discount_violations`, `id_issuance_log`, `verification_queue` don't exist. Missing `bedridden_verifications`.~~ ✅ **Fixed** — Phantom tables removed; added all actual tables (bedridden_verifications, family_composition, quarterly_updates, news, endorsements). Seniors columns expanded to 30+ entries. | `docs/reference/database-schema.md` |
| 12 | ~~**Resident portal documented as "PLANNED"** — But fully implemented with 8+ routes. `needs improvement.md` and `oscalink_role_map.md` both say planned/conceptual.~~ ✅ **Fixed** — Updated all docs (needs improvement.md, oscalink_role_map.md, pages contains.md) to mark resident portal as IMPLEMENTED/ACTIVE. | `docs/` |
| 13 | ~~**`needs improvement.md` says ID UI is "PENDING"** — But `/inventory` page is fully implemented.~~ ✅ **Fixed** — Changed status from "UI PENDING" to "IMPLEMENTED" with full inventory page details. | `docs/needs improvement.md` |
| 14 | ~~**Seniors table column doc gaps** — `reference/database-schema.md` missing 18+ columns (birthdate, contact_number, civil_status, address breakdown, religion, education, place_of_birth, etc.).~~ ✅ **Fixed** — All seniors columns documented (30+ entries including all PhilHealth address breakdown, identifiers, socio-economic, and digital archiving fields). | `docs/reference/database-schema.md` |

## 🟢 LOW

| # | Issue | Location |
|---|-------|----------|
| 15 | ~~**Barangay count mismatch** — Landing page says "54 Barangays", SYSTEM_OVERVIEW says 32, constants list has 38+.~~ ✅ **Fixed** — Landing page now uses `COTABATO_BARANGAYS.length` (37), SYSTEM_OVERVIEW updated with correct 37 barangays across 5 districts. Constants list already had the correct 37. | `page.tsx:46` / docs |
| 16 | **PhilHealth export province fallback text** — `"Cotabato (Not a Province)"` could confuse LHIO recipients. | `philhealth.ts:127` |

---

## RBAC Summary

| Role | Complaints Tab | Assistance Tab | Reports Tab | Staff Tab |
|------|---------------|---------------|-------------|-----------|
| **OSCA Head** | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **MSWD Officer** | ✅ | ✅ | ✅ | ❌ |
| **Official** | ❌ (fixed) | ✅ (has NEW CASE) | ❌ | ❌ |
| **Mayor** | ❌ (fixed) | ❌ | ✅ | ❌ |
| **Resident** | ❌ | ❌ | ❌ | ❌ |
