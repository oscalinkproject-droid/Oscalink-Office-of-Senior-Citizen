# Opencode Directive: OSCALink Institutional Landing Page

**Directive for 'opencode'**: Provide the following prompt to initiate the development of the OSCALink landing page.

---

### 🛡️ DEVELOPMENT DIRECTIVE: OSCALink Premium Landing Page

**CONTEXT**: OSCALink is graduating into an institutional municipal portal for Cotabato City. We need a professional front-facing landing page at the root route (`/`).

**CRITICAL SPECIFICATIONS**:
1. **Theme**: Premium Glassmorphism. Use smooth gradients (Blue/Primary) and subtle micro-animations.
2. **Branding**: Use "OSCALink Cotabato City" institutional terminology throughout.
3. **Hero Component**:
   - Headline: "Digital Governance for Our Senior Citizens"
   - Subheadline: "The official institutional portal for monitoring, assistance, and record management in the Office for Senior Citizen Affairs."
   - Main CTA: "Access Administrative Portal" (Link to `/login`).
4. **Information Hub (Public)**:
   - Provide non-sensitive data blocks: "Our Services" (Medical Support, Financial Aid, Burial Assistance).
   - "Institutional Hotlines" section for public inquiry.
5. **Logic Move**:
   - Ensure the current automatic redirect to `/login` is removed for the root index.
   - Any guest visiting `oscalink.gov` (localhost:3000) should see this page first.

---

## Technical Mapping
- **New File**: `src/app/page.tsx` (Move existing logic or create fresh landing).
- **Existing Login**: `src/app/login/page.tsx` remains for the secure gateway.
- **Assets**: Use the glassmorphism design system tokens defined in the project.

**Goal**: Establish a premium first impression for the OSCA Cotabato City brand.
