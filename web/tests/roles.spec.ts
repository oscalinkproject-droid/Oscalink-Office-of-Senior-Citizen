import { test, expect } from '@playwright/test';

test.describe('OSCA Roles Functionality', () => {
  test('Full Rotation Simulation', async ({ page }) => {
    // Set longer timeout for this test
    test.setTimeout(120000);

    // Login as Head
    console.log("Navigating to login...");
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[type="email"]');
    console.log("Filling Head credentials...");
    await page.fill('input[type="email"]', 'head@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    console.log("Logged in as Head.");

    await page.goto('http://localhost:3000/requests');
    await page.waitForLoadState('networkidle');

    // Check for "Approved" cards
    const approvedColumn = page.locator('h3:has-text("Approved")').locator('xpath=../..');
    const firstApproved = approvedColumn.locator('.group.bg-surface-high').first();
    
    if (await firstApproved.count() > 0) {
        console.log("Found an approved card as Head. Verifying final approval power.");
        await firstApproved.click();
        await expect(page.locator('text=Advance Request')).toBeVisible();
        await page.click('button:has-text("Cancel")');
    } else {
        console.log("No approved cards found for Head test.");
    }

    // Logout (simulated by going to login)
    console.log("Navigating back to login for Staff...");
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[type="email"]');
    console.log("Filling Staff credentials...");
    await page.fill('input[type="email"]', 'staff@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    console.log("Logged in as Staff.");
    
    await page.goto('http://localhost:3000/requests');
    await page.waitForLoadState('networkidle');
    
    const staffApproved = page.locator('h3:has-text("Approved")').locator('xpath=../..').locator('.group.bg-surface-high').first();
    if (await staffApproved.count() > 0) {
        console.log("Found an approved card as Staff. Verifying LACK of final approval power.");
        await staffApproved.click();
        const errorToast = page.locator('text=Only OSCA Head can perform final approval');
        await expect(errorToast).toBeVisible();
        console.log("Staff restricted successfully.");
    } else {
        console.log("No approved cards found for Staff test.");
    }
  });
});



