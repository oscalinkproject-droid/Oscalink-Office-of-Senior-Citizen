# OSCALink PSW Mobile App — Comprehensive Audit Report

**Generated:** 2026-05-25  
**App Package:** `oscalink-barangay` / `com.oscalink.barangay`  
**App Name:** "Para Social"  
**Framework:** Expo SDK 54 + React Native 0.81 + Expo Router 6  
**Target Users:** Para-Social Workers, Barangay Officials  
**Auth Provider:** Supabase Auth (email/password)  
**Database:** Supabase (PostgreSQL)  
**File Uploads:** Cloudinary via proxy endpoint on the web app  
**Offline Support:** AsyncStorage for caching + offline queues

---

## 1. Complete File Structure

```
mobile-parasocial/
├── app/                              # Expo Router pages
│   ├── _layout.tsx                   # Root: auth gate, session, password change
│   ├── index.tsx                     # Entry: redirects to login or dashboard
│   ├── login.tsx                     # Email/password login
│   ├── force-password-change.tsx     # First-login password reset
│   ├── senior-detail.tsx             # View/edit senior info (param: ?id=)
│   ├── +not-found.tsx                # 404
│   └── (tabs)/                       # Tab navigator
│       ├── _layout.tsx               # 6-tab config
│       ├── dashboard.tsx             # Main home with stats
│       ├── directory.tsx             # Senior directory with search
│       ├── endorsements.tsx          # PSW endorsements with file uploads
│       ├── register.tsx              # New senior registration
│       ├── programs.tsx              # News & programs feed
│       └── settings.tsx              # Profile & sign out
├── src/
│   ├── components/
│   │   └── NetworkStatus.tsx         # Online/offline + sync badge
│   └── lib/
│       ├── cache.ts                  # AsyncStorage TTL cache
│       ├── constants.ts              # Colors, roles, barangays, endorsement types
│       ├── supabase.ts               # Supabase client config
│       └── sync.ts                   # Offline sync queues
├── android/                          # Android native project
├── assets/                           # Icons & splash
└── Config files: package.json, app.json, tsconfig.json, babel.config.js, metro.config.js
```

---

## 2. Authentication Flow

### Steps:
1. **Entry (`index.tsx`)** — checks `supabase.auth.getSession()`, redirects to `/login` or `/(tabs)/dashboard`
2. **Login (`login.tsx`)** — email/password via `supabase.auth.signInWithPassword()`
3. **Root layout (`_layout.tsx`)** — wraps everything in `<AuthGate>`:
   - On session detected, queries `profiles.first_login`
   - If `true` → renders `<ForcePasswordChangeScreen>` (blocks all navigation)
   - If role not in `ALLOWED_MOBILE_ROLES` (`para_social_worker`, `blgu_official`, `official`) → shows "Access Denied"
   - Session persisted via AsyncStorage with `autoRefreshToken: true`, `persistSession: true`
4. **Force password change** — sends new password to Supabase Auth REST API (`PUT /auth/v1/user`), then sets `profiles.first_login = false`

### Session Management:
- Persisted via AsyncStorage (Supabase auth `storage` config)
- `autoRefreshToken: true`, `persistSession: true`
- `onAuthStateChange` subscription in root layout keeps session state in sync
- Sign out: `supabase.auth.signOut()` → `router.replace('/login')`

### Role-Based Access:
- `ALLOWED_MOBILE_ROLES = ['para_social_worker', 'blgu_official', 'official']`
- User role extracted from `session.user.user_metadata.role`
- If role not in allowed list, shows Access Denied screen

---

## 3. Screen-by-Screen Breakdown

### 3.1 Dashboard (`/(tabs)/dashboard`)

| Aspect | Details |
|--------|---------|
| **Route** | `/dashboard` (tab 1) |
| **Purpose** | Main home screen with key metrics and quick actions |
| **Data fetched** | `profiles` (name, avatar), `seniors` (counts by barangay/status), `endorsements` (last 3) |
| **Displays** | User greeting with barangay/role badge, profile picture, 4 stat cards (total seniors, pending, active, endorsements), quick action grid (Register, Directory, Endorse, Programs), recent endorsements list |
| **Offline** | Caches user profile + dashboard stats for 24h, falls back on network failure |

