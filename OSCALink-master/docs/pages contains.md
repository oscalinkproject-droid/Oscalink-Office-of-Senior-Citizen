This document outlines the specific content and functional requirements for every page of the **OSCALink** web portal. It integrates the core objectives from the sources—such as monitoring, records management, and assistance requests—with the previously discussed tech stack (**Vercel, Supabase, Resend, and Cloudinary**).

# OSCALink Page-by-Page Requirements

## 1. Global Layout Elements (Common to All Pages)
Every authenticated page must contain these elements to ensure a unified user experience:
*   **Navigation Sidebar/Header:** Links to Dashboard, Records, Assistance, Appointments, and Reports (Role-dependent).
*   **User Identity:** Current user’s name and role (OSCA Staff or Barangay Official).
*   **Logout Button:** Secure session termination via **Supabase Auth**.
*   **Search Bar:** Global search for senior citizen names or ID numbers.

---

## 2. Login Page
*   **Purpose:** Secure entry point for authorized users only.
*   **Fields:** Email/Username and Password.
*   **Logic:** **Supabase Auth** verification. Redirects users to their specific dashboard based on assigned roles (Super Admin vs. Sub-Admin).

## 3. Dashboard (Overview)
*   **Purpose:** Provide a high-level summary of OSCA operations.
*   **Key Widgets:**
    *   **Statistics Summary:** Total Senior Citizens, total Active/Inactive/Deceased/Transferred residents.
    *   **Request Queue:** Number of pending Medical, Financial, Burial, and Assistive Device requests.
    *   **Upcoming Appointments:** A "Today's Schedule" preview.
*   **Visuals:** Real-time data charts showing demographics across Cotabato City barangays.

## 4. Senior Citizen Records Management Page
*   **Purpose:** Centralized digital database to replace paper records.
*   **Search/Filter:** Filter by Barangay (OSCA view) or specific status (Active/Deceased/etc.).
*   **Registration Button:** Opens a modal/form for new entries.
*   **Data Table:** Displays Name, Age, Barangay, and **Status Monitoring** toggle.
*   **Individual Profile View:**
    *   Personal details and resident history.
    *   **Cloudinary Integration:** Display digital scans of physical IDs or documents to prevent data loss.

## 5. Assistance Requests Page
*   **Purpose:** Standardize and speed up the manual verification of aid requests.
*   **Category Tabs:** Specific views for **Medical Support, Financial Aid, Burial Assistance, and Assistive Devices**.
*   **Request Form:** Fields for beneficiary ID, type of aid, and document uploads.
*   **Processing Controls:** "Approve," "Pending," or "Released" status buttons for OSCA staff.
*   **Resend Integration:** Automated email trigger to notify the beneficiary (or their representative) when a request status is updated.

## 6. Appointment Scheduling Page
*   **Purpose:** Organize health checkups and program registration to prevent disorganized delivery.
*   **Calendar View:** Visual representation of scheduled services.
*   **Scheduling Form:** Select Senior Citizen, Service Type (e.g., Health Checkup), and Date/Time.
*   **Coordination Tools:** List of upcoming appointments with contact information for coordination.

## 7. Reports & Analytics Page (OSCA Staff Only)
*   **Purpose:** Generate organized summaries for decision-making.
*   **Report Generation:** Buttons to export data as PDF or CSV.
*   **Content:**
    *   Summaries of senior citizen status per barangay.
    *   Total assistance requests fulfilled vs. pending.
    *   Service delivery logs (Appointments met vs. missed).

## 8. Resident Portal (My OSCALink) - IMPLEMENTED
*   **Purpose:** Provide a dedicated space for beneficiaries to monitor their own data.
*   **Key Sections:**
    *   **My Profile:** View registered details, digital OSCA ID, and status (Active/Pending).
    *   **My Assistance:** List of all personal requests (Medical, Financial, etc.) with real-time status tracking.
    *   **My Schedule:** Personal calendar of upcoming appointments and quarterly check-ins.
*   **Security:** Access restricted via **self-locked RLS** (only viewing their own `senior_id`).

---

## Technical Content (Outside Sources)
To ensure the AI develops this correctly, the following technical integrations (not mentioned in the project proposal but discussed in our conversation history) must be implemented on the relevant pages:

*   **Vercel:** All pages must be optimized for serverless deployment with fast loading times.
*   **Supabase RLS:** Every page query must be wrapped in **Row-Level Security** logic—Barangay Officials should only see data where `barangay_id` matches their own profile.
*   **Cloudinary:** The Records and Assistance pages must include a robust file-upload component for document backups.
*   **Resend:** The backend logic for the "Assistance" and "Appointment" pages must include API calls to trigger email notifications upon status changes.