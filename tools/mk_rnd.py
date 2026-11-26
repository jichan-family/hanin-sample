from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
d=Document()
sec=d.sections[0]; sec.page_width=Cm(21); sec.page_height=Cm(29.7)
sec.left_margin=sec.right_margin=Cm(2.2); sec.top_margin=Cm(1.8); sec.bottom_margin=Cm(1.6)
st=d.styles['Normal']; st.font.name='맑은 고딕'; st.font.size=Pt(10)
st.element.rPr.rFonts.set(qn('w:eastAsia'),'맑은 고딕')
st.paragraph_format.space_after=Pt(2); st.paragraph_format.line_spacing=1.1
def shade(cell,color):
    tcPr=cell._tc.get_or_add_tcPr(); s=OxmlElement('w:shd'); s.set(qn('w:val'),'clear'); s.set(qn('w:color'),'auto'); s.set(qn('w:fill'),color); tcPr.append(s)
def para(text,bold=False,size=None,align=None,space_before=0,indent=None):
    p=d.add_paragraph(); r=p.add_run(text); r.bold=bold
    if size: r.font.size=Pt(size)
    if align is not None: p.alignment=align
    p.paragraph_format.space_before=Pt(space_before)
    if indent: p.paragraph_format.left_indent=Cm(indent)
    return p
def fixw(t,widths):
    t.autofit=False
    tbl=t._tbl; grid=tbl.tblGrid
    for i,gc in enumerate(grid.findall(qn('w:gridCol'))): gc.set(qn('w:w'),str(int(widths[i]*567)))
    for row in t.rows:
        for i,c in enumerate(row.cells): c.width=Cm(widths[i])
    tblPr=tbl.tblPr; lay=OxmlElement('w:tblLayout'); lay.set(qn('w:type'),'fixed'); tblPr.append(lay)
def table(rows,widths,center_cols=()):
    t=d.add_table(rows=len(rows),cols=len(rows[0])); t.style='Table Grid'; t.alignment=WD_TABLE_ALIGNMENT.CENTER
    for i,row in enumerate(rows):
        for j,v in enumerate(row):
            c=t.cell(i,j); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            c.text=''; p=c.paragraphs[0]; r=p.add_run(v); r.font.size=Pt(9.5)
            if i==0: r.bold=True; shade(c,'E8EDF3'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
            elif j in center_cols: p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    fixw(t,widths); return t
t=d.add_table(rows=1,cols=1); t.style='Table Grid'; t.alignment=WD_TABLE_ALIGNMENT.CENTER
c=t.cell(0,0); p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=p.add_run('연구개발용 화학물질 확인서'); r.bold=True; r.font.size=Pt(16)
p.paragraph_format.space_before=Pt(4); p.paragraph_format.space_after=Pt(4); fixw(t,[11])
para('1. 화학물질의 안전관리 계획',True,11.5,space_before=12)
para('○ 안전관리자 배치현황',True,10.5,space_before=2,indent=0.3)
table([['안전관리자','성명','직위','연락처'],['제조,수입자','{{제조자}}','{{제조직위}}','{{제조연락처}}'],['연구개발기관','{{기관안전}}','{{기관직위}}','{{기관연락처}}']],[3.6,3.6,3.6,4.8],center_cols=(0,1,2,3))
para('○ 취급 시 주의사항 등',True,10.5,space_before=8,indent=0.3)
table([['구 분','주요내용'],['취급 시\n주의사항','{{주의_취급}}'],['저장·보관\n방법','{{주의_저장}}'],['폭발·화재·누출 시\n대처방법','{{주의_화재}}']],[3.4,12.2],center_cols=(0,))
para('2. 화학물질의 사후처리 계획',True,11.5,space_before=12)
para('○ 연구개발 종료 후 화학물질의 잔량과 연구성과물을 아래의 처리업체를 통해 적법하게 폐기처리 할 것입니다.',False,10,space_before=2,indent=0.3)
table([['사후처리기관','처리업체','운반업체'],['{{사후1}}','{{처리업체}}','{{운반업체}}'],['{{사후2}}','{{처리업체}}','{{운반업체}}']],[5.2,5.2,5.2],center_cols=(0,1,2))
para('○ 목적 및 용도가 변경될 경우 화평법 제10조에 따라 등록의무를 이행할 것입니다.',False,10,space_before=6,indent=0.3)
para('○ 연구개발계획단위 내 0.1ton 이상 화학물질을 제조·수입한 경우 사후처리결과를 한국환경공단으로 제출합니다.',False,10,space_before=2,indent=0.3)
para('3. 화학물질의 이동·이송 계획',True,11.5,space_before=12)
table([['이동·이송 방법','화학물질 수령업체 주소','보관창고(장소)','운송업체 정보'],['{{이송방법}}','{{수령주소}}','{{보관창고}}','{{운송업체}}']],[3.2,5.6,4.2,2.6],center_cols=(0,1,2,3))
para('{{날짜}}',False,11,WD_ALIGN_PARAGRAPH.CENTER,space_before=16)
p=para('{{회사명}} {{대표}}  (인) ',False,11,WD_ALIGN_PARAGRAPH.CENTER,space_before=4)
p.add_run().add_picture('out/stamp_blank.png',width=Cm(1.5))
d.save('out/rnd_tpl.docx')
