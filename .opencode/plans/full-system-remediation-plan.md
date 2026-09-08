# OSCALink Full System Remediation Plan

**Date:** June 17, 2026
**Scope:** Transcription requirement gaps + security audit remediation + federation president dashboard + code quality
**Based on:** Stakeholder interview (Federation President, Cotabato City) + May 26, 2026 system audit

---

## Phase 1 — Transcription Requirement Gaps

### 1.1 Add "Bedridden" as Senior Status

**Context:** Student stated in interview: "we have statuses: transferred, deceased, bedridden, and active."
Officer confirmed this is needed.

**Current:** `SENIOR_STATUSES = ['Pending', 'Active', 'Deceased', 'Transferred']` in `web/src/lib/constants.ts:15`.
`is_bedridden` is only a boolean column, not a status value. A bedridden senior shows as "Active" in status filters.

**Action:**
- Add `'Bedridden'` to `SENIOR_STATUSES` constant
- Extend DB CHECK constraint on `seniors.status` to include `'Bedridden'`
- Add `bedridden_since` DATE column to track when status changed
- Update registration/edit forms to allow selecting Bedridden status

### 1.2 Add Maintenance Medicines Tracking

**Context:** Officer emphasized 3+ times: "what maintenance medicines the senior takes, because they supply them with medicine coming from City Health... we have a card there that is filled out every month."

**Current:** No `maintenance_medicines` column exists. No medication records table.

**Action:**
- Add `maintenance_medicines` TEXT column to `seniors` table (migration)
- Add field to senior registration and edit forms
- Include in mobile profile view for self-service updates

### 1.3 ID Card Color Coding (Green/White)

**Context:** OSCA Head Sir Art Kalingasan wants green ID cards for social pensioners, white for non-pensioners.
Student: "just put the color coding first. White and green."

