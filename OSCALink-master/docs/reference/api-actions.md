# API Actions Reference

## Server Actions

OSCALink uses Next.js Server Actions for data operations.

### Seniors Actions (`/app/actions/seniors.ts`)

| Function | Description |
|----------|-------------|
| `createSenior(formData)` | Register a new senior citizen (maps 24+ fields) |
| `updateSenior(id, updates)` | Update senior citizen details (with geofencing validation) |
| `verifySenior(id)` | Advance senior through approval pipeline (role-dependent) |

**verifySenior pipeline by role:**
- `official` / `para_social_worker`: Pending → Pending Barangay → Pending OSCA
- `osca_head` / `admin`: Any pending → Pending Mayor (with osca_approved tracking)
- `mayor`: Pending Mayor → Active (with mayor_approved tracking)

### Requests Actions (`/app/actions/requests.ts`)

| Function | Description |
|----------|-------------|
| `createAssistanceRequest(data)` | Submit a new assistance request (auto-injects barangay from user metadata) |
| `updateRequestStatus(requestId, newStatus)` | Advance request status (Pending → Approved → Released); triggers email on Release; `canApproveFinal` required for Released |

### Appointments Actions (`/app/actions/appointments.ts`)

| Function | Description |
|----------|-------------|
| `getDayCapacity(dateStr)` | Get appointment count for a given day (max 10/day) |
| `getAppointments()` | Fetch all appointments with senior info |
| `getUpcomingAppointments(limit?)` | Fetch upcoming appointments with optional limit |
| `scheduleAppointment(formData)` | Schedule a new appointment (8AM-5PM, 10 slot limit) |
| `cancelAppointment(appointmentId)` | Cancel an existing appointment |
| `rescheduleAppointment(appointmentId, newDate)` | Reschedule an appointment to a new date |

### Reports Actions (`/app/actions/reports.ts`)

| Function | Description |
|----------|-------------|
| `getSeniorsByBarangay()` | Fetch senior count grouped by barangay |
| `getAssistanceMetrics()` | Fetch assistance request metrics by category and status |
| `getServiceDeliveryLogs()` | Fetch appointment delivery stats by status |

### Complaints Actions (`/app/actions/complaints.ts`)

| Function | Description |
|----------|-------------|
| `createComplaint(formData)` | File a new complaint |
| `updateComplaint(id, updates)` | Update complaint status/details |
| `getComplaints(filters?)` | Fetch complaints with optional status/priority filters |
| `getComplaintById(id)` | Fetch a single complaint by ID |
| `getComplaintStats()` | Fetch complaint statistics |

### Inventory Actions (`/app/actions/inventory.ts`)

| Function | Description |
|----------|-------------|
| `createIdRecord(formData)` | Create a new ID inventory record |
| `updateIdRecord(id, updates)` | Update ID record status/details |
| `getIdInventory(filters?)` | Fetch ID inventory with optional status filters |
| `getIdInventoryStats()` | Fetch inventory statistics (total, issued, pending) |
| `getSeniorIdRecord(seniorId)` | Fetch a single senior's ID record |

### PhilHealth Actions (`/app/actions/philhealth.ts`)

| Function | Description |
|----------|-------------|
| `exportPhilHealthData(filters?)` | Generate password-protected PhilHealth export (LHIO-compliant) |
| `getPhilHealthStats()` | Fetch PhilHealth export statistics |

### Quarterly Actions (`/app/actions/quarterly.ts`)

| Function | Description |
|----------|-------------|
| `generateQuarterlyReport(quarter, year)` | Generate a quarterly report |
| `getQuarterlyUpdates()` | Fetch quarterly update records |
| `verifyQuarterlyReport(id)` | Verify/approve a quarterly report |
| `getUpcomingQuarterlyReminder()` | Get upcoming quarterly reminder info |
| `sendQuarterlyReminders()` | Send quarterly reminder notifications via Resend |

### Bedridden Actions (`/app/actions/bedridden.ts`)

| Function | Description |
|----------|-------------|
| `getBedriddenSeniors()` | Fetch list of bedridden seniors |
| `getPendingVerifications()` | Fetch pending bedridden verifications |
| `createBedriddenVerification(seniorId, officialId)` | Create a new bedridden verification |
| `updateBedriddenVerification(id, updates)` | Update verification details |
| `validateBedriddenVerification(id, validatedBy, notes?)` | Approve a verification |
| `rejectBedriddenVerification(id, validatedBy, notes)` | Reject a verification with reason |
| `notifyBarangayOfficial(verificationId)` | Send email notification to barangay official |
| `getVerificationStats()` | Fetch verification status counts (Pending/Uploaded/Validated/Rejected) |

### User/Staff Actions (`/app/actions/users.ts`)

| Function | Description |
|----------|-------------|
| `createStaff(formData)` | Provision a new staff account (creates auth.user + profile + identity) |
| `getStaffList()` | Fetch all staff profiles (all staff roles) |
| `updateStaff(staffId, formData)` | Update staff details and auth metadata |
| `deleteStaff(staffId)` | Delete staff account (auth.user + profile cascade) |

## API Routes (REST Endpoints)

In addition to server actions, OSCALink provides REST API routes:

| Endpoint | Method(s) | Purpose |
|----------|-----------|---------|
| `/api/auth/callback` | GET | Supabase OAuth callback handler |
| `/api/inventory` | GET, POST | List/create ID inventory records |
| `/api/inventory/[id]` | PATCH | Update inventory record |
| `/api/philhealth/export` | GET | Export active seniors data as JSON (filterable by barangay) |
| `/api/upload` | POST | Upload file to Cloudinary |
| `/api/bedridden/validate` | POST | Validate/reject bedridden verification (duplicates server action logic) |
| `/api/complaints` | GET, POST | List/create complaints |
| `/api/complaints/[id]` | PATCH | Update complaint status |
| `/api/quarterly/generate` | POST | Generate quarterly report |

## Usage Example

```typescript
// Create a new senior
import { createSenior } from '@/app/actions/seniors';

const formData = new FormData();
formData.append('full_name', 'Juan dela Cruz');
formData.append('age', '72');
formData.append('barangay', 'Poblacion');

await createSenior(formData);
```
