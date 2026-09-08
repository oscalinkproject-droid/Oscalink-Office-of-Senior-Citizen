from playwright.sync_api import sync_playwright
import json
import time

def test_resident_functionality():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # 1. Verify login works
        print("Testing login for Senior 1...")
        page.goto('http://localhost:3000/resident/login')
        page.wait_for_load_state('networkidle')
        
        page.fill('input[placeholder="e.g., OSC-2024-001234"]', 'OSC-20260419-9762')
        page.fill('input[type="date"]', '1966-04-15')
        page.click('button[type="submit"]')
        
        page.wait_for_url('**/resident/dashboard')
        print("Login successful for Senior 1.")
        
        # Wait for data to load
        page.wait_for_load_state('networkidle')
        time.sleep(2) # Give it extra time for client-side hydration
        
        # Verify self-locking on dashboard
        page.screenshot(path='dashboard_debug.png')
        content = page.content()
        print(f"DEBUG: Dashboard content sample: {content[:500]}")
        if "juan dela cruz" in content.lower():
            print("Verified: Senior 1 sees their own name.")
        else:
            print("ERROR: Senior 1 does NOT see their own name on dashboard.")
            # Check if name is in the DOM at all
            names = page.locator('h1').all_inner_texts()
            print(f"DEBUG: H1 texts: {names}")
            
        # Check if they can see Senior 2's name (Self-Locking check)
        if "erlinda wacan" in content.lower():
            print("SECURITY BREACH: Senior 1 can see Senior 2's name on dashboard!")
        else:
            print("Verified: Senior 1 cannot see Senior 2's name on dashboard.")

        # 3. Test Digital ID display and Appointment timeline
        print("Navigating to profile (Digital ID)...")
        page.goto('http://localhost:3000/resident/dashboard/profile')
        page.wait_for_load_state('networkidle')
        
        if "Virtual OSCA ID" in page.content() or "OSCA ID" in page.content():
            print("Verified: Digital ID section is present.")
        else:
            print("ERROR: Digital ID section missing.")
            
        print("Testing appointment timeline...")
        # Check if timeline is visible (it might be empty but should exist)
        page.goto('http://localhost:3000/resident/dashboard')
        if "Appointments" in page.content():
            print("Verified: Appointments section is present.")
        
        # Try to access Senior 2's profile directly via Supabase if possible? 
        # Actually, the requirement is to verify 'Self-Locking' in the UI/App logic.
        
        browser.close()

if __name__ == "__main__":
    test_resident_functionality()
