cd /home/claude/v6 && python3 - <<'P'
V='v0.5.3 · 최종 수정 2026-11-26'
for n,f,t in [('Editor','editor.js',''),('Docs','docs.js',''),('App','app.js',' type="module"')]:
    open(n+'.html','w').write(f"<!-- 한인정밀화학 샘플 관리 — {n}.html · 버전 {V} -->\n<script{t}>\n"+open(f).read()+"\n</script>\n")
P
mkdir -p /home/claude/web6 && cd /home/claude/web6 && cp -n ../web5/*.js ../web5/notice.pdf . 2>/dev/null; cp -rn ../web5/cmaps . 2>/dev/null
node build.cjs && sed -i "s#https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/#./cmaps/#" index.html
