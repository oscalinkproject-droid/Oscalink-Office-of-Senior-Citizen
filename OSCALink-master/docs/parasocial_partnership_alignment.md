# Para-Social Worker Partnership Alignment Plan

**Date:** May 13, 2026
**Context:** Audio transcript from MSWD/LGU/BLGU partnership coordination meeting
**Goal:** Align the `para_social_worker` role with the three-way partnership model (MSSD / LGU / BLGU)

---

## 1. Partnership Model (From Transcript)

```
MSSD/MSWD (Funding & Program Guidelines)
    │
    ▼
LGU (Administrative Partnership — coordinates resources)
    │
    ▼
BLGU (Ground-Level Execution — deploys para-social worker)
    │
    ▼
Para-Social Worker (Data gathering, program awareness, direct contact)
    │
    ▼
Senior Citizens (Community / Barangay Residents)
```

The para-social worker serves as the **"landing point"** — when MSSD launches a program, the PSW is already on the ground gathering data and creating awareness. This is a **three-way partnership**: MSSD ↔ LGU ↔ BLGU (via PSW).

---

## 2. Current Role Structure

| Role | Level | Maps To | Barangay Locked | Routes |
|------|-------|---------|:-------------:|--------|
| `osca_head` | 4 | OSCA Head (Super Admin) | ❌ | All admin |
| `admin` | 3 | OSCA Staff | ❌ | All admin |
| `mswd_officer` | 2 | MSWD Officer (Liaison) | ❌ | Main dashboard |
| `official` | 1 | Barangay Official (BLGU) | ✅ | Main dashboard |
| `para_social_worker` | 0 | Barangay Field Worker | ✅ | `/barangay/*` + mobile |
| `mayor` | 0 | Mayor (View Only) | ❌ | Main dashboard |
| `resident` | -1 | Senior Citizen | ❌ | `/resident/*` + mobile |

### Current Status of Para-Social Worker Implementation

| Layer | Status | Details |
|-------|--------|---------|
| DB role constraint | ✅ Done | `profiles_role_check` includes `para_social_worker` |
| Senior pipeline statuses | ✅ Done | `Pending Barangay` → `Pending OSCA` → `Active` |
| Web RBAC definition | ✅ Fixed | `canVerifySeniors = true` (Pending → Pending Barangay → Pending OSCA pipeline) |
| Web middleware | ✅ Fixed | `BARANGAY_ROLES` includes both `para_social_worker` and `official` |
| Web `/barangay/*` pages | ✅ Built | Dashboard, Directory, Register, Endorsements, Programs |
| Staff management (create/edit) | ✅ Built | Role selectable, barangay set automatically |
| Mobile-barangay app | ⚠️ Partial | No partnership model visualization, no pipeline stages |
| RLS policies | ⚠️ Missing | No barangay-isolated RLS for PSW specifically |
| Endorsement pipeline tracking | ❌ Missing | Only `Active`/`Completed`/`Revoked` — no level tracking |

---

## 3. Phase 1 — Fix RBAC & Middleware (Web)

### 3.1 RBAC Permissions (`web/src/lib/rbac.ts`)

Enable reasonable permissions for `para_social_worker`:

```typescript
para_social_worker: {
  canManageAllSectors: false,
  canManageUsers: false,
  canExportPhilHealth: false,
  canExportReports: false,
  canApproveFinal: false,
  canVerifySeniors: true,          // Enable — they register seniors at barangay level
  canProcessAssistance: false,     // Keep false — handled by MSWD
  canManageComplaints: false,
  canViewAllRequests: false,
  canManageInventory: false,
  canAccessSettings: false,
  canViewReports: false,
  sectorLocked: true,              // Keep — restricted to their barangay
  canViewOwnData: false,
}
```

Also consider enabling for `official` (BLGU):
```typescript
official: {
  ...
  canVerifySeniors: true,          // Already true
  canProcessAssistance: true,      // Already true
  ...
}
```

### 3.2 Middleware Route Protection (`web/middleware.ts`)

Include both `para_social_worker` and `official` in barangay routes:

```typescript
const BARANGAY_ROLES = new Set(["para_social_worker", "official"]);
```

This allows BLGU officials to access `/barangay/*` alongside PSWs. The web `/barangay` pages already have barangay-locked data queries.

---

## 4. Phase 2 — Database: Pipeline & Partnership Schema

### 4.1 Planned Migration: `20260513000000_parasocial_partnership.sql` (**NOT YET CREATED**)

#### Endorsement Pipeline Tracking

```sql
-- Track which level an endorsement is currently at
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS current_level TEXT 
  DEFAULT 'BLGU' CHECK (current_level IN ('BLGU', 'LGU', 'MSSD', 'Completed'));

-- Track who submitted it
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS submitted_by UUID 
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Track notes per endorsement
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS notes TEXT;
```

#### Program Source Level

```sql
-- Track which level published a program
ALTER TABLE news ADD COLUMN IF NOT EXISTS source_level TEXT 
  DEFAULT 'MSSD' CHECK (source_level IN ('MSSD', 'LGU', 'BLGU'));
```

#### Barangay-Isolated RLS for Barangay Roles

