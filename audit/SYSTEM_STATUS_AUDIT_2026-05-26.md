# OSCALink Comprehensive System Status Audit

**Date:** 2026-05-26
**Scope:** Full-stack audit covering Supabase database, Next.js web app, Expo mobile app, security posture, and build/deployment configuration

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Database Audit (Supabase)](#database-audit-supabase)
4. [Web Application Audit (Next.js)](#web-application-audit-nextjs)
5. [Mobile Application Audit (Expo)](#mobile-application-audit-expo)
6. [Security Audit](#security-audit)
7. [Consolidated Findings by Severity](#consolidated-findings-by-severity)
8. [Immediate Action Priorities](#immediate-action-priorities)

---

## Executive Summary

The audit uncovered **8 CRITICAL**, **9 HIGH**, **8 MEDIUM**, and **7 LOW** severity issues across the OSCALink system. The most urgent problems are:

- **Live secrets committed to git** (Cloudinary API key/secret, Resend API key, Supabase service role key in history)
- **Unauthenticated API endpoints** exposing senior citizens' full PII
- **No active Next.js middleware** — all route-level auth protection is non-functional
- **Insecure database functions** callable by anonymous users allowing account creation and data access
- **Mobile app stores session tokens in unencrypted storage**

The system is **not production-ready** in its current state. Immediate remediation of CRITICAL and HIGH findings is strongly recommended before any public deployment.

---

## Project Overview

| Component | Technology | Version |
|-----------|-----------|---------|
| Web App | Next.js | ^16.2.2 |
| Mobile App | Expo SDK | ~54.0.33 |
| Database | Supabase (PostgreSQL) | Cloud-hosted |
| Auth | Supabase Auth | — |
| UI Framework | React + Tailwind CSS | 19.2.4 / v4 |
| Mobile Navigation | expo-router | ~6.0.23 |
| File Storage | Cloudinary | ^2.9.0 |
| Email | Nodemailer (Gmail SMTP) | ^8.0.8 |

### Architecture

```
OSCALink/
├── web/                    # Next.js web application (admin/staff portal)
│   ├── src/app/            # App Router pages + API routes
│   ├── src/lib/            # Supabase clients, RBAC, CSRF, rate limiter
│   └── src/components/     # UI components
├── mobile-parasocial/      # Expo mobile app (barangay worker portal)
│   ├── app/                # expo-router screens
│   └── src/lib/            # Supabase client, cache, sync
├── supabase/               # Database migrations
│   └── migrations/         # 23 SQL migration files
└── docs/                   # Documentation
```

---

## Database Audit (Supabase)

### Tables (11 in main migrations, 9+ in web/ migrations)

| Table | Created | RLS Enabled | Key Concern |
|-------|---------|-------------|-------------|
| `seniors` | 20240329 | Yes | 40+ columns of PII, deprecated `emergency_contact` column |
| `assistance_requests` | 20240329 | Yes | Mass assignment risk, priority CHECK has non-priority values |
| `appointments` | 20240329 | Yes | — |
| `municipal_config` | 20240330 | Yes | Public read allowed |
| `batch_endorsements` | 20240330 | Yes | Policies split across migration versions |
| `batch_endorsement_items` | 20240330 | Yes | No status CHECK constraint |
| `news` | 20260511 | Yes | Published items publicly readable |
| `downloads` | 20260511 | Yes | Active items publicly readable |
| `government_links` | 20260511 | Yes | **No INSERT/UPDATE/DELETE RLS policies** |
| `endorsements` | 20260511 | Yes | — |
| `audit_logs` | 20260525 | Yes | service_role can INSERT (tampering risk) |
| `profiles` | web/ | Yes | **Readable by all authenticated users** |
| `family_composition` | web/ | Yes | — |
| `complaints` | web/ | Yes | — |
| `id_inventory` | web/ | Yes | — |
| `quarterly_updates` | web/ | Yes | — |
| `bedridden_verifications` | web/ | Yes | — |
| `verification_queue` | web/ | Yes | — |
| `discount_violations` | web/ | Yes | — |
| `id_issuance_log` | web/ | Yes | — |

### Critical Database Security Issues

#### DB-C1: `create_senior_auth_user` executable by `anon` role
- **File:** `20260525000006_senior_direct_auth.sql`
- `GRANT EXECUTE ON FUNCTION create_senior_auth_user(...) TO anon;`
- Any unauthenticated user can create Supabase Auth users with arbitrary senior_id, registration_id, and password.
- **Risk:** Account takeover, privilege escalation, database pollution.

#### DB-C2: `get_senior_self` bypasses RLS entirely
- **File:** `20260524161605_mobile_senior_self_read_rpc.sql`
- SECURITY DEFINER function that returns the complete seniors row for ANY provided UUID.
- **Risk:** Full PII exposure of all senior citizens by UUID scanning.

#### DB-C3: `verify_senior_login` has no brute-force protection
- **File:** `20260524000003_secure_auth_rpcs.sql`
- Compares registration_id + birthdate in plaintext. Birthdates are easily guessable.
- **Risk:** Senior identity enumeration and credential stuffing.

#### DB-C4: `register_senior_resident` has no rate limiting or verification
- **File:** `20260524000003` / `20260525000006`
- SECURITY DEFINER function creates seniors, id_inventory records, and auth users with no protection.
- **Risk:** Mass registration of fraudulent senior records.

### Migration Ordering Issues

| Issue | Detail |
|-------|--------|
| Duplicate timestamp | `20260525000001_add_booklet_tracking.sql` and `20260525000001_add_welfare_section.sql` share the same timestamp |
| 3 overlapping RLS migration chains | v1 (`20260524000001`) → v2 (`20260524000002`, drops v1) → v3 (`20260525000003`, partially drops v2). Effective policy set is split across v2 and v3. |
| Tables referenced before creation | RLS migrations reference `profiles`, `complaints`, `id_inventory`, etc. which only exist in `web/supabase/migrations/` |
| Columns referenced before addition | RLS v2/v3 reference `assistance_requests.barangay`, `endorsements.barangay` added only in web/ migrations |

### Data Integrity Issues

| Issue | Table | Detail |
|-------|-------|--------|
| No NOT NULL on `barangay` | seniors | Critical for sector-locked RLS but allows NULL |
| No NOT NULL on `senior_id` | assistance_requests | Used for RLS matching but allows NULL |
| No FK on `senior_id` (main migrations) | assistance_requests | FK only added in web/ migrations |
| Redundant `full_name` | assistance_requests | Duplicates senior's name via denormalization |
| Deprecated `emergency_contact` | seniors | Old text column still exists alongside normalized columns |
| No `updated_at` trigger | most tables | Columns exist but no auto-update mechanism |
| `priority` CHECK has non-priority values | assistance_requests | 'VALIDATED', 'LOGISTICS', 'COMPLETED' are statuses, not priorities |

### Functions & Triggers

| Function | Security | Risk |
|----------|----------|------|
| `is_city_wide_role()` | INVOKER | Safe |
| `is_sector_locked_role()` | INVOKER | Safe |
| `is_mayor_role()` | INVOKER | Safe |
| `user_barangay()` | INVOKER | Safe |
| `verify_senior_login()` | **DEFINER** | No brute-force protection |
| `register_senior_resident()` | **DEFINER** | No rate limiting, callable by anon |
| `get_senior_self()` | **DEFINER** | Allows reading any senior by UUID |
| `get_user_role()` | INVOKER | Safe |
| `get_user_senior_id()` | INVOKER | Safe |
| `get_user_barangay()` | **DEFINER** | Reads from profiles fallback |
| `create_senior_auth_user()` | **DEFINER** | **Granted to anon — CRITICAL** |

---

## Web Application Audit (Next.js)

### Pages (22 total)

| Route | Auth Guard | Notes |
|-------|-----------|-------|
| `/` | Public | Landing page |
| `/login` | Public | No rate limiting, no CSRF |
| `/dashboard` | **Client-side only** | No server middleware protection |
| `/directory` | **Client-side only** | Senior PII exposed |
| `/requests` | **Client-side only** | — |
| `/timeline` | **Client-side only** | — |
| `/quarterly` | **Client-side only** | — |
| `/reports` | **Client-side only** | Should be admin-only |
| `/inventory` | **Client-side only** | Should be admin-only |
| `/philhealth` | **Client-side only** | Should be admin-only |
| `/staff` | **Client-side only** | Should be admin-only |
| `/settings` | **Client-side only** | — |
| `/verifications` | **Client-side only** | — |
| `/complaints` | **Client-side only** | — |
| `/endorsements` | **Client-side only** | — |
| `/barangay/*` | **Client-side only** | Barangay worker portal |

### API Route Security Matrix

| Route | Method | Auth Check | Input Validation | CSRF | Rate Limit |
|-------|--------|------------|------------------|------|------------|
| `/api/auth/callback` | GET | None | Code param only | No | No |
| `/api/upload` | POST | **NONE** | File existence only | **CORS: `*`** | No |
| `/api/revalidate` | POST | Bearer + role | Paths array | No | No |
| `/api/inventory` | GET | **NONE** | N/A | No | No |
| `/api/inventory` | POST | **NONE** | **NONE** (raw body) | No | No |
| `/api/inventory/[id]` | PATCH | **NONE** | **NONE** (...body) | No | No |
| `/api/complaints` | GET | **Stubbed cookies** | N/A | No | No |
| `/api/complaints` | POST | **Stubbed cookies** | FormData only | No | No |
| `/api/complaints/[id]` | PATCH | Cookie (no verify) | body.status only | No | No |
| `/api/quarterly/generate` | POST | **Stubbed cookies** | **NONE** | No | No |
| `/api/philhealth/export` | GET | **Stubbed cookies** | Barangay param | No | No |
| `/api/bedridden/validate` | POST | Session check | id, action | No | No |

### Critical Web Issues

#### WEB-C1: Middleware Not Active
- `web/src/proxy.ts` contains middleware logic but **there is no `middleware.ts` file**
- All route-level auth protection defined in proxy.ts is **non-functional**
- Dashboard, settings, staff, reports, verifications pages have **no server-side auth guards**
- Only client-side `RoleGuard` / `useAuthRole` exist, which are trivially bypassable

#### WEB-C2: Unauthenticated API Endpoints
- `POST /api/upload` — zero auth, CORS `*`, anyone can upload files to Cloudinary
- `POST /api/inventory` — no auth, raw body mass assignment (`.insert([body])`)
- `PATCH /api/inventory/[id]` — no auth, unrestricted update (`...body`)
- `GET /api/inventory` — no auth, anyone can enumerate all ID inventory records

#### WEB-C3: Stubbed Cookie Handlers Bypass RLS
Multiple API routes use stubbed cookie handlers that always return `undefined`:
```typescript
cookies: {
  get(_name: string) { return undefined; },
  set() {},
  remove() {},
}
```
This means **no session cookies are read**, effectively bypassing all Supabase RLS.

Affected routes: `/api/complaints`, `/api/quarterly/generate`, `/api/philhealth/export`

#### WEB-C4: PhilHealth Export Exposes All PII
- `GET /api/philhealth/export` returns all senior citizens' PII with no authentication
- Exposes: full names, birthdates, sex, civil status, complete addresses, government IDs (PhilHealth, GSIS, SSS, TIN), monthly income, contact numbers, email

### High Web Issues

#### WEB-H1: CSRF Protection Never Applied
- `csrf.ts` implements `csrfGuard()` and `validateOrigin()` but they are **never imported or called** anywhere
- All server actions and API routes are unprotected against CSRF

#### WEB-H2: Rate Limiter Never Applied
- `rate-limiter.ts` exists but is **never imported or used**
- No brute-force protection on login or any endpoint

#### WEB-H3: Insecure Password Generation
- Staff passwords generated with `Math.random().toString(36).slice(-12)` — not cryptographically secure
- Plaintext passwords sent via email (`send-email.ts`)

#### WEB-H4: Mass Assignment Vulnerability
- `POST /api/inventory` inserts raw request body directly
- `PATCH /api/inventory/[id]` spreads entire body into update
- `updateSeniorSchema.passthrough()` allows arbitrary fields through

#### WEB-H5: Open Redirect in Auth Callback
- `/api/auth/callback` uses `next` query parameter without whitelist validation

### Code Quality Issues

| Issue | Detail |
|-------|--------|
| Duplicate `parseFullName()` | Two versions with **different behavior** — `philhealth/export/route.ts` (complex) vs `actions/philhealth.ts` (simple) |
| Duplicate quarterly report generation | API route vs server action use **different date logic** |
| Duplicate Supabase client creation | Every API route inlines cookie handlers instead of using shared factory |
| Duplicate SMTP setup | `send-email.ts` and `notifications.ts` |
| Duplicate bedridden validation | API route vs server action |
| Inconsistent auth checks | Some actions check `getUser()`, others don't; RBAC checks applied inconsistently |
| Supabase error messages leaked | `error.message` returned directly to clients, may expose table/column names |
| No error boundaries | No `error.tsx` files in any route segment |
| Silent audit log failures | Audit log insertions wrapped in try/catch that only `console.error` |
| No env var validation | All usages use `process.env.X!` with no runtime checks |

---

## Mobile Application Audit (Expo)

### Screens (11 total)

| Screen | Auth | Notes |
|--------|------|-------|
| `index.tsx` | Session check | Redirect only |
| `login.tsx` | Public | Email + password |
| `(tabs)/dashboard` | AuthGate (client) | Stats + recent endorsements |
| `(tabs)/register` | AuthGate (client) | New senior registration |
| `(tabs)/directory` | AuthGate (client) | Searchable senior list |
| `(tabs)/endorsements` | AuthGate (client) | Submit + view endorsements |
| `(tabs)/programs` | AuthGate (client) | News feed |
| `(tabs)/settings` | AuthGate (client) | Profile + sign out |
| `senior-detail` | AuthGate (client) | Edit senior details |
| `force-password-change` | Inline render | Not a proper route |
| `+not-found` | N/A | 404 fallback |

### Critical Mobile Issues

#### MOB-C1: `.env` Not in `.gitignore`
- `mobile-parasocial/.gitignore` does NOT exclude `.env`
- Contains Supabase URL and anon key in plaintext
- Could be accidentally committed to version control

#### MOB-C2: Session Tokens in Unencrypted Storage
- Supabase session tokens stored in **AsyncStorage** (unencrypted, filesystem-based)
- Zero usage of `expo-secure-store` or any encrypted storage
- Root/jailbreak access or backup extraction can read session tokens
- **Recommendation:** Migrate to `expo-secure-store` (Android Keystore / iOS Keychain)

### High Mobile Issues

#### MOB-H1: Hardcoded Credentials as Fallbacks
- Supabase anon key hardcoded in 3 files as fallback:
  - `src/lib/supabase.ts` (line 7)
  - `app/force-password-change.tsx` (lines 9-10)
  - `.env` (plaintext)
- Key cannot be rotated without releasing a new app version
- `force-password-change.tsx` duplicates client config instead of importing from `supabase.ts`

#### MOB-H2: Access Token Sent Over HTTP Fallback
- `senior-detail.tsx` defaults `EXPO_PUBLIC_WEB_URL` to `http://localhost:3000`
- If not configured, access token sent over plain HTTP
- **Recommendation:** Remove HTTP fallback, require HTTPS

### Medium Mobile Issues

| Issue | Detail |
|-------|--------|
| No upload authentication | File uploads to `/api/upload` send **no auth headers** |
| Weak password policy | Only 6-char minimum, no complexity requirements |
| No certificate pinning | MITM possible on compromised networks |
| No pagination | `directory.tsx` and `programs.tsx` load all records at once |
| No global error boundary | App crashes with no recovery on render errors |
| No error logging | No Sentry, Bugsnag, or similar service |

### Mobile Code Quality Issues

| Issue | Detail |
|-------|--------|
| Duplicated constants | `CIVIL_STATUS`, `CLASSIFICATIONS`, etc. in both `register.tsx` and `senior-detail.tsx` |
| Duplicated `Picker` component | Identical implementations in two screens |
| No custom hooks | Auth, offline, cache patterns inlined in every component |
| `any` types | `senior-detail.tsx` and `endorsements.tsx` use `useState<any>` |
| Weak registration ID | `Math.random()` with only 9,000 possible values per day |
| Empty catch blocks | 20+ silent error swallowing across the app |
| No shared auth state | Each screen independently calls `supabase.auth.getSession()` |
| Cache fragmentation | Different cache keys with no invalidation strategy |
| Hardcoded upload URLs | `osca-link.vercel.app/api/upload` in `endorsements.tsx` and `settings.tsx` |

---

## Security Audit

### CRITICAL Findings

| ID | Category | Finding |
|----|----------|---------|
| C-1 | Secret Exposure | `web/.env` tracked in git with live Cloudinary API key/secret and Resend API key |
| C-2 | Secret Exposure | `web/.env.local` was committed to git history (commit `e2b6bd5`) with SUPABASE_SERVICE_ROLE_KEY, SMTP credentials, Notion token |
| C-3 | Auth Bypass | `GET /api/philhealth/export` has no authentication, exposes all senior PII |
| C-4 | Hardcoded Secrets | SQL files contain hardcoded passwords: `'password123'` and `'OSCA_Secure_2024'` |
| C-5 | Database Security | `create_senior_auth_user` function granted to `anon` — unauthenticated account creation |
| C-6 | Database Security | `get_senior_self` allows reading any senior's full PII by UUID |
| C-7 | Database Security | `verify_senior_login` has no brute-force protection (birthdate is guessable) |
| C-8 | Database Security | `register_senior_resident` has no rate limiting or verification |

### HIGH Findings

| ID | Category | Finding |
|----|----------|---------|
| H-1 | Missing Controls | No security headers in Next.js config (CSP, HSTS, X-Frame-Options, etc.) |
| H-2 | Missing Controls | CSRF guard implemented but never applied anywhere |
| H-3 | Missing Controls | No Next.js middleware file — route protections from `proxy.ts` are inactive |
| H-4 | Missing Controls | Rate limiter implemented but never applied anywhere |
| H-5 | Access Control | Overly permissive RLS policies (`USING(true)`, `WITH CHECK(true)`, anon access) |
| H-6 | Auth Config | Weak Supabase auth settings (no email verification, 6-char passwords, no MFA, no session timeouts) |
| H-7 | Auth Config | Mayor role escalated from read-only to full CRUD without documented justification |
| H-8 | Info Disclosure | Profiles table readable by all authenticated users (staff PII exposure) |
| H-9 | Mobile Security | Session tokens stored in unencrypted AsyncStorage |

### MEDIUM Findings

| ID | Category | Finding |
|----|----------|---------|
| M-1 | Secret Exposure | `mobile-parasocial/.gitignore` missing `.env` exclusion |
| M-2 | Info Disclosure | Cloudinary upload preset hardcoded in client bundle |
| M-3 | Info Disclosure | Plaintext passwords sent via email |
| M-4 | Hygiene | 8+ ad-hoc SQL files in `web/` root with hardcoded passwords and dashboard URLs |
| M-5 | Privilege Escalation | SECURITY DEFINER functions lack `REVOKE EXECUTE FROM public/anon` |
| M-6 | Data Integrity | `government_links` has no write RLS policies (effectively immutable from client) |
| M-7 | Data Integrity | Sector-locked INSERT allows any barangay when user's barangay is NULL |
| M-8 | Audit Integrity | service_role can INSERT into audit_logs (tampering risk) |

### LOW Findings

| ID | Category | Finding |
|----|----------|---------|
| L-1 | Hygiene | Test files use `'password123'` |
| L-2 | Hygiene | Mock data SQL in migrations directory |
| L-3 | Data Integrity | Deprecated `emergency_contact` column not removed |
| L-4 | Data Integrity | No `updated_at` auto-update triggers on any table |
| L-5 | Data Integrity | Duplicate timestamp `20260525000001` on two migration files |
| L-6 | Code Quality | Unused `RESEND_API_KEY` and Notion credentials in env files |
| L-7 | Code Quality | Hardcoded `00000000-0000-0000-0000-000000000000` instance_id in auth.users INSERT |

---

## Consolidated Findings by Severity

| Severity | Count | Breakdown |
|----------|-------|-----------|
| **CRITICAL** | 8 | 4 secret exposure, 1 auth bypass API, 3 database security |
| **HIGH** | 9 | 4 missing controls, 2 auth config, 2 access control, 1 mobile security |
| **MEDIUM** | 8 | 2 info disclosure, 2 data integrity, 1 privilege escalation, 1 hygiene, 1 audit integrity, 1 secret exposure |
| **LOW** | 7 | 4 data integrity, 3 code quality/hygiene |

---

## Immediate Action Priorities

### Phase 1 — Emergency (Within 24 hours)

1. **Rotate ALL exposed credentials**
   - Supabase service role key (in git history)
   - Cloudinary API key/secret (in tracked `web/.env`)
   - Resend API key (in tracked `web/.env`)
   - SMTP credentials (in git history)
   - Notion token (in git history)

2. **Untrack `web/.env` from git**
   ```bash
   git rm --cached web/.env
   ```
   Uncomment `.env*` exclusion in root `.gitignore`

3. **Scrub git history**
   - Use `git filter-repo` or BFG Repo-Cleaner to remove committed secrets

4. **Add `.env*` to `mobile-parasocial/.gitignore`**

5. **Add authentication to `/api/philhealth/export`**
   - This endpoint currently exposes all senior PII to the internet

### Phase 2 — Critical Fixes (Within 1 week)

6. **Create proper `middleware.ts`**
   - Rename/convert `proxy.ts` to a valid Next.js middleware file
   - This activates all route-level auth protection

7. **Add authentication to ALL unauthenticated API routes**
   - `/api/upload`, `/api/inventory` (GET/POST), `/api/inventory/[id]` (PATCH)

8. **Fix stubbed cookie handlers**
   - Replace all inline stubbed cookie handlers with the shared `@/lib/supabase-server` factory

9. **Revoke `anon` access to SECURITY DEFINER functions**
   ```sql
   REVOKE EXECUTE ON FUNCTION create_senior_auth_user(...) FROM anon;
   REVOKE EXECUTE ON FUNCTION register_senior_resident(...) FROM anon;
   REVOKE EXECUTE ON FUNCTION get_senior_self(...) FROM anon;
   REVOKE EXECUTE ON FUNCTION verify_senior_login(...) FROM anon;
   ```

10. **Add security headers to `next.config.ts`**
    - CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Phase 3 — Hardening (Within 2 weeks)

11. **Apply CSRF protection** — Wire `csrfGuard()` into server actions and API routes
12. **Apply rate limiting** — Wire `rate-limiter.ts` into login and sensitive endpoints
13. **Fix RLS policies** — Remove all `USING (true)` and `WITH CHECK (true)` policies, enforce role + barangay scoping
14. **Harden Supabase auth config** — Enable email confirmations, increase min password length, add MFA for admins
15. **Migrate mobile session storage** — Replace AsyncStorage with expo-secure-store
16. **Remove hardcoded fallback credentials** — Fail loudly if env vars are missing
17. **Remove hardcoded passwords from SQL files** — Use generated passwords or secure setup flows
18. **Add input validation** — Fix mass assignment in inventory routes, validate `updateSeniorSchema` without `.passthrough()`

### Phase 4 — Code Quality (Ongoing)

19. **Consolidate duplicate code** — `parseFullName()`, quarterly generation, Supabase client creation, bedridden validation
20. **Add error boundaries** — `error.tsx` files for route segments
21. **Add mobile custom hooks** — `useAuth()`, `useOffline()`, `useCachedQuery()`
22. **Add pagination** — Mobile directory and programs screens
23. **Add global error logging** — Sentry or similar
24. **Clean up ad-hoc SQL files** — Move to proper migrations or remove
25. **Fix migration ordering** — Resolve duplicate timestamp, consolidate RLS chain
