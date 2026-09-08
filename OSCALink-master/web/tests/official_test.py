from playwright.sync_api import sync_playwright
import time
import os

def test_barangay_official():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("--- STARTING TEST: BARANGAY OFFICIAL ---")

        # 1. Login
        print("Step 1: Logging in as official@gmail.com...")
        page.goto('http://localhost:3000/login')
        page.fill('input[type="email"]', 'official@gmail.com')
        page.fill('input[type="password"]', 'official123')
        page.click('button[type="submit"]')
        
        # Wait and check for error messages
        time.sleep(2)
        if "Invalid login credentials" in page.content():
            print("Login FAILED: Invalid credentials.")
            page.screenshot(path='login_failed.png')
            browser.close()
            return

        # Wait for navigation to dashboard
        try:
            page.wait_for_url('**/dashboard', timeout=10000)
            print("Login successful.")
        except Exception as e:
            print(f"Login timed out or failed. Current URL: {page.url}")
            page.screenshot(path='login_timeout.png')
            browser.close()
            return

        # 2. Check Sector Locking in Directory
        print("Step 2: Verifying Sector Locking in Directory...")
        page.goto('http://localhost:3000/directory')
        page.wait_for_load_state('networkidle')
        
        # Take screenshot of directory
        page.screenshot(path='test_directory_official.png')
        
        # Check if they see seniors from other barangays
        # We'll check the text content of the table
        content = page.content()
        
        # Assume 'Barangay 4A' is the official's sector
        # We should check if they see 'Barangay 4A' and NOT others like 'Barangay 17'
        has_correct_sector = "Barangay 4A" in content
        has_other_sector = "Barangay 17" in content or "Barangay 1" in content
        
        print(f"Contains 'Barangay 4A': {has_correct_sector}")
        print(f"Contains other barangays: {has_other_sector}")

        # 3. Check Verifications access
        print("Step 3: Checking Verifications access...")
        page.goto('http://localhost:3000/verifications')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='test_verifications_official.png')
        
        # Officials should have access if they can verify seniors
        v_content = page.content()
        can_see_verifications = "Verification Queue" in v_content
        print(f"Can see Verifications page: {can_see_verifications}")

        # 4. Check Reports access (should be blocked)
        print("Step 4: Checking Reports access (should be blocked)...")
        page.goto('http://localhost:3000/reports')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='test_reports_official.png')
        
        r_content = page.content()
        # If it's a 404 or just doesn't show report content
        is_blocked_from_reports = "Analytical Intelligence" not in r_content
        print(f"Blocked from city-wide reports: {is_blocked_from_reports}")

        # Summary
        print("--- TEST SUMMARY ---")
        print(f"Sector Locking: {'PASS' if has_correct_sector and not has_other_sector else 'FAIL'}")
        print(f"Verifications Access: {'PASS' if can_see_verifications else 'FAIL'}")
        print(f"Reports Blocked: {'PASS' if is_blocked_from_reports else 'FAIL'}")

        browser.close()

if __name__ == "__main__":
    test_barangay_official()
