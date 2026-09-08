# OSCALink Project Summary

**Prepared for:** City Government of Cotabato City  
**Project:** OSCALink - Office for Senior Citizen Affairs Digital Portal  
**Date:** March 2026

---

## 1. Executive Summary

OSCALink (Office for Senior Citizen Affairs Link) is a comprehensive web-based portal designed to digitize and streamline the operations of Cotabato City's OSCA office. This system enables efficient management of senior citizen records, assistance requests, appointment scheduling, and reporting—all in one centralized platform.

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Centralized Data** | All senior citizen information stored in one secure location |
| **Faster Processing** | Assistance requests processed digitally with status tracking |
| **Better Visibility** | Real-time dashboards and analytics for informed decision-making |
| **Role-Based Access** | Secure access controls ensure data privacy and appropriate permissions |
| **Report Generation** | Instant PDF and CSV reports for city officials |

---

## 2. System Overview

OSCALink is a **web-based application** that can be accessed through any modern web browser (Chrome, Firefox, Edge, or Safari). Users log in with their credentials and access features based on their assigned role.

### What OSCALink Does

1. **Senior Citizen Directory** — Register, search, and manage all senior citizen records
2. **Assistance Requests** — Process and track aid requests (Medical, Financial, Burial, Assistive Devices)
3. **Appointment Scheduling** — Calendar-based scheduling for OSCA services
4. **Reports & Analytics** — Generate downloadable reports for city leadership
5. **Document Management** — Store and retrieve important documents securely

---

## 3. User Roles & Access Permissions

OSCALink implements **role-based access control** to ensure each user can only access features appropriate to their responsibilities.

### Role Comparison Matrix

| Feature | City Administrator | Barangay Official |
|---------|-------------------|-------------------|
| **Dashboard** | Full city-wide statistics | Barangay-specific statistics |
| **Senior Directory** | View all seniors | View only assigned barangay |
| **Register New Senior** | ✅ Yes (city-wide) | ✅ Yes (own barangay only) |
| **Edit Senior Records** | ✅ Yes (city-wide) | ✅ Yes (own barangay only) |
| **Process Requests** | ✅ City-wide | ✅ Only own barangay |
| **Create Appointments** | ✅ Yes | ✅ Yes (own barangay) |
| **View Timeline** | Full calendar | Barangay calendar only |
| **Generate Reports** | ✅ Full reports | ✅ Barangay reports |
| **User Management** | ✅ Yes | ❌ No |

### Role Descriptions

#### City Administrator
- Full access to all features and data across all barangays
- Can register and edit senior citizen records
- Can process assistance requests from any barangay
- Can generate city-wide reports
- Manages user accounts and permissions

#### Barangay Official
- Access to data only within their assigned barangay
- Can view senior citizens in their area
- Can register new senior citizens within their own barangay
- Can edit senior citizen records within their own barangay
- Can process assistance requests from their barangay
- Can create and manage appointments for their barangay
- Can generate barangay-specific reports

---

## 4. Data Flow

Understanding how data moves through OSCALink helps ensure proper usage and data integrity.

