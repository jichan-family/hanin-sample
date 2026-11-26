# 새 대화에서 이어가기 (Claude용 메모)

- 이 저장소가 기준 코드. releases/<버전>/ = Apps Script에 들어가는 파일, latest.json = 앱이 읽는 최신 버전.
- src/ = 화면 코드 원본(app.js, editor.js, docs.js). src/mk.sh가 Editor/Docs/App.html을 만듦.
- Code.gs, Index.html은 releases/<최신>/ 것을 그대로 고쳐 씀.
- Templates.gs(직인 포함)는 저장소에 없음. 사용자 Apps Script에만 있음.
- 새 버전 배포: 파일 고침 → releases/<새버전>/ 에 넣고 latest.json 갱신 → push → 사용자가 앱 [설정 → 업데이트] 클릭.
- tools/build.cjs + t1.py/t2.py = 로컬 시험 화면(mock) 만들기·검사.
- 설계 문서(수정 이력·수정 대기): https://claude.ai/artifact/NaHJvKMCxWmb93kNr5ftZt
- 앱 주소: https://script.google.com/macros/s/AKfycbx-H45kAzQLNA_t7ZCSGLUJ_UlTk5nB1b2k0f80HQZ12N2kNPj4VEmkdZoum_EYA2k/exec
- 편집 비밀번호는 사용자가 직접 입력. 보안은 신경 쓰지 않아도 됨(회사 방침).
