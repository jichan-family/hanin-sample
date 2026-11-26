import zipfile, re, sys
sys.path.insert(0, '/home/claude/tpl'); from anchor import inline_to_anchor
src, dst = '/tmp/T_cas.docx', '/home/claude/tpl/out/cas_tpl3.docx'
z = zipfile.ZipFile(src); x = z.read('word/document.xml').decode()
x = x.replace('<w:pgSz w:w="12240" w:h="15840"/>', '<w:pgSz w:w="11906" w:h="16838"/>')
x = re.sub(r'<w:pgMar [^>]*/>', '<w:pgMar w:top="1134" w:right="1247" w:bottom="1021" w:left="1247" w:header="567" w:footer="567" w:gutter="0"/>', x)
x = x.replace('<w:spacing w:after="600"/>', '<w:spacing w:after="240"/>')
x = x.replace('<wp:extent cx="4320000" cy="2520000"/>', '<wp:extent cx="3960000" cy="2310000"/>').replace('<a:ext cx="4320000" cy="2520000"/>', '<a:ext cx="3960000" cy="2310000"/>')
# 직인: (직인) → 대표 이름 + (인) + 떠 있는 직인 그림
stamp_run = ('<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
  '<wp:extent cx="612000" cy="612000"/><wp:docPr id="20" name="stamp"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
  '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="20" name="stamp.png"/><pic:cNvPicPr/></pic:nvPicPr>'
  '<pic:blipFill><a:blip r:embed="rIdStamp"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="612000" cy="612000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>')
old = '<w:t>{{회사명}}            (직인)</w:t></w:r>'
assert old in x
x = x.replace(old, '<w:t xml:space="preserve">{{회사명}}  대표 {{대표}}   (인)</w:t></w:r>' + stamp_run)
x = inline_to_anchor(x, dx=-1.0, dy=-0.5)
rels = z.read('word/_rels/document.xml.rels').decode().replace('</Relationships>', '<Relationship Id="rIdStamp" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/stamp.png"/></Relationships>')
zo = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
for it in z.infolist():
    b = z.read(it.filename)
    if it.filename == 'word/document.xml': b = x.encode()
    if it.filename == 'word/_rels/document.xml.rels': b = rels.encode()
    zo.writestr(it, b)
zo.write('/home/claude/tpl/out/stamp_blank.png', 'word/media/stamp.png'); zo.close(); print('ok')
