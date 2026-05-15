import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
        )
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page.goto('http://localhost:3000', wait_until='networkidle')
        await page.wait_for_timeout(2000)
        await page.screenshot(path=r'Product/autotrader/ui-screenshot.png', full_page=False)
        print('Screenshot saved to Product/autotrader/ui-screenshot.png')
        await browser.close()

asyncio.run(main())
