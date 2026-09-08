# OSCALink Institutional Testing Protocol

This document contains the official verification prompt for 'opencode' to perform a final system-wide audit of the OSCALink platform.

## 🚀 Opencode System Audit Prompt

```markdown
# OSCALink Full-System Audit & Verification Protocol

**Objective**: Perform a comprehensive, institutional-grade verification of the OSCALink Portal across all technical layers (Auth, RLS, Integrations, and UI).

**Instructions**:
1. **Authentication Boundary Audit**:
   - Verify that `src/lib/supabase.ts` (Client) and `src/lib/supabase-server.ts` (Server) are functioning correctly.
   - Test the Login (Client Component) and Dashboard (Server Component) for session persistence.
   - Confirm that Logout terminates the session across both layers.

2. **Identity & RLS Integrity**:
   - Log in as 'admin@oscalink.gov'.
   - Verify that the 'Settings' page displays the correct name, email, and 'CITY-WIDE (ADMIN)' status.
    - AUDIT RLS: Ensure that a Barangay Official account ONLY perceives records from their own barangay.

3. **Core Module Stress Test**:
   - **Seniors Registry**: Create a test senior citizen, upload a document (Cloudinary), and toggle their status.
   - **Assistance Queue**: Update a 'Medical Support' request from 'Pending' to 'Released'. Verify that a 'Resend' email trigger is logged in the console.
   - **Timeline**: Confirm the 'Appointments' page renders the visual timeline correctly.
   - **Reports**: Generate a PDF/CSV summary of the city-wide statistics and verify the file content.

4. **Build & Error Scan**:
   - Run `npm run build` locally to confirm zero 'next/headers' or 'Module not found' conflicts.
   - Check the browser console for any silent 400/500 errors in the Network tab during data fetching.

5. **Final Hand-off Report**:
   - List any identified 'Backlogs' or edge-case UI improvements.
   - Confirm that all components use the premium Glassmorphism design system.
```

## 🛠 Calibration Checklist
The following institutional checkpoints must be verified:

### 1. Authentication Layer
- [ ] `createServerClient` handles cookies correctly in `supabase-server.ts`.
- [ ] `createBrowserClient` remains safe for Client Components in `supabase.ts`.

### 2. Functional Modules
- [ ] **Settings**: Displays real-time data for Name, Role, and Barangay.
- [ ] **Directory**: Table filters by barangay are correctly applied via RLS.
- [ ] **Assistance**: Status updates trigger notification logic.

### 3. Visual Standard
- [ ] Typography: Inter (Body), Outfit/Headline (Headers).
- [ ] Aesthetics: Glassmorphism shadows (0 0 15px rgba(59,130,246,0.15)).
