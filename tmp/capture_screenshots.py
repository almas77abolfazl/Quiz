import os
import sys
import time
from playwright.sync_api import sync_playwright

output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'review-screenshots'))
os.makedirs(output_dir, exist_ok=True)

viewports = [
    {'name': 'mobile', 'width': 390, 'height': 844},
    {'name': 'desktop', 'width': 1440, 'height': 900}
]

routes = ['/login', '/']

screenshots_taken = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    for vp in viewports:
        context = browser.new_context(
            viewport={'width': vp['width'], 'height': vp['height']},
            device_scale_factor=1
        )
        page = context.new_page()
        
        # Capture console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        
        for route in routes:
            url = f"http://localhost:4200{route}"
            print(f"Navigating to {url} ({vp['name']} {vp['width']}x{vp['height']})...")
            
            page.goto(url)
            page.wait_for_load_state("networkidle")
            time.sleep(1) # Extra stability
            
            clean_route = route.replace('/', '_').strip('_') or 'home'
            filename = f"{clean_route}_{vp['name']}_{vp['width']}x{vp['height']}.png"
            filepath = os.path.join(output_dir, filename)
            
            page.screenshot(path=filepath, full_page=False)
            screenshots_taken.append(filepath)
            print(f"Captured: {filepath}")
            
            if console_errors:
                print(f"Console errors on {route}: {console_errors}")
                
        context.close()
        
    browser.close()

print("\nAll screenshots captured successfully:")
for path in screenshots_taken:
    print(path)

