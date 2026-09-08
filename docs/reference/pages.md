# Page Descriptions

## Pages Overview

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Public landing page with OSCA information |
| `/login` | Login | Authentication gateway |
| `/dashboard` | Dashboard | Overview with statistics and charts |
| `/directory` | Directory | Senior citizen records management |
| `/requests` | Requests | Assistance request board |
| `/complaints` | Complaints | Complaints & violations management |
| `/inventory` | Inventory | ID card & booklet inventory tracking |
| `/philhealth` | PhilHealth Export | PhilHealth data export tool |
| `/quarterly` | Quarterly Reports | Quarterly report generation |
| `/staff` | Staff Management | Staff account provisioning |
| `/verifications` | Verifications | Bedridden verification management |
| `/endorsements` | Endorsements | Endorsement management |
| `/reports` | Reports | Report generation and export |
| `/timeline` | Timeline | Appointment calendar |
| `/timeline/appointments` | Appointments | Detailed appointment list |
| `/settings` | Settings | User profile and preferences |
| `/resident/login` | Resident Login | Senior citizen self-service login |
| `/resident/register` | Resident Register | Senior citizen registration |
| `/resident/dashboard` | Resident Dashboard | Senior citizen personal portal |
| `/resident/profile` | Resident Profile | View/edit personal profile |
| `/resident/requests` | Resident Requests | View personal assistance requests |
| `/resident/appointments` | Resident Appointments | View personal appointments |
| `/resident/settings` | Resident Settings | Account settings |

## Page Details

### Landing Page (`/`)
- Public information about OSCA Cotabato City
- Services offered (Medical, Financial, Burial, Devices)
- Contact hotlines
- Link to administrative portal

### Login (`/login`)
- Email/password authentication
- Redirects based on user role

### Dashboard (`/dashboard`)
- Statistics cards (Total seniors, by status)
- Request queue summary
- Today's appointments
- Demographic charts (bar charts, donut charts)

### Directory (`/directory`)
- Searchable/filterable table of seniors
- Registration modal for new seniors
- Profile modal for viewing/editing details
- Document uploads via Cloudinary

### Requests (`/requests`)
- Kanban-style board with category tabs (Medical, Financial, Burial, Assistive Devices)
- Request cards with status actions (Pending → Approved → Released)
- Auto-email notifications via Resend

### Complaints (`/complaints`)
- Complaint filing and tracking
- Status workflow: Pending → Investigating → Resolved / Escalated → Closed
- Priority management (Routine / Urgent)

### Inventory (`/inventory`)
- ID card issuance tracking
- Booklet serial number management
- Status: Pending, Issued, Lost, Returned

### PhilHealth Export (`/philhealth`)
- Password-protected PhilHealth data export
- Barangay and status filters
- CSV file generation for LHIO submission

### Quarterly Reports (`/quarterly`)
- Quarterly update generation
- Verification workflow for quarterly submissions
- Automated reminders

### Staff Management (`/staff`)
- Staff account provisioning
- Barangay official assignment
- Role assignment (osca_head, admin, mswd_officer, official, mayor)

### Verifications (`/verifications`)
- Bedridden verification management
- Pending verification queue
- Validation and rejection workflow

### Endorsements (`/endorsements`)
- Endorsement letter generation
- Endorsement tracking and management

### Reports (`/reports`)
- Seniors by barangay breakdown
- Assistance metrics (by category and status)
- Service delivery logs

### Timeline (`/timeline`)
- Calendar view of appointments
- Color-coded service types
- Appointment management

### Settings (`/settings`)
- User profile information
- Password change
- Preferences

### Resident Portal Routes (`/resident/*`)
- Self-service portal for senior citizens
- Self-locked RLS (view own data only)
- Digital OSCA ID display
- Personal assistance request tracking
- Appointment viewing
