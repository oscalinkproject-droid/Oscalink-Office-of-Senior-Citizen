# 🛡️ Opencode Directive: Staff Management Module Migration

**Directive**: Move the recently implemented Staff Management logic from the Settings page into a dedicated, standalone **"Staff"** module in the sidebar.

---

### 🚀 1. NEW MODULE: STAFF MANAGEMENT
- **Route**: `src/app/staff/page.tsx`
- **sidebar**: Add a new navigation item: **"Staff Management"** (Icon: `shield_person`).
- **Access Control**: This module must be strictly hidden from `Barangay Official` roles. Only `admin` can see this link in the sidebar and access the route.

### 🛠️ 2. MIGRATION STEPS
1. **Move Registry**: Relocate the `StaffForm` and its associated list from `src/app/settings/page.tsx` to the new `src/app/staff/page.tsx`.
2. **Dashboard Integration**: Use the `DashboardLayout` for the new page.
3. **Registry Enhancement**:
   - The staff list should now be a primary data table.
   - Show: Name, Email, Assigned Barangay, and Status (Active/Inactive).

### 📋 3. ESSENTIALS & BEST PRACTICES
- **Data Fetching**: Use `getStaffList()` from `actions/users.ts` to populate the table.
- **Administrative UI**: Keep the glassmorphism aesthetic. Add a "Staff Summary" metric card at the top (Total Officials | Empty Barangays).
- **Security**: Double-check that the `createServerClient` in the new page verifies the user's role before rendering the content.

### 🛑 4. WHAT NOT TO DO
- **Do not** change the `actions/users.ts` internal logic. It is already calibrated for the municipal registry.
- **Do not** break the existing `Settings` page; simply remove the Staff Console section once the migration is confirmed.

---
*Signed, Antigravity Institutional Architect*