### 3.2 Register (`/(tabs)/register`)

| Aspect | Details |
|--------|---------|
| **Route** | `/register` (tab 2) |
| **Purpose** | Register a new senior citizen |
| **Form fields (22)** | Full name, birthdate, sex, civil status, place of birth, phone, email, house no., street, barangay, city, province, zip code, registration ID (auto-generated: `OSC-YYYYMMDD-XXXX`), OSCA ID, classification, monthly income, income source, education level, employment status, occupation, blood type, emergency contact name + phone |
| **Validation** | Name required, age ≥ 60, phone must be 09XXXXXXXXX |
| **Submit** | Inserts into `seniors` table with `status: 'Pending Barangay'` |

### 3.3 Directory (`/(tabs)/directory`)

| Aspect | Details |
|--------|---------|
| **Route** | `/directory` (tab 3) |
| **Purpose** | Browse and search senior citizens in the barangay |
| **Data fetched** | All `seniors` filtered by user's barangay |
| **Features** | Search bar (name + registration ID), pull-to-refresh, tap to navigate to `/senior-detail` |
| **Offline** | Cached directory data |

### 3.4 Endorsements (`/(tabs)/endorsements`)

| Aspect | Details |
|--------|---------|
| **Route** | `/endorsements` (tab 4) |
| **Purpose** | Submit PSW endorsements with supporting documents |
| **Form inputs** | Senior search/select (dropdown), endorsement type picker (6 types), notes text area, 3 file uploads, recommended amount (numeric) |
| **Endorsement types** | Pension Application, New Registration, ID Issuance, Assistance Request, Bedridden Verification, Other |
| **File uploads** | Case Study Report, Clearance Certificate (Certificate of Indigency/Residency), President Countersignature |
| **Upload flow** | `expo-image-picker` → FormData → POST to Cloudinary proxy → stores returned URL |
| **Recommended Amount** | Numeric input (₱) for PSW-assessed budget |
| **Submission** | Always saves to local `pending_endorsements` queue first, then syncs to Supabase |
| **History** | FlatList merging pending (yellow dashed border) + remote items, sorted by date desc |
| **Sync** | "Sync Now" button + auto-sync on mount |

### 3.5 Programs (`/(tabs)/programs`)

| Aspect | Details |
|--------|---------|
| **Route** | `/programs` (tab 5) |
| **Purpose** | View news and programs feed |
| **Data fetched** | `news` table where `is_published = true`, ordered by `publish_date` desc |
| **Displays** | Cards with title, content (truncated 4 lines), category badge (News=blue, Activity=green, Announcement=amber, Alert=red), date |

### 3.6 Settings (`/(tabs)/settings`)

| Aspect | Details |
|--------|---------|
| **Route** | `/settings` (tab 6) |
| **Purpose** | View/edit profile and sign out |
| **Displays** | Profile picture (with edit overlay), full name, barangay, email |
| **Profile picture upload** | `expo-image-picker` → Cloudinary → `profiles.upsert({profile_picture: url})` |
| **Offline** | Caches settings data |
| **Sign out** | Calls `supabase.auth.signOut()` |

### 3.7 Senior Detail (`/senior-detail?id=`)

| Aspect | Details |
|--------|---------|
| **Route** | `/senior-detail` (stack screen, param: `?id=`) |
| **Purpose** | View and edit a senior's full profile |
| **Form fields** | Same 22 fields as Register screen |
| **Sections** | Personal Info, Contact Details, Address, Government IDs, Classification & Income, Education & Employment, Health, Emergency Contact, System Info |
| **Offline sync** | If no connectivity, saves update via `addPendingSeniorUpdate()` → synced later |
| **Extra buttons** | "Endorse Senior Citizen" (navigates to endorsements with pre-filled senior) |

---

