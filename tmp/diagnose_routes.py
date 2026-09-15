import os
import sys
import time
from playwright.sync_api import sync_playwright

output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'review-screenshots'))
os.makedirs(output_dir, exist_ok=True)

routes = [
    '/login',
    '/',
    '/quiz',
    '/quiz/play',
    '/quiz/result',
    '/1v1',
    '/profile'
]

viewports = [
    {'name': 'mobile', 'width': 390, 'height': 844},
    {'name': 'desktop', 'width': 1440, 'height': 900}
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    for route in routes:
        print(f"\n==========================================")
        print(f"TESTING ROUTE: {route}")
        print(f"==========================================")
        
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        
        logs = []
        warnings = []
        errors = []
        failed_requests = []
        page_errors = []

        page.on("console", lambda msg: 
            errors.append(msg.text) if msg.type == "error" 
            else (warnings.append(msg.text) if msg.type == "warning" else logs.append(msg.text))
        )
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        page.on("requestfailed", lambda req: failed_requests.append(f"{req.url} - {req.failure}"))

        url = f"http://localhost:4200{route}"
        try:
            res = page.goto(url, wait_until="networkidle", timeout=10000)
            status = res.status if res else "No response"
            final_url = page.url
            print(f"Initial status: {status}, Final URL: {final_url}")
        except Exception as e:
            print(f"Navigation exception: {e}")

        time.sleep(1)

        print(f"--- Console Errors ({len(errors)}) ---")
        for err in errors:
            print(f"  [ERROR] {err}")
        print(f"--- Console Warnings ({len(warnings)}) ---")
        for w in warnings:
            print(f"  [WARN] {w}")
        print(f"--- Page Errors ({len(page_errors)}) ---")
        for pe in page_errors:
            print(f"  [PAGE ERROR] {pe}")
        print(f"--- Failed Requests ({len(failed_requests)}) ---")
        for fr in failed_requests:
            print(f"  [FAILED REQ] {fr}")

        context.close()

    browser.close()

