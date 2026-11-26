import re, zipfile, sys
def inline_to_anchor(xml, dx=-0.95, dy=-0.55):
    # 마지막 그림(직인)을 글자 기준 떠 있는 그림으로: (인) 위에 겹치게
    i = xml.rfind('<wp:inline'); j = xml.find('</wp:inline>', i) + len('</wp:inline>')
    blk = xml[i:j]
    ns = ' '.join(re.findall(r'xmlns:\w+="[^"]*"', blk[:blk.find('>')]))
    ext = re.search(r'<wp:extent cx="(\d+)" cy="(\d+)"/>', blk)
    inner = blk[blk.find('<wp:extent'):blk.rfind('</wp:inline>')]
    inner = re.sub(r'<wp:effectExtent[^>]*/>', '', inner)
    inner = inner.replace(ext.group(0), ext.group(0) + '<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>', 1)
    emu = lambda cm: int(cm * 360000)
    anc = ('<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251660288" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" ' + ns + '>'
           '<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="character"><wp:posOffset>%d</wp:posOffset></wp:positionH>'
           '<wp:positionV relativeFrom="line"><wp:posOffset>%d</wp:posOffset></wp:positionV>' % (emu(dx), emu(dy))) + inner + '</wp:anchor>'
    return xml[:i] + anc + xml[j:]
def rewrite(src, dst, fn):
    zi = zipfile.ZipFile(src); zo = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        b = zi.read(it.filename)
        if it.filename == 'word/document.xml': b = fn(b.decode('utf8')).encode('utf8')
        zo.writestr(it, b)
    zo.close()
if __name__ == '__main__':
    rewrite(sys.argv[1], sys.argv[2], inline_to_anchor)
