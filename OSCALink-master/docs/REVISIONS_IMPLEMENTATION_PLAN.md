# OSCALink Revisions — Implementation Plan

Source: client revision requirements (web, mobile, UI/UX, database, QR/ID, security, data management, ID numbering, form dynamics, architecture).

Status: in progress. Implemented in waves; each wave is independently deployable and verified via `npm run lint` / `npm run build`.

---

## Wave 1 — Foundations (done first, unblocks everything)

### 1.1 Database schema
- [x] Extend `seniors.status` CHECK to include `Inactive`, `Disqualified`, `Cancelled` (currently `Active, Pending, Pending Barangay, Pending OSCA, Archived, Deceased, Transferred`).
- [x] Add decision columns to `seniors`: `decision_reason`, `decision_note`, `disapproved_by`, `disapproved_at`, `disqualified_by`, `disqualified_at`.
- [x] Add `pensioner_type` (`subsidized | government | private`) to `seniors`.
- [x] Add `id_number` + `id_issue_date` to `seniors` (official ID number, minted at approval).
- [x] Add `notification_category` (`announcement | status_update`) to `notifications`.
- [x] Add `id_sequences(year, last_sequence)` table + `next_senior_id_number()` RPC (atomic counter, resets annually).
- [x] Dedup: partial unique index on `seniors (full_name, birthdate)` excluding `Cancelled`/`Transferred` (returnees can re-register).

### 1.2 Role taxonomy (single source of truth)
- [x] Add `super_admin`, `admin` (Admin Staff) to `profiles.role` CHECK.
- [x] Update `web/src/lib/constants.ts` `USER_ROLES` and `rbac.ts` (Super Admin / OSCA Head / Admin Staff / Senior Citizen).
- [x] Align `proxy.ts` to import role sets from `rbac.ts` instead of hardcoding.

### 1.3 Status vocabulary
- [x] `SENIOR_STATUSES` = `Pending, Active, Inactive, Deceased, Transferred, Disqualified, Cancelled` (single source).

---

## Wave 2 — Approval workflow & statuses
- [x] `approveSenior` (OSCA Head only) → sets `Active`, mints `id_number` via sequence.
- [x] New `disapproveSenior(id, reason)` (missing/fake requirements).
- [x] New `disqualifySenior(id, reason)` (duplicate / non-resident).
- [x] New `markInactiveSenior(id, reason)` (deceased/disqualified → `Inactive`).
- [x] `updateSeniorStatusByBarangay` restricted to OSCA roles only (removes barangay update capability).

---

## Wave 3 — Registration form dynamics & validation
- [x] Conditional pensioner fields (show `pensioner_type` + SSS/GSIS/PVAO only when "Pensioner").
- [x] Mandatory field indicators (red `*`).
- [x] Server-side dedup check on full name + birthdate (clear error).

---

## Wave 4 — Reports
- [x] New `/reports` page + nav item (OSCA roles).
- [x] Wire `generatePDF` / `generateCSV` from `exports.ts`.
- [x] Filters: transferee records, date-range pending, active/inactive registry.

---

## Wave 5 — Mobile app
- [x] Notification split (Announcement vs Status Update) using `notification_category`.
- [x] Navigation lockout for unverified/pending applicants (only Notifications + Announcements).
- [x] Replace bug report with "Request Correction of Information".

---

## Wave 6 — Audit trail relocation
- [x] Move Audit Trail into Settings/Privacy (remove top-level item).
- [x] Fix audit page guard to reference real roles.

---

## Wave 7 — QR verification & data privacy
- [x] QR encodes `id_number` (fallback `registration_id`) on mobile `DigitalIDCard` and web `IDCardPreview`.
- [x] Added `GET /api/verify?code=` scan endpoint returning active-membership status.
- [x] PII encryption at rest: `philhealth_no`, `sss_no`, `gsis_no`, `tin`, `pvao_no` encrypted via pgcrypto (private `internal.app_config` key); plaintext cleared on write; `decrypt_senior_pii` / `decrypt_senior_pii_batch` (OSCA roles only) wired into detail modal + PhilHealth export.

## Wave 8 — Archiving & digitization
- [x] `seniors_archive` data-bank table + `sync_senior_archive()` trigger (auto-mirrors Inactive/Deceased/Transferred/Cancelled).
- [x] Partial index on Active members + archive RLS (OSCA roles).
- [x] Reports: "Archived (Data Bank)" export type.
- [x] Barangay status-update capability removed (OSCA-only in `updateSeniorStatusByBarangay`).
- [x] Legacy document digitization: `legacy_documents` table + RLS, `/archive` page (scan/upload → Cloudinary, link to senior, list/view/delete).

## Wave 9 — Data management & member status
- [x] Active strictly for current residents; Inactive covers deceased/disqualified (status change UI exposes Deceased / Inactive / Transferred / Cancel).
- [x] Transferred/Cancelled auto-mirror to `seniors_archive` data bank (trigger).
- [x] Returnee = new applicant + new ID: `replaces_senior_id` link column; Cancelled/Transferred excluded from dedup index.
- [x] Deceased records retained as reference markers: `deceased_at` timestamp + archive snapshot.
- [x] Disqualification/benefits tracking: `benefits_eligible`, `disqualification_indicators`, `inactive_reason`; status-change modal requires a reason/indicators; `StatusBadge` covers `Disqualified`/`Disapproved`.

## Wave 10 — Final polish (per follow-up)
- [x] Terminology: "Sign In" → "Log In" (mobile + web); web login labels "Email"/"Password"/"Log In"; "Sign in the box" → "Sign below".
- [x] Encrypt `contact_number` + `address` (trigger + decrypt fns + detail modal / approvals / reports / PhilHealth export / mobile MyProfile self-decrypt).
- [x] Manual ID override at approval with immediate duplicate-ID validation.
- [x] Demo/obfuscated ID template (grey + "SAMPLE" watermark) toggle in ID card preview.
- [x] Barangay dashboard → view-only + document-issuance notice (status buttons/confirm modal removed).
- [x] Responsive admin: collapsible mobile sidebar + hamburger + responsive main/footer.
- [x] Senior-friendly mobile: larger fonts/higher contrast on Dashboard/Notifications/MyProfile.
- [x] Mobile pre-registration (`pre_register_senior` RPC + PreRegister screen) + ID release status tracking (Under Review / Approved — preparing / ID ready for pickup).

## Out of scope (confirmed with client)
- Barangay app (`mobile-parasocial`) — no longer used; only the senior mobile app is in scope.
- Barangay is limited to issuing physical supporting documents (no system access per "Removal of Barangay Level Access").

---

## Design decisions / assumptions
- `registration_id` stays as the application/auth reference (generated at registration for mobile login). The **official ID number** (`id_number`) is a separate field minted only at approval, per "IDs generated on Admin approval only".
- Returnees (Cancelled/Transferred) are treated as new applicants → excluded from dedup index; issued a new `id_number`.
- ID format: `{YYYY}-{MM}-{sequence}` (sequence increments `7916 → 7917`, resets `01` each new year). Format is configurable in `next_senior_id_number()`.
- Administration/OSCA Head changes never touch the sequence (stored in `id_sequences`, independent of `municipal_config`).
