import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await (await b.new_context(viewport={'width':1440,'height':950})).new_page()
        logs=[]; pg.on('dialog',lambda d: asyncio.ensure_future(d.accept())); pg.on('pageerror',lambda e: logs.append('ERR '+str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_function("document.querySelectorAll('.struct svg').length>30",timeout=30000)
        await pg.click('#lockBtn'); await pg.fill('#pwIn','1185'); await pg.click('#pwBox button.primary'); await pg.wait_for_timeout(2500)
        await pg.evaluate("navTo('settings')"); await pg.click('#setTabs button:has-text("업데이트")'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='u1.png')
        await pg.fill('#upRepo','https://github.com/jichan-family/hanin-sample'); await pg.click('button[onclick="saveUpRepo()"]'); await pg.wait_for_timeout(600)
        await pg.screenshot(path='u2.png')
        await pg.click('#upGo'); await pg.wait_for_timeout(600); await pg.screenshot(path='u3.png')
        print(logs); await b.close()
asyncio.run(main())
