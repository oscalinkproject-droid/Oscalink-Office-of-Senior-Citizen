
# OSCALink: Unified Full-Stack Implementation Plan

This comprehensive plan provides the final architectural and functional requirements for **OSCALink**, a web-based portal for the **Office for Senior Citizen Affairs (OSCA)** in Cotabato City. It aligns the project proposal with mandatory legal requirements from **RA 9257**, **DILG MC 2005-63**, and **PhilHealth Circular 033-2017**.

---

## 1. Project Overview & Objective
**OSCALink** transitions OSCA from manual, paper-based records to a centralized digital system. Its primary goals are to eliminate the risk of data loss, expedite assistance requests, and provide a decentralized verification system for all seniors, including those who are bedridden or ill.

## 2. Technical Stack (Production)
*   **Hosting:** Vercel (Next.js 16.2.1 / React 19).
*   **Database & Auth:** Supabase (PostgreSQL with Row-Level Security).
*   **Email Engine:** Resend (Automated notifications for requests/appointments).
*   **Document Cloud:** Cloudinary (Storage for digital backups of birth certificates, IDs, and field verification photos).

## 3. Enhanced Database Schema (Legal & PhilHealth Aligned)
To comply with **PhilHealth Circular 033-2017**, the database must use a granular structure.

### A. Seniors Table (Master Profile)
| Column | Type | Requirement |
| :--- | :--- | :--- |
| `full_name` | TEXT | Family, First, Middle, Extension. |
| `address_unit` | TEXT | Unit/Room/Floor No.. |
| `address_building`| TEXT | Building Name. |
| `address_lot` | TEXT | Lot/Block/House No.. |
| `address_street` | TEXT | Street / Subdivision / Village. |
| `barangay` | TEXT | Required for PhilHealth Export. |
| `govt_ids` | JSONB | GSIS, SSS, TIN, and PhilHealth PIN. |
| `classification` | ENUM | Pensioner, Indigent, or Supported. |
| `monthly_income` | ENUM | Specific ranges (e.g., P1,000-P4,999). |
| `medical_info` | JSONB | Blood Type and Religion. |
| `is_bedridden` | BOOLEAN | Flag for Field-Based Verification workflow. |

### B. Family Composition Table
*   **Columns:** `senior_id` (FK), `name`, `birthdate`, `occupation`, `relationship`, `income`.

## 4. Specialized Workflow: Bedridden/Ill Senior Verification
To solve the issue of sick seniors being unable to visit the office, the system implements a **Decentralized Verification Workflow**:

1.  **Flagging:** A senior is marked as `is_bedridden: true` in the directory.
2.  **Notification:** The assigned **Barangay Official** receives a push/email notification via **Resend**.
3.  **Field Visit:** The official visits the home and takes a "Proof of Life/Condition" photo.
4.  **Cloudinary Upload:** The official uploads the photo and a digital **Barangay Certification** directly to the senior’s profile.
5.  **Digital Approval:** **OSCA Staff** or the **MSWD Officer** reviews the digital evidence and marks the record as "Validated".

## 5. Core Feature Modules

### A. Records & Monitoring
*   **Status Tracking:** Active, Inactive, Transferred, or Deceased.
*   **Quarterly Updates:** Automated logic to prompt for the legally mandated quarterly list maintenance.

### B. Assistance Request System (Kanban)
*   **Categories:** Medical, Financial, Burial, and Assistive Devices.
*   **Electronic Filing:** Capability to attach digital PhilHealth Member Registration Forms (PMRF).

### C. Complaints & ID Management
*   **Violations Log:** Record complaints against establishments refusing discounts.
*   **Issuance Log:** Track the distribution of free national ID cards and purchase booklets.

### D. Reporting & PhilHealth Export
*   **Electronic Transmittal:** One-click generation of the password-protected Excel/CSV file required by the **Local Health Insurance Office (LHIO)**.

## 6. Iterative Development & Zero-Error Testing
The AI developer must follow this loop until 0 errors remain:

1.  **Logic Test:** Verify that Barangay Officials can **only** see/edit seniors within their assigned barangay via **Supabase RLS**.
2.  **API Integration:** Ensure **Cloudinary** uploads successfully attach to the correct `senior_id` and **Resend** triggers upon "Status Update."
3.  **Build Validation:** Run `vercel build` to catch all TypeScript/Next.js runtime errors.
4.  **Compliance Audit:** Ensure every field from the **Pangil/Siniloan Registration Forms** is present and mapped to a database column.

## 7. User Roles (RBAC)
*   **Super Admin (OSCA Head):** Full system oversight and "Certified & Correct" approval power.
*   **Admin (OSCA Staff):** Manage records city-wide and process assistance.
*   **Liaison (MSWD Officer):** Legally mandated assistant to the OSCA Head for social programs.
*   **Sub-Admin (Barangay Official):** Field-based monitoring and bedridden verification for their specific area.
