# OSCALink QA Audit Report

**Date:** May 20, 2026
**Platform:** OSCALink (Next.js 16 + Supabase)
**Auditor:** QA Engineering Team

---

## Executive Summary

This report consolidates all historical QA findings and reflects their current resolution status as of May 2026. All previously identified critical data-loss issues have been resolved and the system is now production-ready.

---

## Audit History & Resolution Log

### 🔴 CRITICAL (March 30, 2026) — RESOLVED ✅

#### Issue 1: Ghost Inputs — 80% of Registration Fields Not Saved

**Original Finding:** `createSenior` in `seniors.ts` was only mapping 9 out of 24 fields. The following fields were silently dropped:

`sex`, `civil_status`, `address_unit`, `address_building`, `address_lot_block`, `address_street`, `address_subdivision`, `philhealth_no`, `sss_no`, `gsis_no`, `tin`, `blood_type`, `religion`, `education`, `employment_status`, `classification`, `monthly_income`

**Resolution:** All 24 fields are now fully mapped in `createSenior`. The seniors table was expanded via migration `20260330000001_expanded_seniors_schema.sql` and validated with smoke tests.

**Status:** ✅ RESOLVED

---

#### Issue 2: Database Schema Not Migrated

**Original Finding:** The expanded schema migration file existed in the codebase but was never applied to Supabase production, causing `column 'sex' does not exist` errors.

**Resolution:** All migrations applied. Confirmed via PhilHealth CSV export functionality working end-to-end.

**Status:** ✅ RESOLVED

---

#### Issue 3: RLS Blocks Unauthenticated Inserts

**Original Finding:** `new row violates row-level security policy for table "seniors"` during unauthed server action calls.

**Resolution:** Server actions now use the Supabase service role client for privileged writes. RLS policies updated to allow insert from authenticated staff roles.

**Status:** ✅ RESOLVED

---

### 🟠 HIGH (March 30, 2026) — RESOLVED ✅

#### Issue 4: Dead Buttons — No onClick Handlers

**Original Finding:**
- Directory: "Advanced Filters", Export, Refresh, Pagination had no handlers
- Profile Modal: "Edit Record", "History", kebab menu had no handlers
- Reports: "Master Data" export had no handler
- Kanban: Cards and "Add Card" had no handlers

**Resolution:** All interactive elements now have working handlers:
- Kanban board fully implements Pending → Approved → Released status workflow
- Directory pagination, export, and advanced filters are functional
- Profile modal supports edit and history views

**Status:** ✅ RESOLVED

---

#### Issue 5: Verification Button Missing

**Original Finding:** The `is_verified` boolean field existed in the DB but no UI button allowed toggling it.

**Resolution:** Verifications page (`/verifications`) implemented with full Verify & Activate workflow for OSCA Head and Admin roles.

**Status:** ✅ RESOLVED

---

### 🟡 MEDIUM — RESOLVED ✅

#### Issue 6: Pagination, File Download, History Modal

**Original Finding:** Placeholder UI elements with no backend logic.

**Resolution:** All paginated tables are functional. File downloads are live via Cloudinary. Profile history modal is implemented.

**Status:** ✅ RESOLVED

---

## Current System Status (May 2026)

### ✅ All Clear — No Open Issues

| Component | Status |
|-----------|--------|
| Senior Registration (all 24 fields) | ✅ Working |
| Database Schema | ✅ Migrated |
| RLS Policies | ✅ Correct |
| Kanban Status Workflow | ✅ Working |
| Verification Flow | ✅ Working |
| Pagination & Filters | ✅ Working |
| PhilHealth CSV Export | ✅ Working |
| Cloudinary Uploads | ✅ Working |
| Email Notifications (Resend) | ✅ Working |
| Role-Based UI (RBAC) | ✅ Enforced via Middleware + RLS |
| E2E Tests (Playwright) | ✅ Suite implemented |
| Accessibility (WCAG AA) | ✅ Contrast fixes applied |
| PageSpeed Performance | ✅ LazyMotion bundle optimization applied |

---

## Performance Audit (May 2026)

**PageSpeed Insights (Mobile) — Pre-optimization:**
- Performance: 58/100
- Accessibility: 95/100
- LCP: 8.9s

**Actions Taken:**
- Refactored `framer-motion` to use `LazyMotion` + `m.*` across 24 components, deferring ~100 KB from the initial JS bundle.
- Fixed all Lighthouse contrast ratio failures (`text-slate-500` → `text-slate-400`, badge colors `*-400` → `*-300`).

**Expected After Redeploy:**
- Accessibility: 100/100
- Performance: 85+/100

---

## E2E Test Coverage (Playwright)

Suite located at `web/e2e/roles.spec.ts`.

| Test | Description | Status |
|------|-------------|--------|
| OSCA Head Login | Full admin tabs visible | ✅ Pass |
| OSCA Staff Login | Staff-level tabs correct | ✅ Pass |
| Barangay Official | Redirected to `/barangay/dashboard` | ✅ Pass |
| MSWD Officer | Verifications & Endorsements visible; PhilHealth hidden | ✅ Pass |

---

**End of Report**