## 4. Supabase Database Interactions

### 4.1 Tables Accessed

| Table | Operations | Used By |
|-------|-----------|---------|
| `profiles` | SELECT (first_login, profile_picture), UPDATE (first_login), UPSERT (profile_picture) | Root layout, force-password-change, dashboard, settings |
| `seniors` | SELECT (by id, by barangay, counts), INSERT (register), UPDATE (edit) | Register, directory, senior-detail, dashboard |
| `endorsements` | SELECT (by barangay, recent 3), INSERT (sync) | Dashboard, endorsements, sync.ts |
| `news` | SELECT (is_published = true) | Programs |

### 4.2 Query Patterns

**Auth:**
- `supabase.auth.getSession()` — used everywhere
- `supabase.auth.getUser()` — refresh user data
- `supabase.auth.signInWithPassword({email, password})` — login
- `supabase.auth.signOut()` — logout
- `supabase.auth.onAuthStateChange(callback)` — subscribe to auth changes

**Senior queries:**
- `supabase.from('seniors').select('*').eq('id', id).single()` — get one senior
- `supabase.from('seniors').select('full_name').ilike('full_name', \`%${search}%\`).eq('barangay', b).limit(5)` — search seniors
- `supabase.from('seniors').select('id, full_name, registration_id, age, status, contact_number, barangay').eq('barangay', b).order('full_name', {ascending: true})` — directory
- `supabase.from('seniors').insert({...})` — register
- `supabase.from('seniors').update({...}).eq('id', id)` — update
- `supabase.from('seniors').select('*', {count: 'exact', head: true}).eq('barangay', b)` — counts

**Endorsement queries:**
- `supabase.from('endorsements').select('id, endorsement_type, status, created_at, senior_id, seniors(full_name)').eq('barangay', b).order('created_at', {ascending: false})` — history
- `supabase.from('endorsements').insert({...})` — sync pending

**Profile queries:**
- `supabase.from('profiles').select('first_login').eq('id', userId).single()` — check first login flag
- `supabase.from('profiles').update({first_login: false}).eq('id', userId)` — clear first login
- `supabase.from('profiles').upsert({id: userId, profile_picture: url})` — save avatar

**News queries:**
- `supabase.from('news').select('id, title, content, category, publish_date').eq('is_published', true).order('publish_date', {ascending: false})` — programs feed

---

## 5. Offline Architecture

### 5.1 Three Layers

**1. Cache Layer** (`src/lib/cache.ts`)
- Generic TTL-based cache over AsyncStorage (24h default)
- Keys: `cache:user`, `cache:dashboard`, `cache:directory`, `cache:senior:{id}`, `cache:endorsements`, `cache:settings`

**2. Endorsement Queue** (`src/lib/sync.ts`)
- `pending_endorsements` — array of `PendingEndorsement` objects in AsyncStorage
- Every endorsement saved here first, then synced to Supabase
- Fields: `local_id`, `endorsement_type`, `notes`, `barangay`, `submitted_by`, `status`, `created_at`, `senior_id`, `senior_name`, `case_study_report_url`, `clearance_cert_url`, `president_countersignature_url`, `recommended_amount`

**3. Senior Update Queue** (`src/lib/sync.ts`)
- `pending_senior_updates` — deduplicated per senior (only latest kept)
- Synced via `seniors.update()` when online

### 5.2 Sync Trigger Points
- On app mount (`_layout.tsx` useEffect)
- On endorsement submission
- Manual "Sync Now" button
- NetworkStatus component (pings every 15s)

---

## 6. File Uploads (Cloudinary)

| Context | Endpoint | Folder | File Naming | Storage |
|---------|----------|--------|-------------|---------|
| Profile picture | `https://osca-link.vercel.app/api/upload` | `oscalink/avatars` | `avatar_{userId}` | `profiles.profile_picture` |
| Case Study Report | Same endpoint | `oscalink/endorsements` | `case_study_report_{userId}_{timestamp}` | `endorsements.case_study_report_url` |
| Clearance Certificate | Same endpoint | `oscalink/endorsements` | `clearance_cert_{userId}_{timestamp}` | `endorsements.clearance_cert_url` |
| President Countersignature | Same endpoint | `oscalink/endorsements` | `president_countersignature_{userId}_{timestamp}` | `endorsements.president_countersignature_url` |

