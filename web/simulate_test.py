import sys
from playwright.sync_api import sync_playwright
import time

def test_login(page, email, password, role_label):
    print(f"\n[Testing {role_label} Login]")
    try:
        page.goto('http://localhost:3000/login')
        page.wait_for_load_state('networkidle')
        
        page.fill('input[type="email"]', email)
        page.fill('input[type="password"]', password)
        page.click('button[type="submit"]')
        
        # Wait for navigation or error
        time.sleep(3)
        
        if "dashboard" in page.url:
            print(f"SUCCESS: {role_label} logged in and redirected to dashboard.")
            # Take a screenshot
            page.screenshot(path=f"test_result_{role_label.replace(' ', '_')}.png")
            # Clear cookies to force logout for next test
            page.context.clear_cookies()
            time.sleep(1)
        else:
            print(f"FAILED: {role_label} login failed or was not redirected. URL: {page.url}")
    except Exception as e:
        print(f"ERROR testing {role_label}: {str(e)}")

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Separate context for each test is cleaner but let's just reuse and clear cookies
        context = browser.new_context()
        page = context.new_page()
        
        # 1. Test OSCA Head
        test_login(page, 'head@gmail.com', 'password123', 'OSCA Head')
        
        # 2. Test OSCA Staff
        test_login(page, 'staff@gmail.com', 'password123', 'OSCA Staff')
        
        # 3. Test Barangay Official
        test_login(page, 'official@gmail.com', 'password123', 'Barangay Official')
        
        # 4. Test Resident
        print("\n[Testing Resident Login]")
        try:
            page.goto('http://localhost:3000/resident/login')
            page.fill('input[placeholder*="OSC-"]', 'OSC-20260419-9762')
            page.fill('input[type="date"]', '1966-04-15')
            page.click('button:has-text("Sign In")')
            time.sleep(3)
            if "resident/dashboard" in page.url:
                print("SUCCESS: Resident logged in and redirected to portal.")
            else:
                print(f"FAILED: Resident login failed. URL: {page.url}")
        except Exception as e:
             print(f"ERROR testing Resident: {str(e)}")

        browser.close()

if __name__ == "__main__":
    run_tests()
