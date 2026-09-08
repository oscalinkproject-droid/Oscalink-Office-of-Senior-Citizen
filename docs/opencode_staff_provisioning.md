# 🛡️ Opencode Directive: Institutional Staff Provisioning

**Executive Directive**: This document contains the strict instructions for finalizing the OSCALink Staff Management Console. Follow these instructions precisely to avoid disrupting the security layer.

---

## 📊 1. System Context & Status
- **Goal**: Enable City Administrators to create 'Barangay Official' accounts.
- **Current State**: 
  - `createAdminClient` is implemented in `lib/supabase-server.ts`.
  - `createStaff` action is implemented in `actions/users.ts`.
  - `StaffForm` component is implemented in `ui/staff-form.tsx`.
  - UI is integrated into `settings/page.tsx` (Admin-only view).

---

## 🛠️ 2. Critical Implementation Guardrails

### A. The Diagnostic Mode (Missing Key)
> [!IMPORTANT]
> The platform is currently in **Diagnostic Mode**. The `SUPABASE_SERVICE_ROLE_KEY` is not yet in `.env.local`. Do NOT attempt to "fix" this by generating a fake key. The system is designed to show a specific error message if the key is missing.

### B. Security Isolation
- Ensure the `Staff Management Console` in `settings/page.tsx` remains wrapped in the `role === 'admin'` check.
- Never expose the `createAdminClient` or the `Service Role` key to any client-side components.

---

## 📋 3. Task List for Opencode
1. **[UI Polish]**: Enhance the `StaffForm.tsx` with better validation for email formats.
2. **[Feedback Loop]**: Update the `success` message in `StaffForm.tsx` to include an "Email Sent" simulation (until the real mailer is connected).
3. **[Barangay Sync]**: Ensure the `barangays` list in the `SettingsPage` matches the census registry in `seniors.ts`.

## 🛑 4. What NOT to do
- **Do not** modify `lib/supabase.ts` (the browser client).
- **Do not** add new external dependencies without a security audit.
- **Do not** remove the `Diagnostic Check` from `actions/users.ts`.

---
*Signed, Antigravity Institutional Architect*
