# System Overview

## What is OSCALink?

OSCALink (Office for Senior Citizen Affairs Link) is a web-based municipal portal designed for Cotabato City's OSCA office to manage senior citizen records, assistance requests, and appointments.

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 16 (React 19) |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **File Storage** | Cloudinary |
| **Email Notifications** | Resend |
| **Styling** | Tailwind CSS |
| **Charts** | Recharts |
| **PDF Export** | jsPDF |
| **CSV Export** | PapaParse |

## Architecture

```
┌─────────────────────────────────────────┐
│           Browser (Client)              │
├─────────────────────────────────────────┤
│  Next.js App (React Components)         │
│  ├── Pages: Dashboard, Directory, etc.  │
│  ├── Components: UI, Layout            │
│  └── Client: @/lib/supabase            │
└──────────────────┬──────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────┐
│         Next.js Server                 │
│  └── Server Client: @/lib/supabase-server │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│              Supabase                   │
│  ├── Database (PostgreSQL)             │
│  ├── Auth (User Management)             │
│  └── Row-Level Security (RLS)          │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌───────────────┐    ┌───────────────┐
│  Cloudinary   │    │    Resend     │
│ (File Storage)│    │(Email Service)│
└───────────────┘    └───────────────┘
```

## Key Features

1. **Senior Citizen Management** — Digital registration, profile management, status tracking
2. **Assistance Requests** — Process medical, financial, burial, and assistive device requests
3. **Appointment Scheduling** — Calendar-based scheduling for services
4. **Reports & Analytics** — Generate PDF/CSV reports for city officials
5. **Role-Based Access** — City Administrator and Barangay Official roles

## Security

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Row-Level Security (RLS) policies
- **Data Isolation**: Barangay Officials only see their barangay's data
- **Session Management**: Server-side auth persistence
