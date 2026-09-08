# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: web\tests\roles.spec.ts >> OSCA Roles Functionality >> Full Rotation Simulation
- Location: web\tests\roles.spec.ts:4:7

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]') to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - link "OL OSCALink" [ref=e6] [cursor=pointer]:
            - /url: /dashboard
            - generic [ref=e7]: OL
            - text: OSCALink
          - link "System Hub" [ref=e9] [cursor=pointer]:
            - /url: /dashboard
        - generic [ref=e10]:
          - generic:
            - generic: search
          - textbox "Search Records (Name or ID)..." [ref=e11]
          - generic:
            - generic: ⌘
            - generic: K
        - generic [ref=e12]:
          - button "sensors" [ref=e13]:
            - generic [ref=e14]: sensors
          - button "notifications_active" [ref=e16]:
            - generic [ref=e17]: notifications_active
          - button "User menu" [ref=e19] [cursor=pointer]:
            - generic [ref=e20]: H
    - generic [ref=e21]:
      - complementary [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e25]: shield_person
          - generic [ref=e26]:
            - heading "OSCA Head" [level=3] [ref=e27]
            - paragraph [ref=e28]: OSCA Head (Super Admin)
        - navigation [ref=e29]:
          - link "dashboard Dashboard" [ref=e31] [cursor=pointer]:
            - /url: /dashboard
            - generic [ref=e32]: dashboard
            - generic [ref=e33]: Dashboard
          - button "Citizen Registry keyboard_arrow_down" [ref=e36] [cursor=pointer]:
            - generic [ref=e37]: Citizen Registry
            - generic [ref=e38]: keyboard_arrow_down
          - button "Operations keyboard_arrow_down" [ref=e41] [cursor=pointer]:
            - generic [ref=e42]: Operations
            - generic [ref=e43]: keyboard_arrow_down
          - button "Administration keyboard_arrow_down" [ref=e46] [cursor=pointer]:
            - generic [ref=e47]: Administration
            - generic [ref=e48]: keyboard_arrow_down
        - generic [ref=e49]:
          - button "help_outline Support" [ref=e50]:
            - generic [ref=e51]: help_outline
            - text: Support
          - button "logout Logout" [ref=e52]:
            - generic [ref=e53]: logout
            - text: Logout
      - main [ref=e54]:
        - generic [ref=e55]:
          - generic [ref=e56]:
            - heading "Operational Overview" [level=1] [ref=e57]
            - paragraph [ref=e58]: Real-time civic performance metrics and strategic resource allocation for Cotabato City.
          - generic [ref=e59]:
            - generic [ref=e60]:
              - generic [ref=e62]:
                - generic [ref=e63]: Total Residents
                - generic [ref=e64]: group
              - generic [ref=e65]:
                - generic [ref=e66]: "3"
                - generic [ref=e67]: +12% from last month
            - generic [ref=e68]:
              - generic [ref=e70]:
                - generic [ref=e71]: Active Accounts
                - generic [ref=e72]: verified
              - generic [ref=e74]: "0"
            - generic [ref=e75]:
              - generic [ref=e77]:
                - generic [ref=e78]: Urgent Complaints
                - generic [ref=e79]: gavel
              - generic [ref=e81]: "0"
            - generic [ref=e82]:
              - generic [ref=e84]:
                - generic [ref=e85]: Deceased Verified
                - generic [ref=e86]: history
              - generic [ref=e88]: "0"
          - generic [ref=e90]:
            - generic [ref=e91]:
              - generic [ref=e92]:
                - generic [ref=e93]:
                  - heading "Demographic Velocity" [level=3] [ref=e94]
                  - paragraph [ref=e95]: Age group distribution
                - generic [ref=e96]:
                  - generic [ref=e97]: Census
                  - generic [ref=e99]: Projected
              - generic [ref=e101]:
                - generic [ref=e102]:
                  - generic [ref=e104] [cursor=pointer]: "0"
                  - generic [ref=e106] [cursor=pointer]: "0"
                  - generic [ref=e108] [cursor=pointer]: "0"
                  - generic [ref=e110] [cursor=pointer]: "0"
                  - generic [ref=e112] [cursor=pointer]: "0"
                  - generic [ref=e114] [cursor=pointer]: "0"
                - generic [ref=e115]:
                  - generic [ref=e116]: 60-64
                  - generic [ref=e117]: 65-69
                  - generic [ref=e118]: 70-74
                  - generic [ref=e119]: 75-79
                  - generic [ref=e120]: 80-84
                  - generic [ref=e121]: 85+
            - generic [ref=e122]:
              - generic [ref=e123]:
                - generic [ref=e124]:
                  - heading "Status Distribution" [level=3] [ref=e125]
                  - paragraph [ref=e126]: Current resident state
                - generic [ref=e128]:
                  - generic [ref=e129]:
                    - img [ref=e130]
                    - generic:
                      - generic: "3"
                      - generic: Total
                  - generic [ref=e134] [cursor=pointer]:
                    - generic [ref=e136]: Pending
                    - generic [ref=e137]: "3"
              - generic [ref=e138]:
                - generic [ref=e139]:
                  - heading "Registration Trend" [level=3] [ref=e140]
                  - paragraph [ref=e141]: Monthly intake velocity
                - generic [ref=e142]:
                  - img [ref=e143]
                  - generic [ref=e158]:
                    - generic [ref=e159]: Nov
                    - generic [ref=e160]: Dec
                    - generic [ref=e161]: Jan
                    - generic [ref=e162]: Feb
                    - generic [ref=e163]: Mar
                    - generic [ref=e164]: Apr
            - generic [ref=e165]:
              - generic [ref=e167]:
                - heading "Sector Distribution" [level=3] [ref=e168]
                - paragraph [ref=e169]: Population by sector
              - generic [ref=e172]:
                - generic [ref=e173]: Rosary Heights XI
                - generic [ref=e174]: Mother Poblacion
          - generic [ref=e175]:
            - heading "Today's Schedule" [level=4] [ref=e176]
            - paragraph [ref=e178]: No upcoming appointments
          - generic [ref=e179]:
            - heading "Escalated Complaints" [level=4] [ref=e180]
            - paragraph [ref=e182]: No escalated complaints
        - generic [ref=e183]:
          - generic [ref=e184]: © 2024 OSCALink. Kinetic Precision Engineering.
          - generic [ref=e185]:
            - link "Privacy Policy" [ref=e186] [cursor=pointer]:
              - /url: /privacy
            - generic [ref=e189]: System Status
  - alert [ref=e190]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('OSCA Roles Functionality', () => {
  4  |   test('Full Rotation Simulation', async ({ page }) => {
  5  |     // Set longer timeout for this test
  6  |     test.setTimeout(120000);
  7  | 
  8  |     // Login as Head
  9  |     console.log("Navigating to login...");
  10 |     await page.goto('http://localhost:3000/login');
  11 |     await page.waitForSelector('input[type="email"]');
  12 |     console.log("Filling Head credentials...");
  13 |     await page.fill('input[type="email"]', 'head@gmail.com');
  14 |     await page.fill('input[type="password"]', 'password123');
  15 |     await page.click('button[type="submit"]');
  16 |     await page.waitForURL('**/dashboard', { timeout: 30000 });
  17 |     console.log("Logged in as Head.");
  18 | 
  19 |     await page.goto('http://localhost:3000/requests');
  20 |     await page.waitForLoadState('networkidle');
  21 | 
  22 |     // Check for "Approved" cards
  23 |     const approvedColumn = page.locator('h3:has-text("Approved")').locator('xpath=../..');
  24 |     const firstApproved = approvedColumn.locator('.group.bg-surface-high').first();
  25 |     
  26 |     if (await firstApproved.count() > 0) {
  27 |         console.log("Found an approved card as Head. Verifying final approval power.");
  28 |         await firstApproved.click();
  29 |         await expect(page.locator('text=Advance Request')).toBeVisible();
  30 |         await page.click('button:has-text("Cancel")');
  31 |     } else {
  32 |         console.log("No approved cards found for Head test.");
  33 |     }
  34 | 
  35 |     // Logout (simulated by going to login)
  36 |     console.log("Navigating back to login for Staff...");
  37 |     await page.goto('http://localhost:3000/login');
> 38 |     await page.waitForSelector('input[type="email"]');
     |                ^ Error: page.waitForSelector: Test timeout of 120000ms exceeded.
  39 |     console.log("Filling Staff credentials...");
  40 |     await page.fill('input[type="email"]', 'staff@gmail.com');
  41 |     await page.fill('input[type="password"]', 'password123');
  42 |     await page.click('button[type="submit"]');
  43 |     await page.waitForURL('**/dashboard', { timeout: 30000 });
  44 |     console.log("Logged in as Staff.");
  45 |     
  46 |     await page.goto('http://localhost:3000/requests');
  47 |     await page.waitForLoadState('networkidle');
  48 |     
  49 |     const staffApproved = page.locator('h3:has-text("Approved")').locator('xpath=../..').locator('.group.bg-surface-high').first();
  50 |     if (await staffApproved.count() > 0) {
  51 |         console.log("Found an approved card as Staff. Verifying LACK of final approval power.");
  52 |         await staffApproved.click();
  53 |         const errorToast = page.locator('text=Only OSCA Head can perform final approval');
  54 |         await expect(errorToast).toBeVisible();
  55 |         console.log("Staff restricted successfully.");
  56 |     } else {
  57 |         console.log("No approved cards found for Staff test.");
  58 |     }
  59 |   });
  60 | });
  61 | 
  62 | 
  63 | 
  64 | 
```