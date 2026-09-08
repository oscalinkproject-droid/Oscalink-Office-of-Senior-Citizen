# OSCALink — Web Application

This is the Next.js web application for the **OSCALink** platform — the Office for Senior Citizen Affairs digital portal for Cotabato City, Philippines.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
web/
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (dashboard)/       # Protected admin dashboard pages
│   │   ├── barangay/          # Barangay official portal
│   │   ├── resident/          # Senior citizen self-service portal
│   │   ├── api/               # API route handlers
│   │   └── page.tsx           # Public landing page
│   ├── components/
│   │   ├── layout/            # Sidebar, navbar, shell layouts
│   │   ├── providers/         # Global providers (MotionProvider)
│   │   └── ui/                # Reusable UI components
│   ├── lib/                   # Utilities, RBAC, Supabase clients
│   └── actions/               # Next.js Server Actions (DB logic)
├── e2e/                       # Playwright E2E tests
├── supabase/                  # SQL migrations
└── public/                    # Static assets
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npx playwright test` | Run E2E test suite |

## Tech Stack

- **Framework**: Next.js 16.2.4 (React 19, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 with custom design system ("Midnight Institutional" dark theme)
- **Animations**: Framer Motion 12 — using `LazyMotion` + `m.*` for optimized deferred loading
- **Database / Auth**: Supabase (PostgreSQL + Row-Level Security)
- **Email**: Resend
- **Storage**: Cloudinary
- **Testing**: Playwright (E2E, role-based navigation tests)
- **Hosting**: Vercel

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
```

## Deployment

Hosted on **Vercel**. Root directory is set to `web/`.

Live: **https://osca-link.vercel.app**

---

*Last Updated: May 2026*
