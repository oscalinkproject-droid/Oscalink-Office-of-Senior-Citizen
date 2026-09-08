# Understanding Senior Statuses

OSCALink uses eight status values to track senior citizens through a multi-stage approval pipeline and lifecycle.

## Pipeline Statuses

### Pending
**Definition**: Initial status upon registration.
- Senior has been registered but not yet verified at barangay level
- All new registrations start here

### Pending Barangay
**Definition**: Barangay-level verification in progress.
- Set by Barangay Official or Para-Social Worker when they verify the record
- Indicates the senior has been reviewed at the barangay level

### Pending OSCA
**Definition**: City-level verification in progress.
- Set by Barangay Official or Para-Social Worker after barangay verification
- Awaiting OSCA Head/Admin review

### Pending Mayor
**Definition**: Awaiting Mayor's final approval.
- Set by OSCA Head or Admin when they approve the record
- This is the final step before activation

### Active
**Definition**: Fully approved and verified.
- Set by Mayor when final approval is granted
- Senior is eligible for all services and benefits
- Required for social pension processing

## Lifecycle Statuses

### Archived
**Definition**: Senior is no longer receiving services but record is preserved.
- Previously active but services paused
- Record kept for historical and reporting purposes

### Transferred
**Definition**: Senior has relocated to another area.
- Moved to a different city or municipality
- Data preserved for records

### Deceased
**Definition**: Senior has passed away.
- Confirmed via death certificate or reliable source
- No further assistance requests should be processed

## Multi-Stage Approval Workflow

```
Registration
    │
    ▼
  Pending ──► Pending Barangay ──► Pending OSCA ──► Pending Mayor ──► Active
  (anyone)    (official/PSW)        (official/PSW)    (osca_head/admin)  (mayor)
                                   
                                                    │
                                                    ▼
                                              Archived, Deceased, Transferred
```

## Why These Statuses?

These statuses align with:
- **RA 9994** (Expanded Senior Citizens Act): Requirements for registration and verification
- **DILG MC 2005-63**: OSCA functions for maintaining updated lists
- **Multi-stage security**: Ensures each level of government reviews and approves
