// 한인정밀화학 샘플 관리 — Code.gs · 버전 v0.5.2 · 최종 수정 2026-11-26 · 최초 제작 2026-11-25

var APP_VERSION = 'v0.5.3';
var APP_UPDATED = '2026-11-26';
var APP_CREATED = '2026-11-25';

// 처음 setup()을 실행할 때만 편집 비밀번호로 저장됩니다(이미 저장된 비밀번호는 바꾸지 않음).
var SETUP_PASSWORD = '1185';

var TABLES = {
  '샘플': ['id', '제품명', '물질명', '종류', '원액용액', '용매농도', 'CAS', '분자식', '분자량',
    'idcode', '좌표', '검색값', '명의', '고객사', '성상', '용도', '비고',
    '등록일', '출처', '원본번호', '검증', '취소', '수정일', '고객사담당자', '단량체', '원본',
    '관리회사', '관리번호', '개질', '기타회사'],
  '출고': ['id', '샘플id', '제품명', '명의', '고객사', '고객사담당자', '요청일', '요청내용', '수량', '함량',
    '체크', '출고일', '비고', '등록일', '수정일', '제출형태', '필요서류', '서류제출일'],
  '신고면제': ['id', '샘플id', '제품명', '신청일', '기간시작', '기간종료', '통지일', '면제번호', '결과', '사유',
    '통지물질명', '통지CAS', '연간제조량', '비고', '수정일', '서류제출일', '기관', '신청회사'],
  '고객사': ['id', '회사명', '영문명', '주소', '담당자', '연락처', '수정일', '안전관리자', '안전관리자직위', '안전관리자연락처', '보관창고', '필요서류', '메모'],
  '출고사': ['id', '이름', '회사명', '주소', '사업자번호', '대표', '전화', '팩스', '부서', '담당자', '이메일',
    '안전관리자', '안전관리자직위', '안전관리자연락처', '색', '작성서류', 'MSDS양식', '정식', '순서', '직인', '수정일'],
  '단량체': ['id', '약어', '물질명', 'CAS', 'idcode', '좌표', '수정일'],
  'MSDS이력': ['id', '제품명', '양식', '입력', '작성일', '개정차수', '수정일'],
  '설정': ['id', '값', '수정일']
};
var KEY_SAMPLE = '샘플';
var COMPANIES = ['한인', '엘에스켐', '제이와이트리켐', '케미웍스'];

var CHANGELOG = [
  ['v0.1.0', '2026-11-25', '시제품: 샘플 등록, 카드 목록, 글자·구조 검색, 편집 비밀번호'],
  ['v0.2.0', '2026-11-25', '새 구조 편집기(왼쪽 버튼, 드래그 선택, 골격 템플릿), 골격만 비교 검색, 기존 데이터 381건 가져오기, 단량체·고객사 담당자 항목'],
  ['v0.3.0', '2026-11-25', '관리번호, PubChem CAS 검색, 사슬 미리보기, 출고·현황판, 신고면제·통지서 읽기, 자진확인서·CAS 미부여 확인서·단량체 정보·MSDS 생성, 고분자 이름·CAS 후보, 이온 개수 맞추기'],
  ['v0.4.0', '2026-11-25', '새 디자인(왼쪽 메뉴), 이름 변경, 종류별 보기, 카드 상태 배지(신고면제 진행중·서류 제출완료), 서류 제출일, 출고는 조회 모드에서도 입력, 고분자 단량체 구조, MSDS 입력 편의·취소, 설정 탭, 뒤로가기'],
  ['v0.5.0', '2026-11-26', '상세 탭(샘플 정보/출고), 출고 건마다 제출 형태·필요 서류·서류 제출일, 신고면제 기관별, 연구개발용 확인서(직인)·물질 식별정보 PNG, PDF 받기, 파일 이름 규칙, 거래처 관리(고객사·출고사, 기타 출고사), PubChem 이름 추천, 카드·상세 정리, E/Z 표시 숨김, 편집 모드 계속 기억'],
  ['v0.5.1', '2026-11-26', '상세 탭(샘플 정보·신고면제·출고), 서류를 탭 안에서 바로 받기(팝업 없음), 위쪽 한 줄, 정보 세로 한 항목씩, 설명 문구 정리, 버튼 이름 정리'],
  ['v0.5.2', '2026-11-26', '앱 안에서 업데이트(설정 → 업데이트), 새 버전 뒤 자동 정리'],
  ['v0.5.3', '2026-11-26', '샘플 정보에 출고 내역, 출고 서류 탭, 좁은 화면 맞춤·저장 버튼 고정, Claude 입력 통로·여러 개 한 번에 등록']
];

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('한인정밀화학 샘플 관리')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

