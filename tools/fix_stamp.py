# v0.5.5: 직인 위치 고침 — Google 문서(PDF 변환)는 '글자 기준' 떠 있는 그림을 몰라 왼쪽 여백에 붙임.
# 서명 줄을 오른쪽 탭(고정 위치 X)에 끝나게 하고, 직인을 단(column)·문단(paragraph) 기준 고정 위치로.
# usage: python3 fix_stamp.py Forms.gs
import re, sys, json, base64, zipfile, io

TW = 635  # 1 twip = 635 EMU
# key: (탭 끝 위치 X[twip], 직인 세로 offset[EMU], 앞 문단 뒤 간격으로 옮길 값[twip])
CFG = {'cas': (6804, -196000), 'rnd': (6572, -169000)}
PAREN = 216  # ')' 폭 + '인' 반 폭 ≈ 0.38cm

def patch(b, key):
    X, dy = CFG[key]
    zi = zipfile.ZipFile(io.BytesIO(b)); x = zi.read('word/document.xml').decode()
    i = x.find('(인)'); ps = max(x.rfind('<w:p>', 0, i), x.rfind('<w:p ', 0, i)); pe = x.find('</w:p>', i) + 6
    p = x[ps:pe]
    # 문단 앞 간격 → 앞 문단 뒤 간격으로 (문단 기준 세로 위치가 글줄 위가 되게)
    mb = re.search(r'w:before="(\d+)"', p); before = int(mb.group(1)) if mb else 0
    if before:
        p = p.replace(mb.group(0), 'w:before="0"', 1)
        pp = max(x.rfind('<w:p>', 0, ps - 1), x.rfind('<w:p ', 0, ps - 1)); prev = x[pp:ps]
        ma = re.search(r'w:after="(\d+)"', prev)
        prev2 = prev.replace(ma.group(0), 'w:after="%d"' % (int(ma.group(1)) + before), 1) if ma else prev.replace('<w:spacing ', '<w:spacing w:after="%d" ' % before, 1)
        x = x[:pp] + prev2 + x[ps:]; ps += len(prev2) - len(prev)
    # 가운데 정렬 → 왼쪽 + 오른쪽 탭
    p = p.replace('<w:jc w:val="center"/>', '<w:tabs><w:tab w:val="right" w:pos="%d"/></w:tabs><w:jc w:val="left"/>' % X, 1)
    # 첫 글자 run 앞에 탭
    rs = p.find('<w:r>'); rpr = re.search(r'<w:rPr>.*?</w:rPr>', p[rs:]).group(0)
    p = p[:rs] + '<w:r>' + rpr + '<w:tab/></w:r>' + p[rs:]
    # 직인 위치
    cx = int(re.search(r'<wp:extent cx="(\d+)"', p).group(1))
    left = (X - PAREN) * TW - cx // 2
    p = re.sub(r'<wp:positionH relativeFrom="character"><wp:posOffset>-?\d+</wp:posOffset></wp:positionH>',
               '<wp:positionH relativeFrom="column"><wp:posOffset>%d</wp:posOffset></wp:positionH>' % left, p)
    p = re.sub(r'<wp:positionV relativeFrom="line"><wp:posOffset>-?\d+</wp:posOffset></wp:positionV>',
               '<wp:positionV relativeFrom="paragraph"><wp:posOffset>%d</wp:posOffset></wp:positionV>' % dy, p)
    assert 'relativeFrom="character"' not in p and 'relativeFrom="line"' not in p
    x = x[:ps] + p + x[x.find('</w:p>', ps) + 6:]
    out = io.BytesIO(); zo = zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        zo.writestr(it, x.encode() if it.filename == 'word/document.xml' else zi.read(it.filename))
    zo.close(); return out.getvalue()

if __name__ == '__main__':
    f = sys.argv[1]; s = open(f, encoding='utf8').read()
    m = re.search(r'var FORMS = (\{.*?\});\n', s, re.S); F = json.loads(m.group(1))
    for k in CFG: F[k] = base64.b64encode(patch(base64.b64decode(F[k]), k)).decode()
    s = s[:m.start(1)] + json.dumps(F, ensure_ascii=False) + s[m.end(1):]
    open(f, 'w', encoding='utf8').write(s); print('ok')
