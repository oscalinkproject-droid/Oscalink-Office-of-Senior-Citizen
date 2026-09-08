# Security & Data Privacy

OSCALink implements multiple security layers to protect sensitive senior citizen data.

## Security Layers

### 1. Authentication
- Email/password login via Supabase Auth
- Session tokens for authenticated access
- Automatic session handling

### 2. Row-Level Security (RLS)
Database-level policies that automatically filter data:

| User Role | Data Access |
|-----------|-------------|
| Admin | City-wide |
| Official | Assigned barangay only |

**Example RLS Policy**:
```sql
CREATE POLICY "Admins can view all"
ON seniors FOR SELECT
USING (auth.role() = 'admin' OR barangay = auth.jwt() -> 'barangay');
```

### 3. Role-Based Access Control (RBAC)
Pages and features are restricted based on user roles:
- Reports page: Admin only
- Cross-barangay data: Admin only

### 4. Data Privacy

**Data Collected**:
- Personal information (name, age, address)
- Contact details
- Assistance history
- Document scans

**Data Protection**:
- Encrypted database (Supabase)
- Secure file storage (Cloudinary)
- No public access to sensitive data

## Best Practices

1. **Use strong passwords** — At least 8 characters
2. **Don't share credentials** — Each user should have their own account
3. **Log out when done** — Especially on shared computers
4. **Report issues** — Contact admin if you notice suspicious activity

## Compliance

OSCALink follows data privacy principles:
- Data minimization (only collect what's needed)
- Purpose limitation (use data only for OSCA services)
- Storage limitation (retain records as required by law)
- Integrity and confidentiality (protect against unauthorized access)
