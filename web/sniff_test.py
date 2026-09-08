from playwright.sync_api import sync_playwright
import time
import os

def sniff_verification():
    with sync_playwright() as p:
        print(">>> Starting Playwright Sniffing session...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Login as Staff
            print(">>> Step 1: Logging in as Staff...")
            page.goto('http://localhost:3000/login')
            page.wait_for_load_state('networkidle')
            page.fill('input[type="email"]', 'staff@gmail.com')
            page.fill('input[type="password"]', 'password123')
            page.click('button[type="submit"]')
            
            # Wait for dashboard
            page.wait_for_url('**/dashboard', timeout=10000)
            print(">>> Login successful.")

            # 2. Go to Directory
            print(">>> Step 2: Navigating to Directory...")
            page.goto('http://localhost:3000/directory')
            time.sleep(5) # Direct sleep to handle heavy hydration
            print("Current URL after wait:", page.url)

            # 3. Find a Pending Senior and click
            print(">>> Step 3: Finding Pending senior...")
            # Take a screenshot to see what the browser is seeing
            page.screenshot(path="directory_recon.png")
            
            # Use a more generic search for the row
            pending_row = page.locator('text=Lem Lem').first
            if not pending_row.is_visible():
                 # Try searching via the ID
                 print("Lem Lem text not found. Trying registration ID OSC-20260419-2963...")
                 pending_row = page.locator('text=OSC-20260419-2963').first

            if not pending_row.is_visible():
                 print("!!! Target senior not found in UI. Check directory_recon.png")
                 return

            print("Found target. Clicking...")
            pending_row.click()
            time.sleep(2) # Wait for modal to slide in
            
            # 4. Attempt Verification
            print(">>> Step 4: Clicking Verify button in modal...")
            verify_button = page.locator('button:has-text("Verify & Activate Record")')
            verify_button.wait_for(state="visible", timeout=5000)
            
            # Catch console logs
            page.on("console", lambda msg: print(f"BROWSER_CONSOLE: {msg.text}"))
            
            # Click and wait for network activity or crash
            verify_button.click()
            print(">>> Click performed. Waiting for response...")
            
            time.sleep(5) # Give it time to process
            
            if "Active" in page.content():
                print(">>> SUCCESS: Record turned Active in local test.")
            else:
                print(f">>> Current URL after click: {page.url}")
                page.screenshot(path="local_sniff_result.png")
                print(">>> Captured screenshot of result: local_sniff_result.png")

        except Exception as e:
            print(f"!!! SNIFF FATAL ERROR: {str(e)}")
            page.screenshot(path="local_error_crash.png")
        
        finally:
            browser.close()

if __name__ == "__main__":
    sniff_verification()