/** 처음 한 번, 그리고 새 버전을 붙여넣은 뒤 한 번 실행 */
function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(TABLES).forEach(function (name) { ensureSheet_(ss, name); });
  var lg = ss.getSheetByName('변경이력') || ss.insertSheet('변경이력');
  lg.clear();
  lg.getRange(1, 1, CHANGELOG.length + 1, 3).setValues([['버전', '날짜', '내용']].concat(CHANGELOG));
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('EDIT_PASSWORD')) props.setProperty('EDIT_PASSWORD', SETUP_PASSWORD);
  seedDefaults_(ss);
  migrateV5_(ss);
  renameKinds_(ss);
  assignMissingNumbers_(ss);
  return '설정 완료';
}

function ensureSheet_(ss, name) {
  var cols = TABLES[name];
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var head = sh.getLastRow() > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  // 기존 칸 순서는 유지하고, 없는 칸만 뒤에 추가
  var missing = cols.filter(function (c) { return head.indexOf(c) < 0; });
  if (!head.filter(String).length) head = [];
  if (missing.length || !head.length) {
    var newHead = head.filter(String).concat(missing);
    sh.getRange(1, 1, 1, newHead.length).setValues([newHead]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function seedDefaults_(ss) {
  var cust = ss.getSheetByName('고객사');
  if (cust.getLastRow() < 2) {
    writeRow_('고객사', { id: Utilities.getUuid(), 회사명: '동우화인켐', 영문명: 'DONGWOO FINE-CHEM CO., LTD',
      주소: '경기도 평택시 포승읍 포승공단로117번길 35', 담당자: '', 연락처: '' });
  }
  var mono = ss.getSheetByName('단량체');
  if (mono.getLastRow() < 2) {
    var list = [['EHA', '2-Ethylhexyl acrylate', '103-11-7'], ['4-HBA', '4-Hydroxybutyl acrylate', '2478-10-6'],
      ['C24AA', '2-Decyltetradecyl acrylate', '536972-34-6'], ['BPMA', '4-Benzoylphenyl methacrylate', '56467-43-7'],
      ['PEA', 'Phenoxyethyl acrylate', '48145-04-6'], ['HEA', '2-Hydroxyethyl acrylate', '818-61-1'],
      ['BA', 'Butyl acrylate', '141-32-2'], ['MA', 'Methyl acrylate', '96-33-3'],
      ['PEA2', 'Phenol ethoxylate acrylate', '56641-05-5'], ['M130G', 'Polyethylene glycol methyl ether acrylate', '32171-39-4'],
      ['BMA', 'Benzyl methacrylate', '2495-37-6'], ['MPA', '3-Mercaptopropionic acid', '107-96-0'],
      ['V-501', "4,4'-Azobis(4-cyanovaleric acid)", '2638-94-0'], ['AA', 'Acrylic acid', '79-10-7']];
    list.forEach(function (m) { writeRow_('단량체', { id: Utilities.getUuid(), 약어: m[0], 물질명: m[1], CAS: m[2] }); });
  }
  var set = ss.getSheetByName('설정');
  if (set.getLastRow() < 2) {
    writeRow_('설정', { id: '회사정보', 값: JSON.stringify({
      한인: { 회사명: '한인정밀화학(주)', 주소: '경기도 수원시 권선구 오목천로152번길 40, 첨단벤처밸리 1010호', 사업자번호: '134-86-56887',
        대표: '최한영', 전화: '070-4821-4797', 팩스: '070-4821-4798', 부서: '기업부설연구소', 담당자: '유현아', 이메일: 'hyuna1185@gmail.com' },
      엘에스켐: { 회사명: '(주)엘에스켐', 주소: '충북 괴산군 청안면 첨단산단1로 24', 사업자번호: '', 대표: '', 전화: '043-760-7630', 담당자: '' }
    }) });
    writeRow_('설정', { id: '자진확인서수량', 값: '0.01' });
  }
}

var CAUTION_HANDLE = '-몇분간 물로 조심히 씻으시오\n-콘택트렌즈를 제거할 수 있으면 제거하고 씻으시오.\n-들이마신 경우 사람을 공기가 신선한 곳으로 옮기십시오. 호흡하기 쉬운 자세로 안정을 취하게 하시오\n-화학물질을 섭취하거나 흡입한 경우 구강대 구강 소생술을 사용하지 마시오.\n-피부자극성 또는 홍반이 나타나면 의학적인 조치, 조언을 구하시오.';
var CAUTION_STORE = '-건조하고 시원하며 통풍이 잘 되는 곳에 밀폐된 상태로 보관하십시오.\n-식품용기 또는 호환되지 않는 재료와는 별도로 보관한다.';
var CAUTION_FIRE = '-물 포말 이산화탄소분말 소화제\n-화재가 발생한 경우, 자급식 호흡 보호구를 착용할 것\n-피부에 접촉을 피하기 위해서 안전거리를 유지하고 적절한 보호복을 입으십시오.\n-화학 약품은 폐기에 적합하고 밀폐된 용기에 보관하십시오.\n-모든 점화원을 탈거하십시오.\n-방진 공구 및 방폭 장비를 사용한다.';

/** v0.5.0: 출고사 표·고객사 정보·신고면제 기관 채우기 (이미 있으면 건드리지 않음) */
function migrateV5_(ss) {
  var old = {}; readTable_('설정').forEach(function (r) { if (r.id === '회사정보') { try { old = JSON.parse(r['값']); } catch (e) {} } });
  var have = readTable_('출고사').map(function (r) { return r['이름']; });
  var h = old['한인'] || {}, l = old['엘에스켐'] || {};
  var defs = [
    { 이름: '한인', 회사명: h.회사명 || '한인정밀화학(주)', 주소: h.주소 || '경기도 수원시 권선구 오목천로152번길 40, 첨단벤처밸리 1010호', 사업자번호: h.사업자번호 || '134-86-56887',
      대표: h.대표 || '최한영', 전화: h.전화 || '070-4821-4797', 팩스: h.팩스 || '070-4821-4798', 부서: h.부서 || '기업부설연구소', 담당자: h.담당자 || '유현아', 이메일: h.이메일 || 'hyuna1185@gmail.com',
      안전관리자: '최한영', 안전관리자직위: '대표이사', 안전관리자연락처: '01032265100', 색: '#1f6feb',
      작성서류: '연구개발용확인서,CAS미부여확인서,물질식별정보,단량체정보,자진확인서,MSDS', MSDS양식: '한인', 정식: 'Y', 순서: '1' },
    { 이름: '엘에스켐', 회사명: l.회사명 || '(주)엘에스켐', 주소: l.주소 || '충북 괴산군 청안면 첨단산단1로 24', 사업자번호: l.사업자번호 || '', 대표: l.대표 || '', 전화: l.전화 || '043-760-7630',
      담당자: l.담당자 || '', 색: '#1a7f37', 작성서류: 'CAS미부여확인서,물질식별정보,단량체정보,MSDS', MSDS양식: '엘에스켐', 정식: 'Y', 순서: '2' },
    { 이름: '제이와이트리켐', 회사명: '제이와이트리켐', 색: '#c4520a', 작성서류: '', MSDS양식: '한인', 정식: 'Y', 순서: '3' },
    { 이름: '케미웍스', 회사명: '케미웍스', 색: '#6e7781', 작성서류: '', MSDS양식: '한인', 정식: 'Y', 순서: '4' }
  ];
  defs.forEach(function (d) { if (have.indexOf(d.이름) < 0) { d.id = Utilities.getUuid(); writeRow_('출고사', d); } });
  readTable_('고객사').forEach(function (c) {
    if (c['회사명'] === '동우화인켐' && !c['필요서류']) {
      c['안전관리자'] = c['안전관리자'] || '정경문'; c['안전관리자직위'] = c['안전관리자직위'] || '수석'; c['안전관리자연락처'] = c['안전관리자연락처'] || '01050676778';
      c['보관창고'] = c['보관창고'] || '동우화인켐 연구소 시약실'; c['필요서류'] = '자진확인서,MSDS'; c['담당자'] = c['담당자'] || '남궁진웅';
      writeRow_('고객사', c);
    }
  });
  var setIds = readTable_('설정').map(function (r) { return r.id; });
  [['처리업체', '㈜화성에너텍'], ['운반업체', '자체운반'], ['이송방법', '자차로 이송'], ['주의_취급', CAUTION_HANDLE], ['주의_저장', CAUTION_STORE], ['주의_화재', CAUTION_FIRE]]
    .forEach(function (p) { if (setIds.indexOf(p[0]) < 0) writeRow_('설정', { id: p[0], 값: p[1] }); });
  readTable_('신고면제').forEach(function (e) {
    if (!e['기관'] || !e['신청회사']) { e['기관'] = e['기관'] || '동우화인켐'; e['신청회사'] = e['신청회사'] || '한인'; writeRow_('신고면제', e); }
  });
}

/** 기타 출고사를 정식 출고사로: 기존 샘플은 관리번호를 유지하고 관리회사만 바꿈 */
function promoteCompany(pw, name) {
  checkPw_(pw);
  name = String(name || '').trim(); if (!name) throw new Error('이름이 없습니다.');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var list = readTable_('출고사'), row = null;
    list.forEach(function (r) { if (r['이름'] === name) row = r; });
    row = row || { id: Utilities.getUuid(), 이름: name, 회사명: name, 색: '#8250df', 작성서류: 'CAS미부여확인서,물질식별정보,단량체정보,MSDS', MSDS양식: '한인' };
    row['정식'] = 'Y'; row['순서'] = String(list.length + 1); row['수정일'] = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
    writeRow_('출고사', row);
    var moved = [];
    readTable_(KEY_SAMPLE).forEach(function (s) {
      if (s['관리회사'] === '기타' && s['기타회사'] === name) { s['관리회사'] = name; writeRow_(KEY_SAMPLE, s); moved.push(s); }
    });
    return { company: row, samples: moved };
  } finally { lock.releaseLock(); }
}

/** Word·Excel 파일을 구글 드라이브에서 잠깐 변환해 PDF로 돌려줌 (변환 파일은 바로 삭제) */
function toPdf(b64, kind, name) {
  DriveApp.getRootFolder(); // 드라이브 권한 요청용
  var token = ScriptApp.getOAuthToken();
  var src = kind === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var target = kind === 'xlsx' ? 'application/vnd.google-apps.spreadsheet' : 'application/vnd.google-apps.document';
  var boundary = 'xxSAMPLExx' + Date.now();
  var meta = JSON.stringify({ name: '임시변환_' + (name || 'doc'), mimeType: target });
  var body = Utilities.newBlob('--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + boundary + '\r\nContent-Type: ' + src + '\r\n\r\n').getBytes()
    .concat(Utilities.base64Decode(b64)).concat(Utilities.newBlob('\r\n--' + boundary + '--').getBytes());
  var up = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'post', contentType: 'multipart/related; boundary=' + boundary, payload: body, headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  if (up.getResponseCode() !== 200) throw new Error('PDF 변환 실패(올리기): ' + up.getContentText().slice(0, 200));
  var id = JSON.parse(up.getContentText()).id;
  try {
    var url = kind === 'xlsx'
      ? 'https://docs.google.com/spreadsheets/d/' + id + '/export?format=pdf&size=A4&portrait=true&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenum=UNDEFINED&top_margin=0.5&bottom_margin=0.5&left_margin=0.5&right_margin=0.5'
      : 'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=application/pdf';
    var ex = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
    if (ex.getResponseCode() !== 200) throw new Error('PDF 변환 실패(내보내기): ' + ex.getResponseCode());
    return Utilities.base64Encode(ex.getBlob().getBytes());
  } finally {
    UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id, { method: 'delete', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  }
}

function checkPw_(pw) {
  var saved = PropertiesService.getScriptProperties().getProperty('EDIT_PASSWORD');
  if (!saved || String(pw) !== saved) throw new Error('비밀번호가 맞지 않습니다. 편집 모드를 끄고 다시 들어가 주세요.');
}
function verifyPassword(pw) { try { checkPw_(pw); return true; } catch (e) { return false; } }

function readTable_(name) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ensureSheet_(ss, name);
  if (sh.getLastRow() < 2) return [];
  var vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getDisplayValues();
  var head = vals.shift();
  return vals.filter(function (r) { return r[0]; }).map(function (r) {
    var o = {}; head.forEach(function (c, i) { if (c) o[c] = r[i]; }); return o;
  });
}

/** 화면이 처음 열릴 때 전체 데이터를 한 번에 보냄 */
function getAll() {
  autoSetup_();
  var data = {};
  Object.keys(TABLES).forEach(function (n) { data[n] = readTable_(n); });
  return { hasTemplates: typeof TEMPLATES !== 'undefined', version: APP_VERSION, updated: APP_UPDATED, created: APP_CREATED, data: data, today: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd') };
}

function writeRow_(name, obj) {
  var ss = SpreadsheetApp.getActive();
  var sh = ensureSheet_(ss, name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var at = ids.indexOf(String(obj.id));
  var row = head.map(function (c) { return obj[c] == null ? '' : String(obj[c]); });
  var range = at >= 0 ? sh.getRange(at + 2, 1, 1, head.length) : sh.getRange(sh.getLastRow() + 1, 1, 1, head.length);
  range.setNumberFormat('@').setValues([row]);
}

function nextNumber_(company) {
  var max = 0;
  readTable_(KEY_SAMPLE).forEach(function (s) {
    var m = String(s['관리번호']).match(/^(.*)-(\d+)$/);
    if (m && m[1] === company) { var n = parseInt(m[2], 10); if (n > max) max = n; }
  });
  return company + '-' + (max + 1);
}

/** 저장(등록·수정). 표 이름과 행 객체 */
function saveRow(pw, table, obj) {
  checkPw_(pw);
  if (!TABLES[table]) throw new Error('알 수 없는 표: ' + table);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
    if (!obj.id) { obj.id = Utilities.getUuid(); if (TABLES[table].indexOf('등록일') >= 0) obj['등록일'] = now; if (table === KEY_SAMPLE) obj['출처'] = obj['출처'] || '신규'; }
    if (table === KEY_SAMPLE && !obj['관리번호'] && obj['관리회사']) obj['관리번호'] = nextNumber_(obj['관리회사']);
    obj['수정일'] = now;
    writeRow_(table, obj);
    return obj;
  } finally { lock.releaseLock(); }
}

function deleteRow(pw, table, id) {
  checkPw_(pw);
  var sh = SpreadsheetApp.getActive().getSheetByName(table);
  var ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(function (r) { return String(r[0]); });
  var at = ids.indexOf(String(id));
  if (at >= 0) sh.deleteRow(at + 2);
  return true;
}

/** 관리번호가 비어 있는 샘플에 번호 부여(가져오기 직후 setup에서 실행) */
function assignMissingNumbers_(ss) {
  var sh = ss.getSheetByName(KEY_SAMPLE); if (!sh || sh.getLastRow() < 2) return;
  var vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var head = vals[0].map(String), iC = head.indexOf('관리회사'), iN = head.indexOf('관리번호');
  var max = {}; COMPANIES.forEach(function (c) { max[c] = 0; });
  vals.slice(1).forEach(function (r) { var c = r[iC], n = parseInt(String(r[iN]).replace(/[^0-9]/g, ''), 10); if (c && n > (max[c] || 0)) max[c] = n; });
  var changed = false, iM = head.indexOf('명의');
  // 관리회사가 비어 있으면 명의(첫 번째)로 채움 — 기존 이관 데이터는 원래 목록 순서대로 번호가 매겨짐
  vals.slice(1).forEach(function (r) {
    if (!r[iC] && iM >= 0) { var m = String(r[iM]).split(',')[0].trim(); if (m) { r[iC] = COMPANIES.indexOf(m) >= 0 ? m : '기타'; changed = true; } }
  });
  if (changed) sh.getRange(2, iC + 1, vals.length - 1, 1).setNumberFormat('@').setValues(vals.slice(1).map(function (r) { return [r[iC]]; }));
  vals.slice(1).forEach(function (r) { if (r[iC] && !r[iN]) { max[r[iC]] = (max[r[iC]] || 0) + 1; r[iN] = r[iC] + '-' + max[r[iC]]; changed = true; } });
  if (changed) sh.getRange(2, iN + 1, vals.length - 1, 1).setNumberFormat('@').setValues(vals.slice(1).map(function (r) { return [r[iN]]; }));
}

/** PubChem 조회: 구조(SMILES) 또는 이름으로 CAS 후보와 IUPAC 이름 */
function lookupPubChem(q) {
  var base = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/';
  var out = { cas: [], iupac: '', cid: '', found: false, names: [] };
  try {
    var cid = '';
    if (q.smiles) {
      var r = UrlFetchApp.fetch(base + 'compound/smiles/cids/JSON', { method: 'post', payload: { smiles: q.smiles }, muteHttpExceptions: true });
      if (r.getResponseCode() === 200) { var j = JSON.parse(r.getContentText()); cid = j.IdentifierList && j.IdentifierList.CID && j.IdentifierList.CID[0]; }
    } else if (q.name) {
      var rn = UrlFetchApp.fetch(base + 'compound/name/' + encodeURIComponent(q.name) + '/cids/JSON', { muteHttpExceptions: true });
      if (rn.getResponseCode() === 200) { var jn = JSON.parse(rn.getContentText()); cid = jn.IdentifierList && jn.IdentifierList.CID && jn.IdentifierList.CID[0]; }
      if (!cid) { // 고분자 등은 substance로 등록된 경우가 많음
        var rs = UrlFetchApp.fetch(base + 'substance/name/' + encodeURIComponent(q.name) + '/synonyms/JSON', { muteHttpExceptions: true });
        if (rs.getResponseCode() === 200) {
          var js = JSON.parse(rs.getContentText());
          (js.InformationList && js.InformationList.Information || []).forEach(function (inf) { (inf.Synonym || []).forEach(function (s) { addCas_(out.cas, s); }); });
          out.found = out.cas.length > 0; return out;
        }
      }
    }
    if (!cid) return out;
    out.cid = cid; out.found = true;
    var rsy = UrlFetchApp.fetch(base + 'compound/cid/' + cid + '/synonyms/JSON', { muteHttpExceptions: true });
    if (rsy.getResponseCode() === 200) {
      var jsy = JSON.parse(rsy.getContentText());
      ((jsy.InformationList.Information[0] || {}).Synonym || []).forEach(function (s) {
        addCas_(out.cas, s);
        // 짧고 읽기 쉬운 이름만 추천 (CAS·코드번호 제외)
        if (out.names.length < 4 && s.length <= 60 && /[a-z]{3}/i.test(s) && !/^\d+-\d+-\d$/.test(s) && !/^(DTXSID|SCHEMBL|CHEMBL|UNII|EINECS|NSC|AKOS|MFCD|ZINC|CHEBI|BDBM|HY-|CS-|AS-|SY\d)/i.test(s) && !/^[A-Z0-9]{8,}$/.test(s)) {
          if (out.names.map(function (x) { return x.toLowerCase(); }).indexOf(s.toLowerCase()) < 0) out.names.push(s);
        }
      });
    }
    var rp = UrlFetchApp.fetch(base + 'compound/cid/' + cid + '/property/IUPACName/JSON', { muteHttpExceptions: true });
    if (rp.getResponseCode() === 200) { var jp = JSON.parse(rp.getContentText()); out.iupac = jp.PropertyTable.Properties[0].IUPACName || ''; }
    if (out.iupac && out.names.map(function (x) { return x.toLowerCase(); }).indexOf(out.iupac.toLowerCase()) < 0) out.names.push(out.iupac);
  } catch (e) { out.error = String(e); }
  return out;
}
function addCas_(list, s) {
  var m = String(s).match(/^(\d{2,7})-(\d{2})-(\d)$/); if (!m) return;
  var d = (m[1] + m[2]).split('').reverse(), sum = 0;
  d.forEach(function (x, i) { sum += (i + 1) * Number(x); });
  if (sum % 10 === Number(m[3]) && list.indexOf(s) < 0 && list.length < 5) list.push(s);
}

/** 서류 양식(템플릿)을 필요할 때만 보냄 */
function getTemplates() {
  if (typeof TEMPLATES === 'undefined') throw new Error('서류 양식(Templates)을 찾지 못했습니다. Apps Script에서 Templates를 HTML이 아닌 "스크립트" 파일로 만들고 Templates.gs.txt 내용을 붙여넣은 뒤 새 버전으로 배포해 주세요.');
  return TEMPLATES;
}

/** 출고 기록 저장 — 비밀번호 없이(대표님 조회 모드에서도) 가능. 샘플 명의에도 추가 */
function saveShipment(obj) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { return saveShipment_(obj); } finally { lock.releaseLock(); }
}
function saveShipment_(obj) {
  {
    var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
    if (!obj.id) { obj.id = Utilities.getUuid(); obj['등록일'] = now; }
    if (!obj['명의']) throw new Error('명의를 고르세요.');
    obj['수정일'] = now;
    writeRow_('출고', obj);
    var sample = null;
    readTable_(KEY_SAMPLE).forEach(function (s) { if (s.id === obj['샘플id']) sample = s; });
    if (sample) {
      var names = String(sample['명의'] || '').split(',').map(function (x) { return x.trim(); }).filter(String);
      if (names.indexOf(obj['명의']) < 0) { names.push(obj['명의']); sample['명의'] = names.join(','); sample['수정일'] = now; writeRow_(KEY_SAMPLE, sample); }
    }
    return { ship: obj, sample: sample };
  }
}

/** 종류 이름 변경: 단물질→단분자, 이온성액체→이온성물질 */
function renameKinds_(ss) {
  var sh = ss.getSheetByName(KEY_SAMPLE); if (!sh || sh.getLastRow() < 2) return;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String), i = head.indexOf('종류'); if (i < 0) return;
  var rg = sh.getRange(2, i + 1, sh.getLastRow() - 1, 1), v = rg.getValues(), ch = false;
  v.forEach(function (r) { var n = String(r[0]).replace(/단물질/g, '단분자').replace(/이온성액체/g, '이온성물질'); if (n !== r[0]) { r[0] = n; ch = true; } });
  if (ch) rg.setNumberFormat('@').setValues(v);
}


// ---------- 업데이트 (GitHub 저장소 → 이 프로젝트) ----------
var UPDATE_DEPLOYMENT_ID = 'AKfycbx-H45kAzQLNA_t7ZCSGLUJ_UlTk5nB1b2k0f80HQZ12N2kNPj4VEmkdZoum_EYA2k';

/** 새 버전이 처음 열릴 때 setup을 한 번 자동 실행 */
function autoSetup_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('SETUP_VERSION') === APP_VERSION) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    if (p.getProperty('SETUP_VERSION') !== APP_VERSION) { setup(); p.setProperty('SETUP_VERSION', APP_VERSION); }
  } catch (e) { console.error(e); } finally { lock.releaseLock(); }
}

