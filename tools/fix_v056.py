# v0.5.6: 연구개발용 확인서를 공단 원본(한글) 크기로 — 본문 15pt, 표 12pt, 제목 18pt, 본문 양쪽 정렬
#         확인서 3종 직인을 글자 뒤로(behindDoc)
# usage: python3 fix_v056.py Forms.gs
import re, sys, json, base64, zipfile, io
TW = 635
def rezip(b, fn):
    zi = zipfile.ZipFile(io.BytesIO(b)); out = io.BytesIO(); zo = zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        d = zi.read(it.filename)
        if it.filename == 'word/document.xml': d = fn(d.decode()).encode()
        zo.writestr(it, d)
    zo.close(); return out.getvalue()
behind = lambda x: re.sub(r'(<wp:anchor [^>]*?)behindDoc="0"', r'\1behindDoc="1"', x)
def rnd(x):
    body = x[x.index('<w:body>'):]
    head = x[:x.index('<w:body>')]
    out = []; pos = 0
    for m in re.finditer(r'<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>', body, re.S):
        blk = m.group(0)
        if blk.startswith('<w:tbl>'):
            blk = re.sub(r'<w:sz w:val="2[01]"/>', '<w:sz w:val="24"/>', blk); blk = re.sub(r'<w:szCs w:val="2[01]"/>', '<w:szCs w:val="24"/>', blk)
            # 제목 상자(표 안)
            blk = blk.replace('<w:sz w:val="32"/>', '<w:sz w:val="36"/>').replace('<w:szCs w:val="32"/>', '<w:szCs w:val="36"/>')
        else:
            sig = '(인)' in blk
            blk = re.sub(r'<w:sz w:val="(2[3-6])"/>', '<w:sz w:val="30"/>', blk); blk = re.sub(r'<w:szCs w:val="(2[3-6])"/>', '<w:szCs w:val="30"/>', blk)
            if not sig and 'w:val="center"' not in blk and '<w:jc ' not in blk and re.sub(r'<[^>]+>', '', blk).strip():
                blk = blk.replace('<w:pPr>', '<w:pPr><w:jc w:val="both"/>', 1) if '<w:pPr>' in blk else blk.replace('<w:p>', '<w:p><w:pPr><w:jc w:val="both"/></w:pPr>', 1)
            # 원본은 본문 제목도 보통 굵기(강조 '아래의 처리업체'만 굵게)
            blk = re.sub(r'(<w:r>(?:(?!</w:r>).)*?)<w:b/>((?:(?!</w:r>).)*?<w:t[^>]*>(?!아래의 처리업체)[^<]*</w:t>)', r'\1<w:b w:val="0"/>\2', blk, flags=re.S)
            if sig:  # 15pt 서명 줄: 탭 끝 X, 직인 위치 다시
                X = 6847
                blk = re.sub(r'<w:tab w:val="right" w:pos="\d+"/>', '<w:tab w:val="right" w:pos="%d"/>' % X, blk)
                cx = int(re.search(r'<wp:extent cx="(\d+)"', blk).group(1))
                blk = re.sub(r'(<wp:positionH relativeFrom="column"><wp:posOffset>)-?\d+', lambda mm: mm.group(1) + str((X - 249) * TW - cx // 2), blk)
                blk = re.sub(r'(<wp:positionV relativeFrom="paragraph"><wp:posOffset>)-?\d+', lambda mm: mm.group(1) + '-151000', blk)
        out.append(body[pos:m.start()]); out.append(blk); pos = m.end()
    out.append(body[pos:])
    return behind(head + ''.join(out))
if __name__ == '__main__':
    f = sys.argv[1]; s = open(f, encoding='utf8').read()
    m = re.search(r'var FORMS = (\{.*?\});\n', s, re.S); F = json.loads(m.group(1))
    F['rnd'] = base64.b64encode(rezip(base64.b64decode(F['rnd']), rnd)).decode()
    for k in ('cas', 'selfcheck'): F[k] = base64.b64encode(rezip(base64.b64decode(F[k]), behind)).decode()
    s = s[:m.start(1)] + json.dumps(F, ensure_ascii=False) + s[m.end(1):]
    open(f, 'w', encoding='utf8').write(s); print('ok')
