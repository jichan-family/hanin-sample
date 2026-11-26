import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':1440,'height':950},accept_downloads=True); pg=await ctx.new_page()
        logs=[]; pg.on('dialog',lambda d: asyncio.ensure_future(d.accept())); pg.on('pageerror',lambda e: logs.append('ERR '+str(e)))
        dls=[]
        async def ondl(d):
            path='/tmp/dl_'+d.suggested_filename.replace('/','_'); await d.save_as(path); dls.append(path)
        pg.on('download',lambda d: asyncio.ensure_future(ondl(d)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_function("document.querySelectorAll('.struct svg').length>30",timeout=30000)
        await pg.click('#lockBtn'); await pg.fill('#pwIn','1185'); await pg.click('#pwBox button.primary'); await pg.wait_for_timeout(800)
        sid=await pg.evaluate("(S.data['신고면제'][0]||{})['샘플id'] || S.samples.find(s=>s.idcode).id")
        await pg.evaluate(f"showDetail('{sid}',false,'ex')"); await pg.wait_for_timeout(400); await pg.screenshot(path='e1.png')
        await pg.click('#xd_rows .docrow:has-text("연구개발용") button:has-text("Word")'); await pg.wait_for_timeout(1500)
        await pg.click('#xd_rows .docrow:has-text("CAS 미부여") button:has-text("Word")'); await pg.wait_for_timeout(1500)
        await pg.click('#xd_rows .docrow:has-text("CAS 미부여") button:has-text("PDF")'); await pg.wait_for_timeout(1500)
        # 통지서 넣기
        await pg.set_input_files('#exRecBox input[type=file]','notice.pdf'); await pg.wait_for_timeout(2500); await pg.screenshot(path='e2.png')
        s2=await pg.evaluate("S.samples.find(s=>s.idcode && !s.CAS && s['물질명']).id")
        await pg.evaluate(f"closeAllModals(); showDetail('{s2}',false,'ex')"); await pg.wait_for_timeout(500)
        await pg.click('#xd_rows .docrow:has-text("물질 식별정보") button:has-text("PNG")'); await pg.wait_for_timeout(1500)
        await pg.click('#xd_rows .docrow:has-text("CAS 미부여") button:has-text("Word")'); await pg.wait_for_timeout(1500)
        print('downloads',dls); print(logs); await b.close()
asyncio.run(main())