function updRepo_() { return PropertiesService.getScriptProperties().getProperty('UPDATE_REPO') || 'jichan-family/hanin-sample'; }

function setUpdateRepo(pw, repo) {
  checkPw_(pw);
  repo = String(repo || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/+$/, '');
  if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('저장소는 "아이디/저장소이름" 형식으로 입력하세요. 예: jichan-family/hanin-sample');
  PropertiesService.getScriptProperties().setProperty('UPDATE_REPO', repo);
  return repo;
}

function ghRaw_(repo, path) {
  var h = {}, tk = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (tk) h.Authorization = 'token ' + tk;
  var r = UrlFetchApp.fetch('https://raw.githubusercontent.com/' + repo + '/main/' + path + '?t=' + Date.now(), { headers: h, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('저장소에서 ' + path + ' 파일을 읽지 못했습니다 (' + r.getResponseCode() + ')');
  return r.getContentText('UTF-8');
}

function verCmp_(a, b) {
  var x = String(a).replace(/^v/, '').split('.').map(Number), y = String(b).replace(/^v/, '').split('.').map(Number);
  for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
  return 0;
}

function checkUpdate(pw) {
  checkPw_(pw);
  var repo = updRepo_();
  if (!repo) return { current: APP_VERSION, repo: '' };
  var info = JSON.parse(ghRaw_(repo, 'latest.json'));
  return { current: APP_VERSION, repo: repo, latest: info.version, date: info.date || '', notes: info.notes || '', newer: verCmp_(info.version, APP_VERSION) > 0 };
}

function scriptApi_(method, path, body) {
  var o = { method: method, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
  if (body) { o.contentType = 'application/json'; o.payload = JSON.stringify(body); }
  var r = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + ScriptApp.getScriptId() + path, o);
  var c = r.getResponseCode(), t = r.getContentText();
  if (c >= 300) {
    if (/Apps Script API|has not been used|is disabled|not enabled/i.test(t)) throw new Error('Apps Script API 사용 오류 (' + c + '): ' + t.slice(0, 500));
    if (c === 403 || c === 401) throw new Error('권한 오류 (' + c + '): ' + t.slice(0, 300));
    throw new Error('Apps Script API 오류 (' + c + '): ' + t.slice(0, 300));
  }
  return t ? JSON.parse(t) : {};
}

function findDeployment_() {
  var id = PropertiesService.getScriptProperties().getProperty('DEPLOYMENT_ID') || UPDATE_DEPLOYMENT_ID;
  var list = scriptApi_('get', '/deployments').deployments || [];
  if (list.some(function (d) { return d.deploymentId === id; })) return id;
  var web = list.filter(function (d) {
    return d.deploymentConfig && d.deploymentConfig.versionNumber && (d.entryPoints || []).some(function (e) { return e.entryPointType === 'WEB_APP'; });
  });
  if (web.length === 1) return web[0].deploymentId;
  throw new Error('어느 배포를 바꿀지 알 수 없습니다. 스크립트 속성 DEPLOYMENT_ID에 배포 ID를 넣어 주세요.');
}

/** 저장소의 latest.json이 가리키는 버전으로 코드를 바꾸고 배포까지 새 버전으로 */
function applyUpdate(pw) { checkPw_(pw); return doUpdate_(); }

/** 편집기에서 ▶ 실행: 저장소의 최신 코드로 바꾸고 배포까지 */
function updateNow() { ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL); var r = doUpdate_(); Logger.log(r.version + ' 업데이트 완료 · ' + r.files.join(', ') + ' · ' + r.url); return r; }

function doUpdate_() {
  var repo = updRepo_();
  if (!repo) throw new Error('업데이트 저장소가 정해지지 않았습니다.');
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var info = JSON.parse(ghRaw_(repo, 'latest.json'));
    var base = 'releases/' + info.version + '/';
    var cur = (scriptApi_('get', '/content').files || []).map(function (f) { return { name: f.name, type: f.type, source: f.source }; });
    var byName = {}; cur.forEach(function (f) { byName[f.name] = f; });
    var changed = [];
    (info.files || []).forEach(function (f) {
      var src = ghRaw_(repo, base + f.path);
      if (f.type === 'JSON') {
        // 매니페스트는 권한(oauthScopes)만 더함 — 웹 앱 설정은 건드리지 않음
        var m = JSON.parse(byName.appsscript.source), n = JSON.parse(src), set = {};
        (m.oauthScopes || []).concat(n.oauthScopes || []).forEach(function (x) { set[x] = 1; });
        m.oauthScopes = Object.keys(set);
        src = JSON.stringify(m, null, 2);
      }
      if (byName[f.name]) byName[f.name].source = src;
      else { var nf = { name: f.name, type: f.type, source: src }; cur.push(nf); byName[f.name] = nf; }
      changed.push(f.name);
    });
    scriptApi_('put', '/content', { files: cur });
    var v = scriptApi_('post', '/versions', { description: info.version + ' 앱 안 업데이트' });
    var dep = findDeployment_();
    scriptApi_('put', '/deployments/' + dep, { deploymentConfig: { scriptId: ScriptApp.getScriptId(), versionNumber: v.versionNumber, manifestFileName: 'appsscript', description: info.version } });
    return { version: info.version, files: changed, versionNumber: v.versionNumber, url: 'https://script.google.com/macros/s/' + dep + '/exec' };
  } finally { lock.releaseLock(); }
}


