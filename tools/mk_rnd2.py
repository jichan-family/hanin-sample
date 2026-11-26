# 연구개발용 화학물질 확인서 — 원본(한글) 모양에 맞춘 양식
from docx import Document
from docx.shared import Pt, Cm, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
SANS, SERIF = '맑은 고딕', '바탕'
d = Document()
s = d.sections[0]; s.page_width = Cm(21); s.page_height = Cm(29.7)
s.left_margin = s.right_margin = Cm(2.1); s.top_margin = Cm(2.4); s.bottom_margin = Cm(1.8)
st = d.styles['Normal']; st.font.name = SANS; st.font.size = Pt(10); st.element.rPr.rFonts.set(qn('w:eastAsia'), SANS)
st.paragraph_format.space_after = Pt(0); st.paragraph_format.space_before = Pt(0); st.paragraph_format.line_spacing = 1.0
W = 16.8
def font(r, name, size, bold=False):
    r.font.name = name; r.font.size = Pt(size); r.bold = bold
    r._element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), name)
def shade(c, fill):
    p = c._tc.get_or_add_tcPr(); e = OxmlElement('w:shd'); e.set(qn('w:val'), 'clear'); e.set(qn('w:color'), 'auto'); e.set(qn('w:fill'), fill); p.append(e)
def cellmar(t, top=30, bottom=30, lr=80):
    pr = t._tbl.tblPr; m = OxmlElement('w:tblCellMar')
    for k, v in (('top', top), ('left', lr), ('bottom', bottom), ('right', lr)):
        e = OxmlElement('w:' + k); e.set(qn('w:w'), str(v)); e.set(qn('w:type'), 'dxa'); m.append(e)
    pr.append(m)
def fixw(t, ws):
    t.autofit = False
    for i, g in enumerate(t._tbl.tblGrid.findall(qn('w:gridCol'))): g.set(qn('w:w'), str(int(ws[i] * 567)))
    for row in t.rows:
        for i, c in enumerate(row.cells): c.width = Cm(ws[i])
    e = OxmlElement('w:tblLayout'); e.set(qn('w:type'), 'fixed'); t._tbl.tblPr.append(e)
def para(text='', fn=SERIF, size=12, bold=False, align=None, before=0, after=0, left=0, hang=0, line=1.0, keep=False):
    p = d.add_paragraph(); pf = p.paragraph_format; pf.keep_with_next = keep
    pf.space_before = Pt(before); pf.space_after = Pt(after); pf.line_spacing = line
    if left or hang: pf.left_indent = Cm(left); pf.first_line_indent = Cm(-hang)
    if align is not None: p.alignment = align
    if text: font(p.add_run(text), fn, size, bold)
    return p
def table(rows, ws, heights=None, hang_cols=()):
    t = d.add_table(rows=len(rows), cols=len(rows[0])); t.style = 'Table Grid'; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    cellmar(t)
    for i, row in enumerate(rows):
        if heights and heights[i]: t.rows[i].height = Cm(heights[i]); t.rows[i].height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
        for j, v in enumerate(row):
            c = t.cell(i, j); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            lines = v.split('\n'); c.text = ''
            for k, ln in enumerate(lines):
                p = c.paragraphs[0] if k == 0 else c.add_paragraph()
                pf = p.paragraph_format; pf.line_spacing = 1.0
                if i == 0: font(p.add_run(ln), SANS, 10.5, True); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                elif j in hang_cols: font(p.add_run(ln), SANS, 10); pf.left_indent = Cm(0.28); pf.first_line_indent = Cm(-0.28)
                else: font(p.add_run(ln), SANS, 10.5); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            if i == 0: shade(c, 'D9D9D9')
    fixw(t, ws)
    for ri, row in enumerate(t.rows):
        trPr = row._tr.get_or_add_trPr(); cs = OxmlElement('w:cantSplit'); trPr.append(cs)
        if ri < len(t.rows) - 1:
            for c in row.cells:
                for p in c.paragraphs: p.paragraph_format.keep_with_next = True
    return t
# 제목
t = d.add_table(rows=1, cols=1); t.style = 'Table Grid'; t.alignment = WD_TABLE_ALIGNMENT.CENTER
t.rows[0].height = Cm(1.45); t.rows[0].height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
c = t.cell(0, 0); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER; shade(c, 'F2F2F2')
p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; font(p.add_run('연구개발용 화학물질 확인서'), SANS, 16, True); fixw(t, [W])
para('1. 화학물질의 안전관리 계획', SERIF, 12.5, True, before=16, after=6, keep=True)
para('○  안전관리자 배치현황', SERIF, 12, True, before=2, after=3, left=0.25, keep=True)
table([['안전관리자', '성명', '직위', '연락처'], ['제조,수입자', '{{제조자}}', '{{제조직위}}', '{{제조연락처}}'], ['연구개발기관', '{{기관안전}}', '{{기관직위}}', '{{기관연락처}}']], [3.6, 3.9, 3.9, 5.4])
para('○  취급 시 주의사항 등', SERIF, 12, True, before=14, after=3, left=0.25, keep=True)
table([['구 분', '주요내용'], ['취급 시\n주의사항', '{{주의_취급}}'], ['저장·보관\n방법', '{{주의_저장}}'], ['폭발·화재·누출 시\n대처방법', '{{주의_화재}}']], [3.6, 13.2], hang_cols=(1,))
para('2. 화학물질의 사후처리 계획', SERIF, 12.5, True, before=10, after=8, keep=True)
p = para('', left=1.0, hang=0.6, line=1.55, after=4, keep=True)
for txt, b in (('○  연구개발 종료 후 화학물질의 잔량과 연구성과물을 ', False), ('아래의 처리업체', True), ('를 통해 적법하게 폐기처리 할 것입니다.', False)): font(p.add_run(txt), SERIF, 12, b)
from docx.enum.text import WD_BREAK
p.add_run().add_break(WD_BREAK.PAGE)  # 원본처럼 사후처리 표부터 2쪽
table([['사후처리기관', '처리업체', '운반업체'], ['{{사후1}}', '{{처리업체}}', '{{운반업체}}'], ['{{사후2}}', '{{처리업체}}', '{{운반업체}}']], [5.6, 5.6, 5.6])
para('○  목적 및 용도가 변경될 경우 화평법 제10조에 따라 등록의무를 이행할 것입니다.', SERIF, 11.5, before=8, left=1.0, hang=0.6, line=1.55)
para('○  연구개발계획단위 내 0.1ton 이상 화학물질을 제조·수입한 경우 사후처리결과를 한국환경공단으로 제출합니다.', SERIF, 11.5, before=6, left=1.0, hang=0.6, line=1.55)
para('3. 화학물질의 이동·이송 계획', SERIF, 12.5, True, before=12, after=6, keep=True)
table([['이동·이송 방법', '화학물질 수령업체 주소', '보관창고(장소)', '운송업체 정보'], ['{{이송방법}}', '{{수령주소}}', '{{보관창고}}', '{{운송업체}}']], [3.6, 4.9, 4.3, 4.0], heights=[0, 1.6])
para('{{날짜}}', SANS, 12, align=WD_ALIGN_PARAGRAPH.CENTER, before=26, keep=True)
p = para('', align=WD_ALIGN_PARAGRAPH.CENTER, before=14)
font(p.add_run('{{회사명}}  {{대표}}   (인)'), SERIF, 13)
r = p.add_run(); r.add_picture('/home/claude/tpl/out/stamp_blank.png', width=Cm(1.6))
d.save('/home/claude/tpl/out/rnd_tpl2.docx'); print('ok')
