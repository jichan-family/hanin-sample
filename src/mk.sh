#!/bin/bash
# v6 js → html, 시험 화면 빌드
set -e; VER=${VER:-v0.5.5}; DT=${DT:-2026-11-27}
cd /home/claude/v6 && python3 - "$VER" "$DT" <<'P'
import sys
V=f'{sys.argv[1]} · 최종 수정 {sys.argv[2]}'
for n,f,t in [('Editor','editor.js',''),('Docs','docs.js',''),('App','app.js',' type="module"')]:
    open(n+'.html','w').write(f"<!-- 한인정밀화학 샘플 관리 — {n}.html · 버전 {V} -->\n<script{t}>\n"+open(f).read()+"\n</script>\n")
P
cd /home/claude/web6 && node build.cjs && sed -i "s#https://cdn.jsdelivr.net/npm/@rdkit/rdkit@[^/]*/dist/#./#g" index.html
echo built
