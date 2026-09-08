# Opencode Architectural Directive: Supabase & Auth Boundary

**Directive for 'opencode'**: Copy and paste the block below into your conversation with opencode to ensure it adheres to the stable OSCALink architecture.

---

### 🛡️ ARCHITECTURAL DIRECTIVE: Supabase Client Boundary

**CONTEXT**: OSCALink uses a dual-client architecture to comply with Next.js 16/19 Server Component standards and Supabase Row-Level Security (RLS).

**CRITICAL RULES**:
1. **DO NOT MERGE** `supabase.ts` and `supabase-server.ts`. They must remain separate.
2. **CLIENT-SIDE components** (Sidebar, Navbar, Login, UI Elements) MUST import from `@/lib/supabase`. This file is 100% safe for the browser.
3. **SERVER-SIDE actions and pages** (Seniors Registry, Dashboard, Reports, Timeline) MUST import from `@/lib/supabase-server`. This ensures session cookies are passed to the database.
4. **SESSION INTEGRITY**: If you use the browser client (`@/lib/supabase`) in a Server Action or Server Page, the database will treat the request as 'Anonymous' and block data insertion/fetching with a 'Database Error' due to RLS policies.

**REASONING**: This separation prevents the 'next/headers' build-time crash and ensures administrative identity persistence across the city-wide platform.

---

## Technical Mapping
| Environment | Module | Target Library |
| :--- | :--- | :--- |
| **Browser** | `login/page.tsx` | `@/lib/supabase` |
| **Browser** | `layout/sidebar.tsx` | `@/lib/supabase` |
| **Server** | `actions/seniors.ts` | `@/lib/supabase-server` |
| **Server** | `actions/requests.ts` | `@/lib/supabase-server` |
| **Server** | `dashboard/page.tsx` | `@/lib/supabase-server` |
| **Server** | `settings/page.tsx` | `@/lib/supabase-server` |