// ---------- Claude 입력 통로 · 여러 개 한 번에 등록 ----------
var BATCH_FIELDS_ = ['제품명', '물질명', 'CAS', '종류', '성상', '용도', '고객사', '고객사담당자', '관리회사', '기타회사', '명의', '비고', 'idcode', '좌표', '검색값', '분자식', '분자량'];

/** 웹앱 주소로 JSON을 POST: {code, action:'preview'|'apply', ops:[...]} */
function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var code = PropertiesService.getScriptProperties().getProperty('CLAUDE_CODE');
    if (!code) throw new Error('접속코드가 정해지지 않았습니다. 설정 → Claude 입력에서 정해 주세요.');
    if (String(req.code || '') !== code) throw new Error('접속코드가 맞지 않습니다.');
    out = runBatch_(req.ops || [], req.action === 'apply', 'Claude 입력');
  } catch (err) { out = { ok: false, error: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** 화면의 '여러 개 한 번에 등록'에서 부름 */
function runBatchUi(pw, ops, apply) { checkPw_(pw); return runBatch_(ops || [], !!apply, '여러 개 등록'); }

function setClaudeCode(pw, code) {
  checkPw_(pw);
  code = String(code || '').trim();
  if (code && code.length < 4) throw new Error('접속코드는 4자 이상으로 정해 주세요.');
  PropertiesService.getScriptProperties().setProperty('CLAUDE_CODE', code);
  return code ? '저장됨' : '지움';
}
function hasClaudeCode(pw) { checkPw_(pw); return !!PropertiesService.getScriptProperties().getProperty('CLAUDE_CODE'); }

function pick_(src) { var o = {}; BATCH_FIELDS_.forEach(function (k) { if (src[k] != null && String(src[k]) !== '') o[k] = String(src[k]); }); return o; }

/**
 * ops: {type:'addSample', data:{...}} · {type:'updateSample', 관리번호 or id, data:{...}} · {type:'addShipment', 관리번호 or 샘플id, data:{...}}
 * apply=false면 결과만 미리 보여주고 아무것도 쓰지 않음
 */
function runBatch_(ops, apply, who) {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
    var samples = readTable_(KEY_SAMPLE), max = {};
    samples.forEach(function (s) { var m = String(s['관리번호']).match(/^(.*)-(\d+)$/); if (m) max[m[1]] = Math.max(max[m[1]] || 0, parseInt(m[2], 10)); });
    var find = function (op) {
      var key = op['관리번호'] || op.no, id = op.id || op['샘플id'];
      return samples.filter(function (s) { return (id && s.id === id) || (key && s['관리번호'] === key); })[0];
    };
    var results = ops.map(function (op) {
      try {
        if (op.type === 'addSample') {
          var d = pick_(op.data || {});
          if (!d['제품명']) throw new Error('제품명이 없습니다');
          d['관리회사'] = d['관리회사'] || '한인';
          if (!d['명의']) d['명의'] = d['관리회사'] === '기타' ? (d['기타회사'] || '') : d['관리회사'];
          var dup = samples.filter(function (s) { return s['제품명'] === d['제품명'] || (d.idcode && s.idcode === d.idcode); }).map(function (s) { return s['관리번호'] + ' ' + s['제품명']; });
          var co = d['관리회사'] === '기타' ? '기타' : d['관리회사'];
          max[co] = (max[co] || 0) + 1; d['관리번호'] = co + '-' + max[co];
          if (apply) { d.id = Utilities.getUuid(); d['등록일'] = now; d['수정일'] = now; d['출처'] = who; writeRow_(KEY_SAMPLE, d); samples.push(d); }
          return { ok: true, type: op.type, 관리번호: d['관리번호'], 제품명: d['제품명'], warn: dup.length ? '같은 이름·구조 있음: ' + dup.join(', ') : '' };
        }
        if (op.type === 'updateSample') {
          var s = find(op); if (!s) throw new Error('샘플을 찾지 못했습니다: ' + (op['관리번호'] || op.id));
          var ch = pick_(op.data || {}), diff = {};
          Object.keys(ch).forEach(function (k) { if (String(s[k] || '') !== ch[k]) diff[k] = { 전: s[k] || '', 후: ch[k] }; });
          if (apply && Object.keys(diff).length) { Object.keys(diff).forEach(function (k) { s[k] = ch[k]; }); s['수정일'] = now; writeRow_(KEY_SAMPLE, s); }
          return { ok: true, type: op.type, 관리번호: s['관리번호'], 제품명: s['제품명'], 바뀜: diff };
        }
        if (op.type === 'addShipment') {
          var t = find(op); if (!t) throw new Error('샘플을 찾지 못했습니다: ' + (op['관리번호'] || op['샘플id']));
          var x = {}; Object.keys(op.data || {}).forEach(function (k) { if (TABLES['출고'].indexOf(k) >= 0 && k !== 'id') x[k] = String(op.data[k]); });
          x['샘플id'] = t.id; x['제품명'] = t['제품명']; x['명의'] = x['명의'] || t['관리회사'];
          if (apply) { var rs = saveShipment_(x); if (rs.sample) samples.forEach(function (q, i) { if (q.id === rs.sample.id) samples[i] = rs.sample; }); }
          return { ok: true, type: op.type, 관리번호: t['관리번호'], 제품명: t['제품명'], 고객사: x['고객사'] || '' };
        }
        throw new Error('알 수 없는 작업: ' + op.type);
      } catch (err) { return { ok: false, type: op.type, error: String(err && err.message || err) }; }
    });
    if (apply) {
      var ss = SpreadsheetApp.getActive(), lg = ss.getSheetByName('입력기록') || ss.insertSheet('입력기록');
      if (lg.getLastRow() === 0) lg.appendRow(['시각', '경로', '작업', '관리번호', '제품명', '결과']);
      results.forEach(function (r) { lg.appendRow([now, who, r.type, r['관리번호'] || '', r['제품명'] || '', r.ok ? (r.warn || '완료') : r.error]); });
    }
    return { ok: true, applied: apply, results: results, samples: apply ? readTable_(KEY_SAMPLE) : null, ships: apply ? readTable_('출고') : null };
  } finally { lock.releaseLock(); }
}
