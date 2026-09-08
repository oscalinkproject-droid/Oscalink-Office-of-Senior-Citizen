
# OSCALink Project Implementation Plan

## 1. Project Overview
**OSCALink** is a centralized web-based portal designed for the **Office for Senior Citizen Affairs (OSCA)** in **Cotabato City**. The system aims to replace manual, paper-based records that are currently prone to loss, damage, or misplacement. It will provide a digital platform for monitoring senior citizens, managing records, processing assistance requests, and scheduling appointments.

## 2. Technical Stack
*   **Hosting & Frontend:** Vercel (Next.js Framework).
*   **Database & Auth:** Supabase (PostgreSQL with Row-Level Security).
*   **Email Service:** Resend (For notifications and coordination).
*   **Media/Document Storage:** Cloudinary (For digital backup of physical documents to prevent data loss).

## 3. UI/UX Design Framework (Stitch System)
The project follows **"The Kinetic Institutionalist"** design system, located in `OSCALink/stitch/`. All frontend development MUST adhere to the specifications in `OSCALink/stitch/apex_digital_civic/DESIGN.md` and the visual exports (`code.html` and `screen.png`) in the respective module folders.

### Design Principles:
*   **Creative North Star:** High-velocity, data-dense, authoritative liquid UI.
*   **Surface Logic:** "Midnight Institutional" (#0e141b foundation). No 1px solid borders; use tonal shifts and negative space for structural definition.
*   **Glassmorphism:** Use `backdrop-blur-xl` and `bg-white/5` for floating elements.
*   **Typography:** Manrope (Headlines) and Inter (Body/Functional).

### Module UI Mapping:
*   **Landing Page:** `OSCALink/stitch/landing_page_oscalink/`
*   **Authentication:** `OSCALink/stitch/login_oscalink/`
*   **Records Management:** `OSCALink/stitch/seniors_directory_oscalink/`
*   **Assistance System:** `OSCALink/stitch/assistance_requests_kanban_oscalink/`
*   **Appointment System:** `OSCALink/stitch/appointments_timeline_oscalink/`

## 4. User Roles & Permissions
*   **OSCA Staff (Super Admins):** Full access to register and manage records across all barangays, process assistance requests, and generate city-wide reports.
*   **Barangay Officials (Sub-Admins):** Access limited to monitoring and updating the status of senior citizens within their specific jurisdiction.

## 5. Core Functional Modules
### A. Senior Citizen Records Management
*   **Registration:** Digital intake form to capture personal data, replacing paper-based records.
*   **Status Monitoring:** A system to track if a resident is **Active, Inactive, Transferred, or Deceased**.

### B. Assistance Request System
*   **Categories:** Standardized workflows for:
    *   Medical Support.
    *   Financial Aid.
    *   Burial Assistance.
    *   Assistive Devices.
*   **Verification:** Automated tracking to speed up the manual verification process.

### C. Appointment Scheduling System
*   **Service Coordination:** Tools to schedule health checkups, registration updates, and assistance programs to prevent disorganized delivery.

### D. Reporting & Analytics
*   **Summaries:** Generation of organized reports related to demographics, request status, and scheduled services.

## 6. Third-Party Integration Specifications
*   **Supabase:** Host the centralized database and manage secure user accounts for OSCA and Barangay staff.
*   **Cloudinary:** Store digital scans of senior IDs and application documents to mitigate the "Risk of Data Loss" associated with paper.
*   **Resend:** Automate email alerts to OSCA staff for new requests and to beneficiaries for scheduled appointments.

## 7. Iterative Testing & Debugging Strategy
The AI must execute an iterative loop to ensure a "zero-error" build before deployment:

### Phase 1: Logic & Validation Testing
*   **Status Integrity:** Verify that the monitoring system correctly transitions seniors between Active/Inactive/Transferred/Deceased states without data corruption.
*   **Access Control:** Ensure Barangay Officials can **only** view records for their specific area.

### Phase 2: Integration Testing
*   **API Verification:** Test Cloudinary upload/retrieval and Resend email delivery triggers.
*   **Database Sync:** Ensure real-time updates between Barangay status changes and the OSCA centralized dashboard.

### Phase 3: The "Infinite" Debugging Loop
1.  **Build Scan:** Execute a full project build on Vercel. 
2.  **Error Capture:** Log all runtime, syntax, and permission errors.
3.  **Refactor:** Fix bugs, specifically focusing on inaccurate or incomplete information issues identified in traditional systems.
4.  **Regression:** Re-test all core features (Registration -> Status Update -> Request -> Appointment).
5.  **Exit Criteria:** 0 errors in the build log and 100% successful response rates from Supabase, Cloudinary, and Resend.

## 8. Deployment & Constraints
*   **Target:** Deploy to Vercel production environment.
*   **Requirement:** The system must include an "Internet Connection Required" warning as it is a cloud-based platform.
*   **Geofencing:** Logic must restrict record management strictly to the **Cotabato City** area.