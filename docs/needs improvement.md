
# OSCALink: Gap Analysis & Comprehensive Improvement Plan

This document identifies missing features, required data fields, and functional improvements needed to align the current **OSCALink** implementation with Philippine legal mandates (RA 9257), **PhilHealth Circular 033-2017**, and the administrative standards found in provincial registration forms.

---

## 1. Missing Data Fields (Database Schema Expansion)
The `seniors` table has been expanded to comply with **PhilHealth enrollment requirements** and standard social monitoring.

### A. PhilHealth-Mandated Address Breakdown (COMPLETED)
The single `address` string has been supplemented with:
*   **Unit/Room/Floor No.** (`address_unit`)
*   **Building Name** (`address_building`)
*   **Lot/Block/House No.** (`address_lot_block`)
*   **Street** (`address_street`)
*   **Subdivision/Village** (`address_subdivision`)

### B. Government Identifiers & Financials (COMPLETED)
*   **National IDs:** Added fields for **GSIS No.**, **SSS No.**, **TIN**, and **PhilHealth No. (PIN)**.
*   **Socio-Economic Classification:** Support for **Pensioner**, **Indigent**, or **Supported**.
*   **Income Tracking:** Monthly income field implemented for eligibility tracking.

### C. Advanced Demographics (COMPLETED)
*   **Health/Personal:** **Blood Type** and **Religion** fields added.
*   **Background:** **Highest Educational Attainment** and **Employment Status** implemented.
*   **Family Composition Table:** Database table created to store relational family data.

---

## 2. Missing Functional Modules (Legal Compliance)
Per **Memorandum Circular 2005-63**, the system must function as a "Liaison Center."

### A. Complaints & Violations System (COMPLETED)
*   **Refusal of Benefits:** Module implemented for seniors to file complaints against establishments.
*   **Status Tracking:** Backend support for investigation, resolution, and escalation workflows.

### B. ID & Purchase Booklet Tracking (IMPLEMENTED)
*   **Database Schema:** `id_inventory` table created.
*   **Inventory/Issuance:** `/inventory` page fully implemented with ID card and booklet tracking, status management (Pending/Issued/Lost/Returned), and search/filter capabilities.

### C. PhilHealth Electronic Transmittal Export
*   **Automation:** A tool to generate password-protected electronic files (Excel/CSV) in the specific format required by the **Local Health Insurance Office (LHIO)** for mandatory enrollment.

### D. Quarterly Maintenance Logic
*   **Reporting Cycle:** Automated prompts or workflows to facilitate the **quarterly update** of the senior citizen list as mandated by law.

### E. Resident Dashboard & Self-Service (IMPLEMENTED)
*   **Purpose:** Empower senior citizens to track their own aid status and appointments.
*   **Feature:** A secure "Resident Portal" role (`resident`) that is `self-locked` via RLS to their own `senior_id`.
*   **Routes:** `/resident/login`, `/resident/register`, `/resident/dashboard`, `/resident/profile`, `/resident/requests`, `/resident/appointments`, `/resident/settings`.
*   **Visibility:** View personal assistance requests, upcoming appointments, digital OSCA ID, and profile management.

---

## 3. Updated User Roles & Governance
The current RBAC (admin/official) should be refined to reflect legal oversight structures.

*   **OSCA Head (Super Admin):** Must be a senior citizen appointee with specific qualifications (Filipino citizen, registered voter, etc.).
*   **MSWD Officer (Assistance Role):** A role for the **City Social Welfare and Development Officer** to assist the OSCA Head in program implementation.
*   **Mayor’s Oversight:** A "View-Only" executive dashboard for the **Office of the Mayor** to exercise supervision over OSCA plans and activities.

---

## 4. Improvements to Existing Features

### A. Status Monitoring
*   **"Transferred" Status:** Ensure the status tracking explicitly includes **"Transferred"** to monitor residents moving out of Cotabato City, as highlighted in the project proposal.

### B. Cloudinary Utilization (Digital Archiving)
*   **Document Backups:** Use Cloudinary to store digital scans of **Birth Certificates, Voter IDs, or Baptismal Certificates** to prevent the "Risk of Data Loss" associated with physical paper records.

### C. Public Landing Page Content
Based on the **Senior Citizen Web Portal** source, the landing page should be expanded to include:
*   **News & Activities:** Updates on local programs and national laws.
*   **Downloads:** Access to the **PhilHealth Member Registration Form (PMRF)** and other benefit forms.
*   **Government Links:** Direct links to the DSWD, DILG, and other relevant agencies.

---

## 5. Technical Implementation Recommendations
*   **Resend (Email) Triggers:** Automate notifications for **Complaint Status Updates** and **Quarterly Report Reminders** to OSCA staff.
*   **Verification Workflow:** Implement a "Certified & Correct" digital signature step on the registration profile to mimic the signature requirements of physical forms.
*   **Offline Handling:** Given the "Internet Access Required" limitation, implement local caching or "Pending Sync" indicators for staff working in areas with unstable connectivity.


I have generated the requested Markdown file. This plan incorporates the mandatory PhilHealth address breakdowns, the socio-economic data fields found in the Pangil and Siniloan forms, and the legal functions mandated by Memorandum Circular 2005-63, such as the complaints log and ID issuance tracking.