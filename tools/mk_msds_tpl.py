# MSDS 양식 준비: 한인 로고(기존 회사 MSDS에서 잘라냄), 엘에스켐 MSDS 틀(그림문자 그림만 뺌) → Forms.gs FORMS에 넣음
import json, zipfile, io, base64, sys
from PIL import Image
old, ls, forms = sys.argv[1], sys.argv[2], sys.argv[3]
z = zipfile.ZipFile(old); im = Image.open(io.BytesIO(z.read('xl/media/image1.png'))).convert('RGB')
W, H = im.size; l, t, r, b = .02752, .11265, .00689, .13721
im = im.crop((round(W * l), round(H * t), round(W * (1 - r)), round(H * (1 - b))))
im = im.resize((560, round(560 * im.size[1] / im.size[0])), Image.LANCZOS)
bio = io.BytesIO(); im.quantize(colors=96, method=Image.MEDIANCUT).save(bio, 'PNG', optimize=True); logo = base64.b64encode(bio.getvalue()).decode()
zin = zipfile.ZipFile(ls); out = io.BytesIO(); zo = zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED)
for it in zin.infolist():
    n = it.filename
    if n.startswith('xl/media/image') and not n.endswith('image4.png'): continue   # 그림문자(emf/gif) 뺌, 머리말 로고(png)는 둠
    data = zin.read(n)
    if n == 'xl/drawings/drawing1.xml':
        data = b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"></xdr:wsDr>'
    if n == 'xl/drawings/_rels/drawing1.xml.rels': continue
    if n == 'xl/worksheets/sheet1.xml':
        s = data.decode(); s = s.replace(' view="pageLayout"', '').replace('<selection activeCell="B163" sqref="B163:D163"/>', '<selection activeCell="A1" sqref="A1"/>'); data = s.encode()
    zo.writestr(it, data)
zo.close(); lsb = base64.b64encode(out.getvalue()).decode()
s = open(forms, encoding='utf-8').read(); i = s.index('var FORMS = '); j = s.index('\n', i)
d = json.loads(s[i + 12:j].rstrip(';')); d['logoHanin'] = logo; d['msdsLs'] = lsb
s = s[:i] + 'var FORMS = ' + json.dumps(d, ensure_ascii=False) + ';' + s[j:]
s = s.replace('버전 v0.5.6', '버전 v0.5.7', 1)
open(forms, 'w', encoding='utf-8').write(s); print('logo', len(logo), 'ls', len(lsb))