### How Data Flows Through the System

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│  (Web Browser - Dashboard, Directory, Requests, Timeline, Reports)  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ User Actions (Login, Submit, Search)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION SERVER                             │
│  (Next.js - Handles logic, validates input, processes requests)     │
│  - Authenticates users                                              │
│  - Validates permissions                                            │
│  - Processes business logic                                         │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Data Operations
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                               │
│  (Supabase PostgreSQL - Stores all application data)                │
│  - Seniors table                                                    │
│  - Requests table                                                   │
│  - Appointments table                                               │
│  - Profiles table (users & roles)                                   │
│  - Row-Level Security enforces data isolation                       │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│     CLOUDINARY          │       │       RESEND            │
│  (File Storage)         │       │   (Email Notifications) │
│  - ID documents         │       │  - Request updates      │
│  - Medical records      │       │  - Appointment reminders│
│  - Photos               │       │  - Status notifications │
└─────────────────────────┘       └─────────────────────────┘
```

### Data Isolation by Role

The system ensures **Barangay Officials** can only see data from their assigned barangay:

- Each user is linked to a specific barangay in their profile
- Database queries automatically filter data based on the user's barangay
- This prevents unauthorized access to sensitive information from other barangays

---

## 5. Technology Stack

OSCALink is built using modern, reliable cloud technologies:

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 16 (React) | User interface and interactivity |
| **Hosting** | Vercel | Cloud deployment and hosting |
| **Database** | Supabase (PostgreSQL) | Secure data storage |
| **Authentication** | Supabase Auth | User login and security |
| **File Storage** | Cloudinary | Document and image storage |
| **Email Service** | Resend | Automated email notifications |
| **Styling** | Tailwind CSS | Modern, responsive design |
| **Charts** | Recharts | Data visualization |
| **PDF Export** | jsPDF | Report generation |
| **Data Export** | PapaParse | CSV file generation |

### Why These Technologies?

- **Vercel**: Industry-leading platform for Next.js, ensuring high availability and fast performance
- **Supabase**: Open-source Firebase alternative with enterprise-grade security
- **Cloudinary**: Reliable media management with automatic optimization
- **Resend**: Modern email delivery service with high deliverability rates

---

## 6. Key Features

### 6.1 Dashboard
- **Statistics Overview**: Total seniors, breakdown by status, request counts
- **Request Queue**: Pending assistance requests requiring attention
- **Today's Schedule**: Upcoming appointments for the day
- **Demographics Charts**: Visual representation of senior population by barangay

### 6.2 Senior Citizen Directory
- Searchable list of all registered seniors
- Filter by status (Active, Inactive, Transferred, Deceased)
- Filter by barangay
- View detailed profiles with contact information
- Register new seniors (Admin: city-wide, Officials: own barangay only)
- Edit existing records (Admin: city-wide, Officials: own barangay only)

### 6.3 Assistance Requests
Four types of requests supported:
- **Medical Assistance** — Healthcare-related aid
- **Financial Assistance** — Monetary support
- **Burial Assistance** — Funeral-related aid
- **Assistive Devices** — Wheelchairs, hearing aids, etc.

Request workflow:
1. Request created (by senior or staff)
2. Assigned to barangay official
3. Processed and status updated
4. Completed/Closed

### 6.4 Appointment Scheduling (Timeline)
- Calendar view of all scheduled appointments
- Create new appointments
- Reschedule or cancel appointments
- Filter by date range or barangay

### 6.5 Reports
- **PDF Reports**: Formal documents for city officials
- **CSV Export**: Raw data for further analysis
- Filter by date range, barangay, and request type

---

## 7. Security & Data Privacy

OSCALink implements multiple layers of security:

### Authentication
- Email and password-based login
- Secure session management
- Automatic logout after inactivity

### Authorization
- Role-based access control (RBAC)
- Row-Level Security (RLS) at database level
- Data isolation between barangays

### Data Protection
- All data stored in Supabase (SOC 2 compliant)
- Secure file storage via Cloudinary
- Encrypted data transmission (HTTPS)

### Privacy
- Personal information only accessible to authorized personnel
- Barangay officials see only their barangay's data
- Audit logging of data access

---

## 8. Getting Started

### Accessing OSCALink

1. Open your web browser
2. Navigate to the OSCALink URL provided by your administrator
3. Click "Access Administrative Portal"
4. Enter your email and password
5. Click "Sign In"

### First-Time Setup

1. **Contact Administrator**: Get your login credentials
2. **Login**: Use the credentials provided
3. **Dashboard**: Review the overview statistics
4. **Explore**: Navigate using the sidebar to understand available features

---

## 9. Support & Maintenance

### For Technical Issues
- Contact your system administrator
- Refer to the Troubleshooting guide in the documentation

### For System Administration
- User account management
- Role assignments
- Report generation

---

## 10. Document Version

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | March 2026 | Initial document for client delivery |

---

*This document was prepared as part of the OSCALink project delivery. For questions or clarifications, contact the development team.*
