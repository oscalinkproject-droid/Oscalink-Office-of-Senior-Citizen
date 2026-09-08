# How Authentication Works

OSCALink uses Supabase Auth for secure user authentication.

## Authentication Flow

```
1. User enters email/password
       │
       ▼
2. Supabase verifies credentials
       │
       ▼
3. JWT (JSON Web Token) created
       │
       ▼
4. Session stored (server + browser)
       │
       ▼
5. User redirected to Dashboard
```

## Session Management

OSCALink uses a **dual-client architecture**:

| Client | Location | Purpose |
|--------|----------|---------|
| `@/lib/supabase` | Browser | Client-side operations |
| `@/lib/supabase-server` | Server | Server-side session |

This ensures:
- Session persists across page navigation
- Row-Level Security (RLS) works correctly
- No authentication errors on data fetch

## Role-Based Access

After login, the system:
1. Reads the user's role from the `profiles` table
2. Applies appropriate permissions
3. Filters data based on assigned barangay

## Security Features

- **Password hashing**: Handled by Supabase
- **Session timeout**: Configured in Supabase
- **RLS enforcement**: Database-level access control
- **Secure tokens**: JWT with proper claims
