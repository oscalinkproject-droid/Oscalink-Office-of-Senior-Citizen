# Para-Social Worker Module — Implementation Plan

**Date:** May 12, 2026
**Source:** MSWD/MSSD survey transcript — "Lingkod Pamayanan para sa Kapayapaan" program

---

## Background

The MSSD-BARMM deploys **para-social workers** to each barangay as community volunteers funded by MSSD, managed by the LGU, and hosted by the BLGU. Their role is to:

- Gather senior citizen data at the barangay level
- Disseminate program and service information to residents
- Serve as the bridge between MSWD/OSCA and the community
- Intake new senior registrations in the field

---

## Architecture

```
MSSD (funds) → LGU/MSWD (manages) → BLGU (hosts) → Para-Social Worker (field)
                                                           ↓
                                                    OSCALink Barangay Module
                                                    (data gathering + liaison)
```

---

## Phase 1 — RBAC: `para_social_worker` Role

**Scope:** Add a new role to the existing RBAC system.

### Files to Modify

| File | Change |
|------|--------|
| `web/src/lib/constants.ts` | Add `'para_social_worker'` to `USER_ROLES` |
| `web/src/lib/rbac.ts` | Add role to `RoleLevel`, hierarchy, labels, options, permissions, barangay-locked array |
| `web/src/app/actions/users.ts` | Add to `validRoles` and `getStaffList` query |
| `web/src/middleware.ts` | Add `/barangay` route protection for para_social_worker |
| DB migration | Add `'para_social_worker'` to `profiles_role_check` constraint |

### Permissions

| Permission | para_social_worker |
|---|---|
| `sectorLocked` | ✅ (assigned to 1 barangay) |
| `canManageAllSectors` | ❌ |
| `canManageUsers` | ❌ |
| `canExportPhilHealth` | ❌ |
| `canExportReports` | ❌ |
| `canApproveFinal` | ❌ |
| `canVerifySeniors` | ✅ (barangay pipeline: Pending → Pending Barangay → Pending OSCA) |
| `canProcessAssistance` | ❌ |
| `canManageComplaints` | ❌ |
| `canViewAllRequests` | ❌ |
| `canManageInventory` | ❌ |
| `canAccessSettings` | ❌ |
| `canViewReports` | ❌ |
| `canViewOwnData` | ❌ |

---

## Phase 2 — Barangay Data Gathering Module

**Scope:** New route group `/barangay` with pages for field data gathering.

### New Files

| File | Purpose |
|------|---------|
| `web/src/app/(barangay)/layout.tsx` | Barangay layout with simplified sidebar |
| `web/src/app/(barangay)/dashboard/page.tsx` | Barangay overview |
| `web/src/app/(barangay)/directory/page.tsx` | Seniors list (barangay-filtered) |
| `web/src/app/(barangay)/register/page.tsx` | Simplified senior registration |
| `web/src/app/(barangay)/endorsements/page.tsx` | Batch endorsements to MSWD/OSCA |
| `web/src/app/(barangay)/programs/page.tsx` | View active programs |

### Key Behaviors

- All pages filter data to the worker's assigned barangay
- Registration form is simplified for field use
- Endorsements allow batch submission of senior lists
- Programs page displays announcements from MSWD/OSCA

---

## Phase 3 — Multi-Step Pipeline & Integration

**Scope:** Connect barangay-level data to the city-level workflow.

### Status Pipeline

Extend `seniors.status` to include:

```
Pending Barangay → Pending OSCA → Active
```

Para-social worker registers a senior → `Pending Barangay`
OSCA/MSWD reviews → `Pending OSCA`
OSCA Head approves → `Active`

### Endorsements

- Para-social worker compiles lists (pension applicants, new registrants, etc.)
- Submits as batch endorsement to MSWD/OSCA
- Uses the `endorsements` table
- MSWD/OSCA staff can view and process endorsements

### Sidebar Updates

- Add conditional nav items for `para_social_worker` role in sidebar
- MSWD/OSCA sidebar should show "Barangay Endorsements" item

---

## Phase 4 — Mobile Optimization

**Scope:** Make the barangay module field-ready.

- Responsive layouts optimized for phone screens
- Quick-registration flow (minimal required fields)
- Touch-friendly UI (large buttons, simple forms)
- Offline-capable data gathering (future enhancement)
