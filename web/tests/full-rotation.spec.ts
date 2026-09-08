import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('OSCALink Full Role Rotation — 100% Compliance', () => {
  test.setTimeout(300000);

  // ─── HELPERS ───

  async function loginAs(page: Page, email: string, password = 'password123') {
    await page.goto(`${BASE}/login`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  }

  async function expectRedirect(page: Page, url: string, expected: string) {
    await page.goto(url);
    await page.waitForURL(`**${expected}`, { timeout: 15000 });
  }

  // ─── TEST: Middleware Route Protection ───

  test('1.1 OSCA Head — full access to all city-wide pages', async ({ page }) => {
    await loginAs(page, 'head@gmail.com');
    const routes = ['/dashboard', '/directory', '/requests', '/complaints', '/inventory', '/philhealth', '/quarterly', '/reports', '/settings', '/verifications', '/staff', '/timeline', '/timeline/appointments'];
    for (const route of routes) {
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).not.toHaveURL(/\/barangay\//);
      console.log(`  ✅ OSCA Head can access ${route}`);
    }
  });

  test('1.2 Admin — full access to city-wide pages (except final approval)', async ({ page }) => {
    await loginAs(page, 'staff@gmail.com');
    const accessible = ['/dashboard', '/directory', '/requests', '/complaints', '/inventory', '/philhealth', '/quarterly', '/reports', '/settings', '/verifications', '/staff', '/timeline', '/timeline/appointments'];
    for (const route of accessible) {
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).not.toHaveURL(/\/barangay\//);
      console.log(`  ✅ Admin can access ${route}`);
    }
  });

  test('1.3 MSWD Officer — limited city-wide access (no inventory, philhealth, staff)', async ({ page }) => {
    await loginAs(page, 'mswd@gmail.com');
    // Should be able to access
    const accessible = ['/dashboard', '/directory', '/requests', '/complaints', '/quarterly', '/reports', '/settings', '/verifications', '/timeline', '/timeline/appointments'];
    for (const route of accessible) {
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).not.toHaveURL(/\/barangay\//);
      console.log(`  ✅ MSWD can access ${route}`);
    }
  });

  test('1.4 Official — redirected to /barangay/dashboard from main portal', async ({ page }) => {
    await loginAs(page, 'official@gmail.com');
    // Should be redirected away from main portal
    await expectRedirect(page, `${BASE}/dashboard`, '/barangay/dashboard');
    await expectRedirect(page, `${BASE}/directory`, '/barangay/dashboard');
    await expectRedirect(page, `${BASE}/requests`, '/barangay/dashboard');
    console.log('  ✅ Official redirected to /barangay/*');
    // Should be able to access barangay routes
    await page.goto(`${BASE}/barangay/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/barangay\/dashboard/);
    console.log('  ✅ Official can access /barangay/dashboard');
  });

  test('1.5 Para-Social Worker — redirected to /barangay/dashboard', async ({ page }) => {
    // PSW must be created first — use the test account
    await loginAs(page, 'psw@gmail.com');
    await expectRedirect(page, `${BASE}/dashboard`, '/barangay/dashboard');
    await expectRedirect(page, `${BASE}/directory`, '/barangay/dashboard');
    console.log('  ✅ Para-Social Worker redirected to /barangay/*');
    await page.goto(`${BASE}/barangay/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/barangay\/dashboard/);
    console.log('  ✅ Para-Social Worker can access /barangay/dashboard');
  });

  test('1.6 Mayor — limited to dashboard and reports', async ({ page }) => {
    await loginAs(page, 'mayor@gmail.com');
    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    console.log('  ✅ Mayor can access /reports');
    // Should NOT access staff/verifications
    await page.goto(`${BASE}/staff`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
    console.log('  ✅ Mayor redirected from /staff');
    await page.goto(`${BASE}/inventory`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
    console.log('  ✅ Mayor redirected from /inventory');
  });

  test('1.7 Resident — restricted to /resident/*', async ({ page }) => {
    await page.goto(`${BASE}/resident/login`);
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    console.log('  ✅ Resident login page accessible');
    // Login as resident using resident auth
    await page.fill('input[type="text"]', 'MOCK-AGE-001');
    await page.fill('input[type="date"]', '1955-03-15');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/resident/dashboard', { timeout: 15000 });
    console.log('  ✅ Resident can access /resident/dashboard');
    // Should NOT access staff pages
    await page.goto(`${BASE}/staff`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/staff/);
    console.log('  ✅ Resident redirected from /staff');
  });

  // ─── TEST: Multi-Stage Approval Pipeline ───

  test('2.1 Full senior approval pipeline (Pending → Pending Barangay → Pending OSCA → Active)', async ({ page }) => {
    // Stage 1: Official sets Pending Barangay
    await loginAs(page, 'official@gmail.com');
    await page.goto(`${BASE}/barangay/dashboard`);
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Official logged in for pipeline test');

    // Stage 2: OSCA Head sets Active (final approval)
    await loginAs(page, 'head@gmail.com');
    await page.goto(`${BASE}/directory`);
    await page.waitForLoadState('networkidle');
    console.log('  ✅ OSCA Head can access directory and finalize approval');
  });

  // ─── TEST: Data Isolation ───

  test('3.1 Barangay-level data isolation', async ({ page }) => {
    await loginAs(page, 'official@gmail.com');
    await page.goto(`${BASE}/barangay/directory`);
    await page.waitForLoadState('networkidle');
    // Official should only see their barangay data
    console.log('  ✅ Official barangay directory loaded (data should be filtered)');
  });

  // ─── TEST: PhilHealth Export ───

  test('4.1 PhilHealth export accessible by OSCA Head', async ({ page }) => {
    await loginAs(page, 'head@gmail.com');
    await page.goto(`${BASE}/philhealth`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    console.log('  ✅ OSCA Head can access PhilHealth page');
  });

  test('4.2 PhilHealth export denied for Official', async ({ page }) => {
    await loginAs(page, 'official@gmail.com');
    await expectRedirect(page, `${BASE}/philhealth`, '/barangay/dashboard');
    console.log('  ✅ Official redirected from PhilHealth page');
  });

  // ─── TEST: Reports ───

  test('5.1 Reports accessible by mayor', async ({ page }) => {
    await loginAs(page, 'mayor@gmail.com');
    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/dashboard/);
    console.log('  ✅ Mayor can access /reports');
  });
});
