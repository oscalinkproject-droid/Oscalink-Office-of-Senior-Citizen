# OSCALink (Office for Senior Citizen Affairs Link)

A web-based municipal portal for senior citizen management, assistance processing, appointment scheduling, and compliance reporting for Cotabato City, Philippines.

## Quick Start for Developers

1. **Clone the repository** (Private Repo)
2. **Install dependencies**:
   ```bash
   cd web
   npm install
   ```
3. **Environment Setup**:
   - Check `web/.env.local` to ensure it matches your environment.
   - Copy `web/.env.example` to `web/.env.local` and fill in missing secret keys if needed.

4. **Run Development Server**:
   ```bash
   cd web
   npm run dev
   ```

5. **Run E2E Tests** (optional):
   ```bash
   cd web
   npx playwright test
   ```

## Documentation

- [User Documentation](./docs/README.md)
- [System Reference](./docs/SYSTEM_OVERVIEW.md)
- [Role Map & Permissions](./docs/oscalink_role_map.md)
- [Login Credentials](./docs/CREDENTIALS.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.2.4 (Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 4 |
| **Animations** | Framer Motion 12 (LazyMotion — deferred bundle) |
| **Fonts** | Inter, Manrope (Google Fonts) |
| **Icons** | Material Symbols Outlined |
| **Database / Auth** | Supabase (PostgreSQL + RLS) |
| **Email** | Resend |
| **Media Storage** | Cloudinary |
| **Testing** | Playwright (E2E) |
| **Hosting** | Vercel |

## Role Overview

| Role | Key | Access |
|------|-----|--------|
| OSCA Head | `osca_head` | Full system — super admin |
| OSCA Staff | `admin` | City-wide operations |
| MSWD Officer | `mswd_officer` | Verification & social programs |
| Barangay Official | `official` | Own barangay only (sector-locked) |
| Para-Social Worker | `para_social_worker` | Barangay data gatherer (sector-locked, read-heavy) |
| Mayor | `mayor` | View-only executive reports |
| Senior Citizen | `resident` | Own profile & requests only |

## Deployment

When deploying to Vercel, set the **Root Directory** to `web` in the project settings.

Live URL: **https://osca-link.vercel.app**

---

*Last Updated: May 2026*
