# 새 대화에서 이어가기 (Claude용 메모)

## 일하는 규칙 (사용자 요청)
- **수정안은 누적이 기본.** 버그 제보든 수정 요청이든 바로 코드를 고치지 말고 설계서 "수정 대기"에만 쌓는다. 사용자가 "적용"(수정 진행)이라고 할 때만 코드 수정·배포.
- 큰 화면 변경은 적용 때 시험 화면(mock) 스크린샷으로 보여 준다.

- 이 저장소가 기준 코드. releases/<버전>/ = Apps Script에 들어가는 파일, latest.json = 앱이 읽는 최신 버전.
- src/ = 화면 코드 원본(app.js, editor.js, docs.js). src/mk.sh가 Editor/Docs/App.html을 만듦.
- Code.gs, Index.html은 releases/<최신>/ 것을 그대로 고쳐 씀.
- Templates.gs(직인 포함)는 저장소에 없음. 사용자 Apps Script에만 있음. 서류 양식은 Forms.gs(저장소, 업데이트로 교체)가 Templates보다 우선. 양식 만들기: tools/mk_rnd2.py, mk_cas3.py.
- 새 버전 배포: 파일 고침 → releases/<새버전>/ 에 넣고 latest.json 갱신 → push → 사용자가 앱 [설정 → 업데이트] 클릭.
- tools/build.cjs + t1.py/t2.py = 로컬 시험 화면(mock) 만들기·검사. src/mk.sh = v6 js → html + 시험 화면 빌드(라이브러리는 npm에서 받아 web6에 둠: openchemlib, exceljs, jszip, @rdkit/rdkit).
- 구조 좌표: Claude가 SMILES로 등록할 때는 tools/claude_ops.js가 RDKit(CoordGen)으로 배치를 잡음(npm i @rdkit/rdkit, RDKIT_JS로 경로). 앱 안에서는 편집기 [구조 정리], 설정 → 기타 → [모든 구조 정리].
- 직인: 원본 그대로 저장(흰 배경만 투명). 출고사 '직인' 칸은 길면 직인2~10 칸에 나눠 저장(Code.gs LONG_COLS). 확인서 직인 위치는 tools/fix_stamp.py(오른쪽 탭 + 단·문단 기준 고정 — Google PDF 변환이 글자 기준 위치를 모름).
- 설계 문서(수정 이력·수정 대기): https://claude.ai/artifact/NaHJvKMCxWmb93kNr5ftZt
- 앱 주소: https://script.google.com/macros/s/AKfycbx-H45kAzQLNA_t7ZCSGLUJ_UlTk5nB1b2k0f80HQZ12N2kNPj4VEmkdZoum_EYA2k/exec
- 편집 비밀번호는 사용자가 직접 입력. 보안은 신경 쓰지 않아도 됨(회사 방침).

## Claude 입력 통로 (v0.5.3~)
- 앱 주소로 POST: {code, action:'preview'|'apply', ops:[...]}. code = 스크립트 속성 CLAUDE_CODE(사용자가 설정 → 여러 개 등록에서 정함, 대화에서 받음).
- ops: addSample{data} · updateSample{관리번호, data} · addShipment{관리번호, data}. 구조는 tools/claude_ops.js로 계산(smiles → idcode 등).
- v0.5.7~: 같은 묶음 안의 addShipment가 방금 addSample한 관리번호를 찾음(미리보기에서도) → 등록+출고를 한 번에. 용도는 서버에서 '~ 연구개발용'으로 맞춤, 출고 가격은 만원 단위 숫자(300)로 맞춤.
- 용도 규칙: 사용자가 용도를 알려주면 항상 '~ 연구개발용'으로 저장(신고면제 '구체적 용도에 대한 설명').
- 보내는 법: 내장 브라우저에 앱을 연 뒤 javascript_tool로
  `await (await fetch(location.href.split('?')[0], {method:'POST', body: JSON.stringify(req)})).json()`
  (본문은 문자열 → text/plain, preflight 없음). 먼저 preview로 사용자에게 보여주고 apply.
- 기록: 시트 '입력기록'.

## MSDS (v0.5.6~)
- 성분 표(행: 물질명·CAS·함량·면제번호, '나머지' 가능) = MSDS 작성 화면·혼합물 샘플('성분' 칸 JSON) 공용(app.js ctInit/ctResolved).
- 유해성 자료: docs.js SOLV(용매) + BASE_COMPS(기본값) + 시트 '성분사전'(설정 → 성분 사전, 우선). 혼합물 분류 규칙은 docs.js classify.
- 조성 붙여넣기: "HI-SW-01 AgNO3 1.7%, LiCl 2.12% in DMSO" 줄마다 제품 하나. 여러 줄이면 한 번에 Excel.
- 작성 이력: 시트 'MSDS이력' 입력 JSON(성분 포함) → 화면에서 검색·불러오기. [샘플로 저장] = 혼합물 샘플 생성.
- 15번 규제 중 산안법·화관법은 기본값이 '확인 필요' — 사용자 확인 후 사전에서 고침.
- v0.5.7 MSDS 엑셀: 출고사 'MSDS양식'에 따라 docs.js buildMsdsHanin(ExcelJS, 기존 회사 양식 비슷하게·내용은 E열 한 칸·병합은 머리말 상자·구성성분 표만) / buildMsdsLs(받은 엘에스켐 파일을 틀로 JSZip+DOMParser로 칸 값만 바꿈, 성분 3개 이상이면 33행 복사해 아래를 밀어냄, 그림문자는 B20에 새로 그림). 틀·로고는 Forms.gs FORMS.msdsLs·logoHanin(tools/mk_msds_tpl.py로 만듦).
- 엘에스켐 1번 권고 용도는 앱 값(기본 '연구개발용')을 씀 — 원본의 '감압점착제…'를 쓸지는 사용자에게 아직 확인 안 함.

## 화면 공통 (v0.5.7~)
- 저장·삭제 버튼은 app.js busy()로 감쌈('저장 중…', 끝나면 창 닫고 toast '저장됨', 오류면 창 유지). 새 저장 함수도 같은 방식으로.
- 창 닫기는 글자 [닫기](.sh .x) + Esc. 넓은 곳 표시는 coFull('한인' → '한인정밀화학'), 저장 값은 '한인'.
- 신고면제: [+ 신청 기록]은 신청 칸만, 통지는 기록 줄의 [통지서 넣기](exNoticeFor) → 확인 후 저장하면 통지 완료. 줄마다 [삭제].
- 단량체 사전 [CAS로 구조 채우기] = 서버 pubchemByCas(CAS → SMILES) → RDKit 정리 → 미리보기 후 저장.
- 시험: /home/claude/t7.py(화면), nt/t.cjs(MSDS 엑셀을 node에서 만들어 LibreOffice로 PDF 확인).
