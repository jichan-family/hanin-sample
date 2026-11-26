import asyncio
from playwright.async_api import async_playwright
TXT="""한인-218 | | bis{3-methyl-2-[(3-methyl-1,3-benzothiazol-2(3H)-ylidene)methyl]-5-phenyl-1,3-benzoxazol-3-ium} naphthalene-1,5-disulfonate
DA-02 | O=Cc1ccccc1Oc1ccc(cc1-c1ccccc1)C1(c2ccccc2-c2ccccc21)c1ccc(Oc2ccccc2C=O)c(c1)-c1ccccc1 | 2,2'-x | 흰색 파우더 | 원료 | 동우화인켐 | 남궁진웅 | 한인 |
DPNF-MOBA | C=CC(=O)OCc1ccccc1Oc1ccc(cc1-c1ccccc1)C1(c2ccc3ccccc3c2)c2ccccc2-c2ccccc21 | {2-...} prop-2-enoate"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await (await b.new_context(viewport={'width':1440,'height':950})).new_page()
        logs=[]; pg.on('dialog',lambda d: asyncio.ensure_future(d.accept())); pg.on('pageerror',lambda e: logs.append('ERR '+str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_function("document.querySelectorAll('.struct svg').length>30",timeout=30000)
        await pg.click('#lockBtn'); await pg.fill('#pwIn','1185'); await pg.click('#pwBox button.primary'); await pg.wait_for_timeout(800)
        no=await pg.evaluate("S.samples.find(s=>/^한인-\\d+$/.test(s['관리번호']))['관리번호']"); print('no',no); await pg.evaluate("navTo('settings')"); await pg.click('#setTabs button:has-text("여러 개 등록")'); await pg.wait_for_timeout(300)
        await pg.fill('#bkIn',TXT.replace('한인-218',no)); await pg.click('button[onclick="bulkRun(false)"]'); await pg.wait_for_timeout(600); await pg.screenshot(path='b1.png',full_page=True)
        await pg.click('#bkGo'); await pg.wait_for_timeout(600); await pg.screenshot(path='b2.png')
        sid=await pg.evaluate("S.samples.find(s=>s['제품명']==='DA-02').id")
        print(await pg.evaluate("[S.samples.length, 0, S.samples.find(s=>s['제품명']==='DPNF-MOBA')['분자식']]"))
        # detail with shipments
        shp=await pg.evaluate("S.data['출고'][0]['샘플id']")
        await pg.evaluate(f"closeAllModals(); navTo('list'); showDetail('{shp}')"); await pg.wait_for_timeout(400); await pg.screenshot(path='b3.png')
        await pg.set_viewport_size({'width':700,'height':800}); await pg.evaluate("openForm(S.samples[3].id)"); await pg.wait_for_timeout(500); await pg.screenshot(path='b4.png')
        print(logs); await b.close()
asyncio.run(main())
