#!/usr/bin/env python3
"""Render the 3 promo screenshots for the spot-the-difference entry.

Each shot is a real render of game/index.html in a desktop Chrome viewport,
captured from the canvas via CDP (Page.captureScreenshot with a clip).
"""
import asyncio, base64, os, sys
from patchright.async_api import async_playwright

CHROME = "/home/ubuntu/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome"
BASE = os.environ.get("SHOT_BASE", "http://127.0.0.1:8123")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "screenshots")
SHOTS = [
    ("1-start.jpg", "?shot=start&seed=1"),
    ("2-play.jpg", "?shot=play&seed=1"),
    ("3-clear.jpg", "?shot=end&seed=1"),
]

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(
            headless=True, executable_path=CHROME,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
                  "--hide-scrollbars", "--force-device-scale-factor=1"],
        )
        pg = await b.new_page(viewport={"width": 1280, "height": 720})
        for name, q in SHOTS:
            await pg.goto(f"{BASE}/{q}", wait_until="load", timeout=30000)
            try:
                await pg.wait_for_function("window.__shotReady === true", timeout=8000)
            except Exception:
                pass
            await pg.wait_for_timeout(900)
            path = os.path.join(OUT, name)
            await pg.screenshot(path=path, type="jpeg", quality=88)
            print(f"{name}: {os.path.getsize(path)} bytes")
        await b.close()

asyncio.run(main())