# User Roles & Permissions

## Role Definitions

### 1. OSCA Head (`osca_head`)
- **Label**: OSCA Head (Super Admin)
- **Hierarchy Level**: 4
- **Function**: The highest authority with full system control.
- **Key Permissions**:
    - City-wide management
    - Manage staff accounts (User Management)
    - **Final Approval** authority for all assistance requests
    - Full export privileges (PhilHealth & Reports)
    - Full inventory and settings management

### 2. OSCA Staff (`admin`)
- **Label**: OSCA Staff (Admin)
- **Hierarchy Level**: 3
- **Function**: Handles day-to-day administrative operations.
- **Key Permissions**:
    - City-wide management
    - Manage staff accounts
    - Process assistance requests and complaints
    - Export PhilHealth data and view reports
    - Access system settings
    - *Note: Cannot perform Final Approval on requests.*

### 3. MSWD Officer (`mswd_officer`)
- **Label**: MSWD Officer (Liaison)
- **Hierarchy Level**: 2
- **Function**: Manages verification and assistance liaison.
- **Key Permissions**:
    - City-wide management
    - Verify seniors and process assistance
    - Manage complaints and inventory
    - Export PhilHealth data
    - *Note: Cannot manage users or perform Final Approvals.*

### 4. Barangay Official (`official`)
- **Label**: Barangay Official
- **Hierarchy Level**: 1
- **Function**: Localized access for barangay officials.
- **Key Permissions**:
    - **Barangay Locked**: Can only see data for their assigned Barangay
    - Verify senior records within their own barangay
    - Update senior records for their barangay
    - *Note: No access to city-wide reports, user management, or processing of financial assistance.*

### 5. Mayor (`mayor`)
- **Label**: Mayor (View Only)
- **Hierarchy Level**: 0
- **Function**: Executive oversight.
- **Key Permissions**:
    - View-only access to city-wide reports
    - *Note: Cannot modify any data, process requests, or manage users.*

### 6. Senior Citizen (`resident`)
- **Label**: Resident (Self-Service)
- **Hierarchy Level**: -1
- **Function**: Individual beneficiary access.
- **Key Permissions**:
    - **Self Locked**: Can only see data linked to their specific `senior_id`
    - View status of personal assistance requests
    - View personal appointment calendar
    - View own digital OSCA ID and profile details
    - *Note: No access to any other seniors, reports, or administrative controls.*

## Access Control Matrix

| Feature | OSCA Head | OSCA Staff | MSWD Officer | Official | Mayor | Resident |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Manage Users** | ✅ | ✅ | ❌ | ✗ | ✗ | ✗ |
| **Final Approval** | ✅ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **City-Wide Data** | ✅ | ✅ | ✅ | ✗ | ✗ | ✗ |
| **Barangay Locked** | ✗ | ✗ | ✗ | ✅ | ✗ | ✗ |
| **Self Locked** | ✗ | ✗ | ✗ | ✗ | ✗ | ✅ |
| **PhilHealth Export**| ✅ | ✅ | ✅ | ✗ | ✗ | ✗ |
| **View Reports** | ✅ | ✅ | ✅ | ✗ | ✅ | ✗ |

## Row-Level Security (RLS)

The system uses PostgreSQL Row-Level Security to enforce data isolation:
- Users with `sector_locked: true` (Officials) have their queries automatically filtered by their assigned `barangay`.
- Users with `self_locked: true` (Residents) have their queries filtered by their unique `senior_id`.
- Users with `canManageAllSectors: true` bypass barangay filtering to view city-wide data.
- Database-level policies ensure that no senior citizen data leaks between barangays.