```sql
-- Barangay-isolated SELECT for PSW and official
CREATE POLICY "sector_locked_select_seniors" ON seniors
FOR SELECT USING (
  barangay = (SELECT barangay FROM profiles WHERE id = auth.uid())
  AND auth.role() = 'authenticated'
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('para_social_worker', 'official')
);

-- Barangay-isolated INSERT for PSW (they register in their barangay only)
CREATE POLICY "sector_locked_insert_seniors" ON seniors
FOR INSERT WITH CHECK (
  barangay = (SELECT barangay FROM profiles WHERE id = auth.uid())
  AND auth.role() = 'authenticated'
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('para_social_worker', 'official')
);
```

---

## 5. Phase 3 — Mobile-Barangay App: Partnership Model

### 5.1 Fix Role Constants (`src/lib/constants.ts`)

- Remove `blgu_official` — use `official` to match web constants
- Add partnership chain data
- Add role hierarchy info
- Add pipeline status flow constants

### 5.2 Fix Auth Gate (`app/_layout.tsx`)

- Allow both `para_social_worker` and `official` roles
- Show role name dynamically instead of hardcoded "Para-Social Workers only"

### 5.3 Dashboard — Partnership Chain

Add **Service Delivery Chain** visualization:
```
[MSSD] › [LGU] › [BLGU] › [PSW]
```
Each dot colored by level. Shows the user's current position highlighted.

### 5.4 Endorsements — Pipeline Stages

Replace flat status with pipeline stage display:
```
Endorsement: Pension Application
Pipeline: [BLGU ●] → [LGU ○] → [MSSD ○]
Status: For LGU Review
```

- **Form section:** Endorsement type + notes + submit
- **History section:** Each entry shows pipeline stage + which level it's currently at

### 5.5 Programs — Source Level Badge

- Add `source_level` badge (MSSD / LGU / BLGU) on each program card
- Color-coded by level

### 5.6 Register — Pipeline Description

- On success screen, show full pipeline: *"Pending BLGU → LGU → MSSD verification"*

### 5.7 Directory — Verification Stage

- Show which stage each senior is at in the pipeline
- Status badge reflects current level (Pending Barangay / Pending LGU / Pending MSSD / Active)

---

## 6. Phase 4 — Web `/barangay` Pages: Partnership Context

### 6.1 Dashboard
- Add partnership chain component (same as mobile)
- Show current level: "You are operating at the **Barangay (BLGU)** level"
- Display which programs are actively deployed in this barangay

### 6.2 Endorsements
- Add pipeline level selector when submitting
- Show current stage on each endorsement card
- Allow advancing endorsements to next level (LGU → MSSD → Completed)

### 6.3 Programs
- Add `source_level` column to program display
- Add filter by source level

### 6.4 Directory
- Show pipeline stage per senior
- Add "Advance to Next Stage" button for eligible seniors

---

## 7. Data Flow (Post-Alignment)

```
MSSD (Ministry)
  │ publishes programs → news table (source_level = 'MSSD')
  │ final verification → senior status becomes 'Active'
  │ receives endorsements → current_level = 'MSSD'
  ▼
LGU (City)
  │ coordinates resources
  │ reviews endorsements → current_level = 'LGU'
  │ publishes local programs → news table (source_level = 'LGU')
  ▼
BLGU (Barangay)
  │ deploys para-social worker
  │ verifies seniors → status becomes 'Pending OSCA' / 'Pending LGU'
  │ reviews endorsements → current_level = 'BLGU'
  ▼
Para-Social Worker
  │ registers seniors → status = 'Pending Barangay'
  │ gathers data → seniors table
  │ submits endorsements → endorsements table
  │ program awareness → informs residents
  ▼
Senior Citizens
  │ receive services
  │ submit assistance requests
  │ schedule appointments
```

---

## 8. Files to Modify

### Web App

| File | Change |
|------|--------|
| `web/src/lib/rbac.ts` | Enable `canVerifySeniors` for PSW |
| `web/middleware.ts` | Add `official` to `BARANGAY_ROLES` |
| `web/supabase/migrations/20260513000000_parasocial_partnership.sql` | New migration |
| `web/src/app/barangay/dashboard/page.tsx` | Add partnership chain |
| `web/src/app/barangay/endorsements/page.tsx` | Add pipeline stages |
| `web/src/app/barangay/programs/page.tsx` | Add source level badge |
| `web/src/app/barangay/directory/page.tsx` | Add verification stage |
| `web/src/app/barangay/register/page.tsx` | Add pipeline description |

### Mobile-Barangay App

| File | Change |
|------|--------|
| `mobile-barangay/src/lib/constants.ts` | Fix roles, add partnership data |
| `mobile-barangay/app/_layout.tsx` | Support `official` + PSW roles |
| `mobile-barangay/app/(tabs)/dashboard.tsx` | Add partnership chain |
| `mobile-barangay/app/(tabs)/endorsements.tsx` | Add pipeline stages |
| `mobile-barangay/app/(tabs)/programs.tsx` | Add source level badge |
| `mobile-barangay/app/(tabs)/directory.tsx` | Add verification stage |
| `mobile-barangay/app/(tabs)/register.tsx` | Add pipeline description |
