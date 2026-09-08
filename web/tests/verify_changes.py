"""
OSCALink: Verification test for implemented changes.
"""
from playwright.sync_api import sync_playwright
import sys

BASE_URL = "http://localhost:3000"
HEAD_EMAIL = "head@gmail.com"
STAFF_EMAIL = "staff@gmail.com"
PASSWORD = "password123"

def login(page, email, password):
    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', email)
    page.fill('input[type="password"]', password)
    page.click('button[type="submit"]')
    page.wait_for_url("**/dashboard", timeout=30000)
    page.wait_for_load_state("networkidle")
    print(f"  Logged in as {email}")

passed = 0
failed = 0

def check(description, condition, detail=""):
    global passed, failed
    if condition:
        print(f"  [PASS] {description} {detail}")
        passed += 1
    else:
        print(f"  [FAIL] {description} {detail}")
        failed += 1

def run(context):
    # --- OSCA HEAD tests ---
    print("\n=== OSCA HEAD Tests ===")
    page = context.new_page()
    login(page, HEAD_EMAIL, PASSWORD)

    # Test 1: No NEW CASE on /requests
    page.goto(f"{BASE_URL}/requests")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    count = page.get_by_text("NEW CASE", exact=True).count()
    check("No NEW CASE button", count == 0, f"(found {count})")

    # Test 2: Requests page still works
    title_count = page.get_by_text("Assistance Requests").count()
    check("Requests page loads", title_count > 0)

    # Test 3: No NEW COMPLAINT for Head
    page.goto(f"{BASE_URL}/complaints")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    count = page.get_by_text("NEW COMPLAINT", exact=True).count()
    check("No NEW COMPLAINT for Head", count == 0, f"(found {count})")

    # Test 4: Settings institutional config visible (was bugged)
    page.goto(f"{BASE_URL}/settings")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    count = page.get_by_text("Institutional Configuration").count()
    check("Settings institutional config visible", count > 0, f"(found {count})")

    # Test 5: Payout section exists
    page.goto(f"{BASE_URL}/dashboard")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    count = page.get_by_text("Payout Schedule").count()
    check("Payout section exists on dashboard", count > 0, f"(found {count})")

    # Test 6: Reschedule UI exists
    page.goto(f"{BASE_URL}/timeline/appointments")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    actions_count = page.locator("th", has_text="Actions").count()
    reschedule_count = page.get_by_text("Reschedule", exact=True).count()
    check("Reschedule Actions column exists", actions_count > 0, f"(found {actions_count})")
    # Reschedule button only shows for Scheduled appointments - may be 0 if none exist
    print(f"    Reschedule buttons (visible for Scheduled appts): {reschedule_count}")

    page.close()

    # --- STAFF tests ---
    print("\n=== OSCA Staff Tests ===")
    page = context.new_page()
    login(page, STAFF_EMAIL, PASSWORD)

    # Test 7: No NEW CASE for Staff
    page.goto(f"{BASE_URL}/requests")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    count = page.get_by_text("NEW CASE", exact=True).count()
    check("No NEW CASE for Staff", count == 0, f"(found {count})")

    # Test 8: Staff can still see complaints (they can manage complaints)
    page.goto(f"{BASE_URL}/complaints")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    complaints_title = page.get_by_text("Complaints Registry").count()
    check("Staff sees Complaints page", complaints_title > 0)

    page.close()

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        
        try:
            run(context)
        except Exception as e:
            print(f"\n[ERROR] {e}")
            import traceback
            traceback.print_exc()
        
        print(f"\n{'='*50}")
        print(f"RESULTS: {passed} passed, {failed} failed, {passed+failed} total")
        
        browser.close()
        if failed > 0:
            sys.exit(1)

if __name__ == "__main__":
    main()
