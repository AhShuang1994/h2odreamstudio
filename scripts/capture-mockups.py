"""Capture desktop + mobile screenshots of wedding premium demos for mockup use."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import time

BASE = Path(__file__).resolve().parent.parent
DEMOS = [
    ("wedding-premium-1", BASE / "demos" / "wedding-premium-1.html"),
    ("wedding-premium-2", BASE / "demos" / "wedding-premium-2.html"),
]
OUT = BASE / "assets" / "portfolio"
OUT.mkdir(parents=True, exist_ok=True)

VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "mobile":  {"width": 390,  "height": 844},
}

with sync_playwright() as p:
    browser = p.chromium.launch()

    for name, html_path in DEMOS:
        url = html_path.as_uri()
        for vp_name, vp in VIEWPORTS.items():
            page = browser.new_page(viewport=vp)
            page.goto(url, wait_until="networkidle")
            # let animations/fonts settle
            time.sleep(2)
            out_path = OUT / f"{name}-{vp_name}.webp"
            page.screenshot(path=str(out_path), type="png")
            # convert to webp via pillow if available
            try:
                from PIL import Image
                img = Image.open(str(out_path))
                webp_path = out_path.with_suffix(".webp")
                img.save(str(webp_path), "WEBP", quality=85)
                if out_path.suffix == ".png" and webp_path.exists():
                    out_path.unlink()
                print(f"  {webp_path.name} ({webp_path.stat().st_size // 1024} KB)")
            except ImportError:
                png_path = out_path.with_suffix(".png")
                if out_path != png_path:
                    out_path.rename(png_path)
                print(f"  {png_path.name} (pillow not available, saved as PNG)")
            page.close()

    browser.close()
    print("Done.")