**Upload flow:** `expo-image-picker` → FormData → Cloudinary proxy endpoint → returned `data.url` stored in app state → synced to Supabase

---

## 7. Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#006837` (green) | Brand, buttons, active states |
| `secondary` | `#FDB913` (gold) | Accents |
| `tertiary` | `#CE1126` (red) | Errors, alerts |
| `background` | `#F5F5F5` | Page backgrounds |
| `surface` | `#FFFFFF` | Card backgrounds |
| `text` | `#1A1A1A` | Primary text |
| `textSecondary` | `#757575` | Secondary/placeholder text |
| `success` | `#10B981` (green) | Success states |
| `warning` | `#F59E0B` (amber) | Pending states |
| `outline` | `#E5E5E5` | Borders |

### Typography
System fonts, sizes 10–24px, weights 400–700

---

## 8. Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ~54.0.33 | Framework |
| `expo-router` | ~6.0.23 | File-based navigation |
| `@supabase/supabase-js` | ^2.104.1 | Database + Auth |
| `expo-image-picker` | ~17.0.11 | Camera/gallery for uploads |
| `@react-native-async-storage/async-storage` | ^2.2.0 | Local persistence |
| `@react-native-community/netinfo` | 11.4.1 | Connectivity detection |
| `react-native-reanimated` | ~4.1.1 | Animations |
| `react-native-safe-area-context` | ~5.6.0 | Safe area insets |

**No global state library** — each screen manages its own `useState`/`useEffect`, no Redux/Zustand/Context.

---

## 9. Complete Input Field Inventory

| Screen | Input Type | Count | Fields |
|--------|-----------|-------|--------|
| Login | Text | 2 | Email, password |
| Force password change | Text (secure) | 2 | New password, confirm |
| Register | Text, Picker, Date | 22 | Full name, birthdate, sex, civil status, place of birth, phone, email, house no., street, barangay, city, province, zip, registration ID, OSCA ID, classification, monthly income, income source, education, employment, occupation, blood type, emergency name, emergency phone |
| Senior Detail | Text, Picker, Date | 22 | Same as Register |
| Endorsements | Search, Picker, Text, File Pickers (3), Number | 7 | Senior search, endorsement type, notes, case study report, clearance cert, countersignature, recommended amount |
| Settings | File picker | 1 | Profile picture |

**Total distinct input fields across all screens:** ~35

---

## 10. Exported Libraries (src/lib/)

### `src/lib/supabase.ts`
**Exports:** `supabase` (configured Supabase client)
- URL: `https://qbdbxwcsvitlmikmdhso.supabase.co`
- Auth storage: AsyncStorage (native) / localStorage (web)

### `src/lib/constants.ts`
**Exports:** `COTABATO_BARANGAYS`, `ENDORSEMENT_TYPES`, `ROLES`, `ROLE_LEVELS`, `ALLOWED_MOBILE_ROLES`, `PARTNERSHIP_STEPS`, `SENIOR_STATUS_FLOW`, `COLORS`

### `src/lib/cache.ts`
**Exports:** `getCache<T>`, `setCache<T>`, `clearCache`
- TTL-based AsyncStorage wrapper (default 24h TTL)

### `src/lib/sync.ts`
**Exports:** `PendingEndorsement`, `PendingSeniorUpdate`, `getPendingSeniorUpdates`, `addPendingSeniorUpdate`, `syncPendingSeniorUpdates`, `getPendingEndorsements`, `addPendingEndorsement`, `syncPendingEndorsements`
- Manages offline queues in AsyncStorage

### `src/components/NetworkStatus.tsx`
**Exports:** `NetworkStatus` (default)
- Floating badge: green "Online" / red "Offline"
- Sync button when pending items exist