**Current:** `id-card-generator.tsx` uses uniform lavender (#adc6ff) accent for all IDs. `classification` field is never used to drive color.

**Action:**
- Add conditional logic in `id-card-generator.tsx`:
  - Green accent (#006837) when `is_social_pension_applicant = true` or classification is indigent pensioner
  - White/neutral accent for non-pensioners
- Update PDF export to match

### 1.4 Flexible Complaint Routing (OSCA vs Barangay)

**Context:** Student: "we will just make it flexible, sir. The senior can complain to the barangay, and they can also complain to OSCA."
Officer: "Yes, so it's accessible to the seniors, because they are seniors — sometimes those who are far away find it hard to come here to OSCA."

**Current:** Mobile `MyComplaints.tsx` inserts directly into `complaints` table with no destination field. Alert says "OSCA will review it shortly." No complaints page exists under `/barangay/`.

**Action:**
- Add `filed_with` column to `complaints` table: `CHECK (filed_with IN ('OSCA', 'Barangay'))`
- Add destination picker in mobile complaint form (OSCA or Barangay)
- Add `/barangay/complaints` page for barangay officials to view/manage complaints routed to them
- Add barangay-level RLS policy so officials only see complaints filed to their barangay

### 1.5 Certificate of Residency Digital Workflow

**Context:** Officer: "senior to barangay first. Because once they come here to ask for an ID, they need to go through the barangay first for the barangay certificate."
This is the critical pre-step before OSCA ID issuance.

**Current:** `barangay_cert_url`, `barangay_cert_number`, `barangay_cert_date` only exist in `bedridden_verifications` table for field visits. No general certificate of residency tracking for ID applications.

**Action:**
- Add columns to `seniors` table:
  - `barangay_cert_status` TEXT — Pending/Uploaded/Verified
  - `barangay_cert_url` TEXT — Cloudinary URL
  - `barangay_cert_number` TEXT
  - `barangay_cert_issued_at` TIMESTAMPTZ
  - `barangay_cert_verified_by` UUID — references profiles
- Enforce in pipeline: Pending Barangay → requires cert upload before advancing to Pending OSCA
- Add certificate upload UI in barangay registration flow

### 1.6 ID Release Notification

**Context:** Student: "What the senior citizen can access on the mobile app is they can see the notification of when their ID will be released."

**Current:** Mobile app has Realtime subscriptions and a `notifications` table, but no specific trigger for ID status changes.

**Action:**
- Add database trigger or edge logic: when `id_inventory.id_status` changes to `'Issued'`, insert row into `notifications` table
- Notification content: "Your OSCA Senior Citizen ID has been issued. You may claim it at the OSCA office."
- Mobile `Dashboard.tsx` already subscribes to realtime changes — ensure notification count is reflected

---

## Phase 2 — Proxy (Route Protection) Hardening

**Note:** Next.js 16 renamed Middleware to Proxy. `web/src/proxy.ts` IS the correct file.
It currently protects only: `/reports`, `/verifications`, `/staff`, `/barangay`, mayor-restricted routes.

### 2.1 Add Unauthenticated Redirect for All Dashboard Routes

**Current gap:** `/inventory`, `/philhealth`, `/quarterly`, `/timeline`, `/audit`, `/access`, `/transactions`, `/settings`, `/notifications`, `/endorsements`, `/directory` have NO unauthenticated check. `/dashboard` is only indirectly protected via client-side RoleGuard.

**Action:**
- Add regex pattern for all dashboard routes: `/^(dashboard|directory|requests|complaints|inventory|philhealth|quarterly|timeline|endorsements|settings|transactions|notifications|audit|access)/`
- Redirect to `/login` if no authenticated user

### 2.2 Role-Gate Sensitive Routes

| Route | Allowed Roles |
|-------|---------------|
| `/inventory` | osca_head, admin |
| `/philhealth` | osca_head, admin |
| `/quarterly` | osca_head, admin |
| `/audit` | osca_head |
| `/access` | osca_head |
| `/staff` | osca_head, admin, mswd_officer |

### 2.3 Consolidate and Clean Up Proxy Logic

- Extract role-checking to shared utility in `src/lib/proxy-guards.ts`
- Use role sets instead of inline arrays
- Add proper type safety for route matching

---

## Phase 3 — Database Security (SECURITY DEFINER Functions)

### 3.1 Revoke Anon Access to `create_senior_auth_user`

**File:** `supabase/migrations/20260525000006_senior_direct_auth.sql`
**Risk:** Any unauthenticated user can create Supabase Auth users with arbitrary senior_id, registration_id, and password.

**Action:**
```sql
REVOKE EXECUTE ON FUNCTION create_senior_auth_user FROM anon;
```
- Route creation through authenticated server action using service_role client

### 3.2 Secure `get_senior_self` Function

**File:** `supabase/migrations/20260524161605_mobile_senior_self_read_rpc.sql`
**Risk:** Returns complete seniors row for ANY provided UUID — full PII exposure by scanning.

**Action:**
- Modify RPC to verify `auth.uid()` matches `seniors.auth_id` instead of accepting arbitrary UUID
- OR revoke from anon and call via authenticated server action

### 3.3 Add Brute-Force Protection for `verify_senior_login`

**File:** `supabase/migrations/20260524000003_secure_auth_rpcs.sql`
**Risk:** Birthdates are easily guessable — enables credential stuffing.

**Action:**
- Wire `web/src/lib/rate-limiter.ts` into the mobile login API route before calling this function
- Add exponential backoff on repeated failures

### 3.4 Secure `register_senior_resident`

**File:** `supabase/migrations/20260524000003_secure_auth_rpcs.sql`
**Risk:** SECURITY DEFINER, no rate limiting, callable by anon — enables mass fraudulent registration.

**Action:**
- Restrict to authenticated roles (`para_social_worker`, `official`) via server action
- Add rate limiting per user
- Add input validation equivalent to `updateSeniorSchema`

---

## Phase 4 — API Security

### 4.1 Add Authentication to `/api/upload`

**Current:** POST with zero auth, CORS `*`, anyone can upload files to Cloudinary.

**Action:**
- Add session check via `createServerClient` — require authenticated user
- Restrict CORS to known origins

### 4.2 Add Authentication to `/api/inventory` Endpoints

**Current:** GET/POST/PATCH all have no auth, raw body mass assignment.

**Action:**
- Add session + RBAC check (osca_head, admin only)
- Add input validation (whitelist allowed fields)

### 4.3 Add Authentication to `/api/philhealth/export`

**Current:** GET exposes all senior PII with no authentication.

**Action:**
- Add session + RBAC check (osca_head, admin, mswd_officer)
- Verify role can export PhilHealth data

### 4.4 Fix Stubbed Cookie Handlers in API Routes

**Files affected:** `/api/complaints`, `/api/quarterly/generate`, `/api/philhealth/export`

**Current:** Multiple API routes use inline stubbed cookies:
```typescript
cookies: {
  get(_name: string) { return undefined; },
  set() {},
  remove() {},
}
```
This means no session cookies are read, effectively bypassing Supabase RLS.

**Action:**
- Replace all inline stubbed cookie handlers with `@/lib/supabase-server` factory function
- Ensure proper cookie read/write for auth context

---

## Phase 5 — Cross-Cutting Security

### 5.1 Wire CSRF Protection

**Current:** `web/src/lib/csrf.ts` implements `csrfGuard()` and `validateOrigin()` but they are never imported or called.

**Action:**
- Import and call `csrfGuard()` in all server actions that mutate state
- Import and call `validateOrigin()` in all API routes that mutate state

### 5.2 Wire Rate Limiter

**Current:** `web/src/lib/rate-limiter.ts` exists but is never imported or used.

**Action:**
- Apply to:
  - Login endpoint (`/login`)
  - Mobile login API (`/api/mobile/login`)
  - Registration server action
  - `/api/upload`
  - Complaint submission
  - Appointment booking

### 5.3 Add Security Headers

**Current:** `next.config.ts` has no security headers.

**Action:**
- Add to `next.config.ts`:
  - Content-Security-Policy
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy

### 5.4 Remove Hardcoded Passwords in Migrations

**Current:** SQL migration files contain `'password123'` and `'OSCA_Secure_2024'`.

**Action:**
- Replace with placeholder values or remove test setup scripts
- If used for dev seeding, use environment variables

### 5.5 Secure Staff Password Generation

**Current:** `Math.random().toString(36).slice(-12)` — not cryptographically secure.

**Action:**
- Replace with `crypto.randomBytes(16).toString('hex')`
- Never send plaintext passwords via email — use one-time reset links instead

### 5.6 Migrate Mobile Session Storage to SecureStore

**Current:** Both mobile apps store Supabase session tokens in AsyncStorage (unencrypted).

**Action:**
- Install and configure `expo-secure-store` in both `mobile/` and `mobile-parasocial/`
- Replace AsyncStorage session storage with SecureStore (Android Keystore / iOS Keychain)
- Add fallback handling for devices without SecureStore support

---

## Phase 6 — Federation President Dashboard

### 6.1 Add `federation_president` Role

**Action:**
- Add to `ROLE_PERMISSIONS` in `web/src/lib/rbac.ts`:
  ```typescript
  federation_president: {
    canManageAllSectors: false,
    canManageUsers: false,
    canExportPhilHealth: false,
    canExportReports: true,
    canApproveFinal: false,
    canVerifySeniors: false,
    canProcessAssistance: false,
    canManageComplaints: false,
    canViewAllRequests: false,
    canManageInventory: false,
    canAccessSettings: false,
    canViewReports: true,
    sectorLocked: false,        // Sees ALL 37 barangays
    canViewOwnData: false,
  }
  ```
- Add to `ROLE_HIERARCHY`, `ROLE_LABELS`, `ROLE_OPTIONS`
- Add to `USER_ROLES` constant
- Add to DB `profiles_role_check` constraint
- Add proxy route for federation dashboard

### 6.2 Federation Dashboard Page

**Route:** `/barangay/federation` (accessible only to federation_president)

**Features:**
- Per-barangay senior count cards (37 cards in grid)
- Total, male, female counts per barangay
- Age 80+ count per barangay (for expanded pension eligibility)
- Total pensioners and indigents per barangay
- Overall city-wide stats (total active, deceased, transferred, bedridden)
- Social pension distribution summary
- Recent registrations list
- Quick export capability for NCSC reporting requirements

### 6.3 Federation Analytics

**Action:**
- Create server action to aggregate stats across all 37 barangays
- Support filters by status, classification, sex, age range
- Export to CSV/PDF for NCSC data requests

---

## Phase 7 — Code Quality & Cleanup

### 7.1 Fix Duplicate Migration Timestamp

**Current:** `20260525000001_add_booklet_tracking.sql` and `20260525000001_add_welfare_section.sql` share the same timestamp.

**Action:**
- Rename one of them to `20260525000002` (or later timestamp)
- Verify no dependency conflicts

### 7.2 Consolidate RLS Migration Chains

**Current:** Three overlapping RLS migration chains with partial drops and recreates.
- v1: `20260524000001_consolidated_phase_a`
- v2: `20260524000002` (drops v1 policies)
- v3: `20260525000003_auth_aware_rls` (partially drops v2)

**Action:**
- Create a single consolidated RLS migration that is idempotent
- Drop the fragmented chain safely after verification

### 7.3 Remove Deprecated Column

**Current:** `seniors.emergency_contact` (plain TEXT) still exists alongside `emergency_contact_name` and `emergency_contact_number`.

**Action:**
- Migration to drop `emergency_contact` column
- Verify no code references it before dropping

### 7.4 Add `updated_at` Auto-Update Triggers

**Current:** Tables have `updated_at` columns but no `ON UPDATE` triggers to auto-set them.

**Action:**
- Create `set_updated_at()` trigger function
- Apply to: `seniors`, `profiles`, `assistance_requests`, `appointments`, `complaints`, `id_inventory`, `family_composition`

### 7.5 Add Error Boundaries

**Current:** No `error.tsx` files exist in any route segment.

**Action:**
- Add `error.tsx` for: `(dashboard)/`, `barangay/`, `login/`
- Graceful error recovery UI

### 7.6 Mobile: Create Shared Auth Hook

**Current:** Each mobile screen independently calls `supabase.auth.getSession()`. Duplicated auth logic in both mobile apps.

**Action:**
- Create `useAuth()` hook in `mobile/src/lib/` and `mobile-parasocial/src/lib/`
- Centralize session management, loading state, error handling
- Replace per-screen `getSession()` calls

### 7.7 Fix Duplicate parseFullName()

**Current:** Two versions with different behavior — `philhealth/export/route.ts` (complex) vs `actions/philhealth.ts` (simple).

**Action:**
- Extract to shared utility in `src/lib/utils.ts`
- Standardize behavior
- Replace both inline implementations

### 7.8 Add Mobile Pagination

**Current:** `directory.tsx` and `programs.tsx` in both mobile apps load all records at once.

**Action:**
- Add cursor-based pagination to mobile directory screens
- Add infinite scroll for programs/news feed

---

## Priority Matrix

```
IMMEDIATE (Week 1):    1.1 Bedridden status | 1.2 Medicines tracking | 1.4 Complaint routing
HIGH (Week 2):         1.3 ID color coding | 1.5 Certificate workflow | 2.1-2.3 Proxy hardening
MEDIUM (Week 3):       3.1-3.4 DB security functions | 4.1-4.4 API security
MEDIUM (Week 4):       5.1-5.6 Cross-cutting security | 1.6 ID release notification
LOW (Week 5):          6.1-6.3 Federation dashboard
LOW (Week 6):          7.1-7.8 Code quality cleanup
```

---

## Pre-Existing May 2026 Audit Status

Items from the May 26 audit that are RESOLVED by this plan's findings:

| May Audit Finding | Resolution |
|---|---|
| "No middleware.ts file" | **Resolved** — Next.js 16 uses `proxy.ts`, which exists. The audit was looking for old naming convention. |
| Overlapping RLS migration chains | Covered in Phase 7.2 |
| Duplicate migration timestamp | Covered in Phase 7.1 |
| Deprecated emergency_contact column | Covered in Phase 7.3 |

---

**End of Plan**
