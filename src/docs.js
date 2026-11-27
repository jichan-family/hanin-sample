// ===== 서류 생성: 라이브러리, MSDS 데이터·분류, 엑셀·워드 만들기, 통지서 읽기 =====
(function () {
const LIBS = {
  exceljs: 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  pdfjs: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  pdfworker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  pdfcmaps: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
  rdkit: 'https://cdn.jsdelivr.net/npm/@rdkit/rdkit@2026.9.3/dist/RDKit_minimal.js',
};
const loaded = {};
function loadScript(key) {
  if (!loaded[key]) loaded[key] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = LIBS[key]; s.onload = ok; s.onerror = () => no(new Error(key + ' 라이브러리를 불러오지 못했습니다.')); document.head.appendChild(s); });
  return loaded[key];
}
let tplPromise = null;
function templates() { if (!tplPromise) tplPromise = window.serverCall('getTemplates'); return tplPromise; }
const b64ToBytes = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
const ymd = d => (d || new Date()).toISOString ? new Date(d || Date.now()).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : d;
const safeName = s => String(s || '').replace(/[\\/:*?"<>|]/g, '_').trim();

// ---------- 문구 ----------
const H = {
  H224: '극인화성 액체 및 증기', H225: '고인화성 액체 및 증기', H226: '인화성 액체 및 증기', H302: '삼키면 유해함',
  H304: '삼켜서 기도로 유입되면 치명적일 수 있음', H315: '피부에 자극을 일으킴', H319: '눈에 심한 자극을 일으킴',
  H335: '호흡기계 자극을 일으킬 수 있음', H336: '졸음 또는 현기증을 일으킬 수 있음', H351: '암을 일으킬 것으로 의심됨',
  H361d: '태아에 손상을 일으킬 것으로 의심됨', H361f: '생식능력에 손상을 일으킬 것으로 의심됨',
  H373: '장기간 또는 반복노출 되면 장기에 손상을 일으킬 수 있음', H411: '장기적인 영향에 의해 수생생물에게 유독함', H412: '장기적인 영향에 의해 수생생물에게 유해함',
  H300: '삼키면 치명적임', H301: '삼키면 유독함', H310: '피부와 접촉하면 치명적임', H311: '피부와 접촉하면 유독함', H312: '피부와 접촉하면 유해함',
  H314: '피부에 심한 화상과 눈에 손상을 일으킴', H317: '알레르기성 피부 반응을 일으킬 수 있음', H318: '눈에 심한 손상을 일으킴',
  H400: '수생생물에 매우 유독함', H410: '장기적인 영향에 의해 수생생물에 매우 유독함',
};
const H_ORDER = ['H224', 'H225', 'H226', 'H300', 'H301', 'H302', 'H304', 'H310', 'H311', 'H312', 'H314', 'H315', 'H317', 'H318', 'H319', 'H335', 'H336', 'H351', 'H361d', 'H361f', 'H373', 'H400', 'H410', 'H411', 'H412'];
const P = {
  P201: '사용 전 취급 설명서를 확보하시오.', P202: '모든 안전 예방조치 문구를 읽고 이해하기 전에는 취급하지 마시오.',
  P210: '열, 고온의 표면, 스파크, 화염 및 그 밖의 점화원으로부터 멀리하시오. 금연', P233: '용기를 단단히 밀폐하시오.',
  P240: '용기와 수용설비를 접지하시오.', P241: '방폭형 전기·환기·조명 장비를 사용하시오.', P242: '스파크가 발생하지 않는 도구만을 사용하시오.',
  P243: '정전기 방지 조치를 취하시오.', P260: '분진·흄·가스·미스트·증기·스프레이를 흡입하지 마시오.', P261: '분진·흄·가스·미스트·증기·스프레이의 흡입을 피하시오.',
  P264: '취급 후에는 손을 철저히 씻으시오.', P270: '이 제품을 사용할 때에는 먹거나, 마시거나 흡연하지 마시오.', P271: '옥외 또는 환기가 잘 되는 곳에서만 취급하시오.',
  P273: '환경으로 배출하지 마시오.', P280: '보호장갑·보호의·보안경·안면보호구를 착용하시오.',
  'P301+P310': '삼켰다면 즉시 의료기관(의사)의 진찰을 받으시오.', 'P301+P312': '삼켜서 불편함을 느끼면 의료기관(의사)의 진찰을 받으시오.',
  'P302+P352': '피부에 묻으면 다량의 물로 씻으시오.', 'P303+P361+P353': '피부(또는 머리카락)에 묻으면 오염된 모든 의복은 벗으시오. 피부를 물로 씻으시오/샤워하시오.',
  'P304+P340': '흡입하면 신선한 공기가 있는 곳으로 옮기고 호흡하기 쉬운 자세로 안정을 취하시오.',
  'P305+P351+P338': '눈에 묻으면 몇 분간 물로 조심해서 씻으시오. 가능하면 콘택트렌즈를 제거하시오. 계속 씻으시오.',
  'P308+P313': '노출되거나 노출이 우려되면 의학적인 조치·조언을 구하시오.', P312: '불편함을 느끼면 의료기관(의사)의 진찰을 받으시오.',
  P314: '불편함을 느끼면 의학적인 조치·조언을 구하시오.', P321: '적절한 응급 처치를 하시오.', P330: '입을 씻어내시오.', P331: '토하게 하지 마시오.',
  'P332+P313': '피부 자극이 생기면 의학적인 조치·조언을 구하시오.', 'P337+P313': '눈에 자극이 지속되면 의학적인 조치·조언을 구하시오.',
  'P362+P364': '오염된 의복은 벗고 다시 사용 전 세척하시오.', 'P370+P378': '화재 시 불을 끄기 위해 분말소화제, 이산화탄소, 알코올 포말을 사용하시오.',
  P262: '눈, 피부, 의복에 묻지 않도록 하시오.', P272: '작업장 밖으로 오염된 의복을 반출하지 마시오.', P310: '즉시 의료기관(의사)의 진찰을 받으시오.', P363: '다시 사용 전 오염된 의복은 세척하시오.',
  'P301+P330+P331': '삼켰다면 입을 씻어내시오. 토하게 하지 마시오.', 'P333+P313': '피부 자극성 또는 홍반이 나타나면 의학적인 조치·조언을 구하시오.', 'P361+P364': '오염된 모든 의복은 즉시 벗고 다시 사용 전 세척하시오.',
  P391: '누출물을 모으시오.', 'P403+P233': '환기가 잘 되는 곳에 보관하고 용기는 단단히 밀폐하시오.', 'P403+P235': '환기가 잘 되는 곳에 보관하고 저온으로 유지하시오.',
  P405: '잠금장치가 있는 저장장소에 저장하시오.', P501: '폐기물 관련 법령에 따라 내용물·용기를 폐기하시오.',
};
const HP = {
  H224: ['P210', 'P233', 'P240', 'P241', 'P242', 'P243', 'P280', 'P303+P361+P353', 'P370+P378', 'P403+P235', 'P501'],
  H302: ['P264', 'P270', 'P301+P312', 'P330', 'P501'], H304: ['P301+P310', 'P331', 'P405', 'P501'],
  H315: ['P264', 'P280', 'P302+P352', 'P321', 'P332+P313', 'P362+P364'], H319: ['P264', 'P280', 'P305+P351+P338', 'P337+P313'],
  H335: ['P261', 'P271', 'P304+P340', 'P312', 'P403+P233', 'P405', 'P501'],
  H351: ['P201', 'P202', 'P280', 'P308+P313', 'P405', 'P501'], H373: ['P260', 'P314', 'P501'], H411: ['P273', 'P391', 'P501'], H412: ['P273', 'P501'],
};
HP.H225 = HP.H226 = HP.H224; HP.H336 = HP.H335; HP.H361d = HP.H361f = HP.H351;
HP.H300 = HP.H301 = ['P264', 'P270', 'P301+P310', 'P321', 'P330', 'P405', 'P501'];
HP.H310 = HP.H311 = ['P262', 'P264', 'P270', 'P280', 'P302+P352', 'P310', 'P321', 'P361+P364', 'P405', 'P501'];
HP.H312 = ['P280', 'P302+P352', 'P312', 'P321', 'P362+P364', 'P501'];
HP.H314 = ['P260', 'P264', 'P280', 'P301+P330+P331', 'P303+P361+P353', 'P304+P340', 'P305+P351+P338', 'P310', 'P321', 'P363', 'P405', 'P501'];
HP.H317 = ['P261', 'P272', 'P280', 'P302+P352', 'P321', 'P333+P313', 'P362+P364', 'P501'];
HP.H318 = ['P280', 'P305+P351+P338', 'P310'];
HP.H400 = ['P273', 'P391', 'P501']; HP.H410 = HP.H400;

// ---------- 용매 9종 (검수 필요: 분류는 EU CLP 조화분류 기준, 노출기준·규제는 국내 자료 확인 필요) ----------
const SOLV = {
  EA: { ko: '에틸 아세테이트', name: 'Ethyl acetate', syn: 'Acetic acid ethyl ester, EA', cas: '141-78-6', fp: -4, bp: 77, mp: -84, d: '0.90', vp: '97 hPa (20 °C)', lel: '2.0', uel: '11.5', ait: 427, sol: '80 g/L (20 °C)', waterSol: false,
    cls: { eye: 2, se3: ['H336'] }, ld50: '5,620 mg/kg (쥐)', twa: '400 ppm', un: '1173', unName: 'ETHYL ACETATE' },
  MEK: { ko: '메틸 에틸 케톤', name: 'Methyl ethyl ketone', syn: '2-Butanone, MEK', cas: '78-93-3', fp: -9, bp: 80, mp: -86, d: '0.81', vp: '105 hPa (20 °C)', lel: '1.8', uel: '11.5', ait: 505, sol: '290 g/L (20 °C)', waterSol: false,
    cls: { eye: 2, se3: ['H336'] }, ld50: '2,737 mg/kg (쥐)', twa: '200 ppm, STEL 300 ppm', un: '1193', unName: 'ETHYL METHYL KETONE' },
  ACT: { ko: '아세톤', name: 'Acetone', syn: '2-Propanone, Dimethyl ketone', cas: '67-64-1', fp: -20, bp: 56, mp: -95, d: '0.79', vp: '246 hPa (20 °C)', lel: '2.5', uel: '13', ait: 465, sol: '물과 혼화', waterSol: true,
    cls: { eye: 2, se3: ['H336'] }, ld50: '5,800 mg/kg (쥐)', twa: '500 ppm, STEL 750 ppm', un: '1090', unName: 'ACETONE' },
  TOL: { ko: '톨루엔', name: 'Toluene', syn: 'Methylbenzene, Toluol', cas: '108-88-3', fp: 4, bp: 111, mp: -95, d: '0.87', vp: '29 hPa (20 °C)', lel: '1.1', uel: '7.1', ait: 480, sol: '0.52 g/L (20 °C)', waterSol: false,
    cls: { skin: 2, se3: ['H336'], repr: 'H361d', re2: true, asp: true, chronic: 3 }, ld50: '5,580 mg/kg (쥐)', twa: '50 ppm, STEL 150 ppm', un: '1294', unName: 'TOLUENE' },
  HEX: { ko: '노말 헥산', name: 'n-Hexane', syn: 'Hexane', cas: '110-54-3', fp: -22, bp: 69, mp: -95, d: '0.66', vp: '160 hPa (20 °C)', lel: '1.1', uel: '7.5', ait: 240, sol: '물에 녹지 않음', waterSol: false,
    cls: { skin: 2, se3: ['H336'], repr: 'H361f', re2: true, asp: true, chronic: 2 }, ld50: '> 16,000 mg/kg (쥐)', twa: '50 ppm', un: '1208', unName: 'HEXANES' },
  THF: { ko: '테트라하이드로퓨란', name: 'Tetrahydrofuran', syn: 'THF, Oxolane', cas: '109-99-9', fp: -14, bp: 66, mp: -108, d: '0.89', vp: '170 hPa (20 °C)', lel: '1.5', uel: '12.4', ait: 230, sol: '물과 혼화', waterSol: true,
    cls: { eye: 2, se3: ['H335'], carc: true, ate: 1650 }, ld50: '1,650 mg/kg (쥐)', twa: '50 ppm, STEL 100 ppm', un: '2056', unName: 'TETRAHYDROFURAN', note: '공기와 접촉하면 폭발성 과산화물을 생성할 수 있음' },
  MC: { ko: '디클로로메탄', name: 'Dichloromethane', syn: 'Methylene chloride, MC', cas: '75-09-2', fp: null, bp: 40, mp: -95, d: '1.33', vp: '475 hPa (20 °C)', lel: '13', uel: '22', ait: 556, sol: '13 g/L (20 °C)', waterSol: false,
    cls: { skin: 2, eye: 2, se3: ['H336'], carc: true }, ld50: '> 2,000 mg/kg (쥐)', twa: '50 ppm', un: '1593', unName: 'DICHLOROMETHANE', unClass: '6.1', pg: 'III', note: '국내 분류에서 발암성 구분이 다를 수 있음(1B 여부 확인)' },
  PGMEA: { ko: '프로필렌 글리콜 모노메틸 에테르 아세테이트', name: 'PGMEA', syn: 'Propylene glycol monomethyl ether acetate', cas: '108-65-6', fp: 45.5, bp: 146, mp: -66, d: '0.97', vp: '3.6 hPa (20 °C)', lel: '1.5', uel: '7', ait: 333, sol: '198 g/L (20 °C)', waterSol: false,
    cls: { se3: ['H336'] }, ld50: '6,190 - 10,000 mg/kg (쥐)', twa: '확인 필요', un: '3272', unName: 'ESTERS, N.O.S.' },
  PGME: { ko: '프로필렌 글리콜 모노메틸 에테르', name: 'PGME', syn: '1-Methoxy-2-propanol', cas: '107-98-2', fp: 32, bp: 120, mp: -97, d: '0.92', vp: '12 hPa (20 °C)', lel: '1.6', uel: '13.8', ait: 270, sol: '물과 혼화', waterSol: true,
    cls: { se3: ['H336'] }, ld50: '5,200 mg/kg (쥐)', twa: '100 ppm, STEL 150 ppm', un: '3092', unName: '1-METHOXY-2-PROPANOL' },
};
SOLV.DMSO = { ko: '디메틸 설폭사이드', name: 'Dimethyl sulfoxide', syn: 'DMSO, Methyl sulfoxide', cas: '67-68-5', fp: 87, bp: 189, mp: 18.4, d: '1.10', vp: '0.55 hPa (20 °C)', lel: '2.6', uel: '42', ait: 215, sol: '물과 혼화', waterSol: true,
  cls: {}, ld50: '14,500 mg/kg (쥐)', twa: '해당없음', un: '해당없음', unName: '해당없음', law: { 산안법: '해당없음', 화평법: '기존화학물질' }, note: '피부로 빠르게 흡수되며 녹아 있는 다른 물질을 함께 운반할 수 있음' };
const SOLV_ORDER = ['EA', 'MEK', 'ACT', 'TOL', 'HEX', 'THF', 'MC', 'PGMEA', 'PGME', 'DMSO'];
SOLV_ORDER.forEach(k => { SOLV[k].liquid = true; SOLV[k].key = k; });
// 성분 사전 기본값 (설정 → 성분 사전에서 고치거나 더할 수 있음). cls: ate(경구 mg/kg)·ateDerm·skin(1|2)·eye(1|2)·sens·acute(M)·chronic(1|2|3)·chronicM·ox
const BASE_COMPS = [
  { name: 'Silver nitrate', ko: '질산은', syn: 'AgNO3', cas: '7761-88-8', liquid: false, cls: { ate: 1173, skin: 1, eye: 1, acute: 1000, chronic: 1, chronicM: 100, ox: true }, ld50: '1,173 mg/kg (쥐)', twa: 'TWA 0.01 mg/m³ (은으로서, 가용성 화합물)', un: '1493', unName: 'SILVER NITRATE', unClass: '5.1', pg: 'II',
    law: { 산안법: '확인 필요', 화관법: '확인 필요', 화평법: '기존화학물질' }, note: '산화성 고체 구분2(H272) — 혼합물은 시험으로 판정. EU에서 생식독성 1B 분류 논의 중', src: 'EU CLP 조화분류(Annex VI 047-001-00-2), HSE GB CLP 기술보고서' },
  { name: 'Lithium chloride', ko: '염화리튬', syn: 'LiCl', cas: '7447-41-8', liquid: false, cls: { ate: 526, skin: 2, eye: 2 }, ld50: '526 - 840 mg/kg (쥐)', twa: '해당없음',
    law: { 산안법: '확인 필요', 화관법: '확인 필요', 화평법: '기존화학물질' }, src: 'Sigma-Aldrich·Avantor SDS, NITE GHS 분류' },
  { name: 'Lithium bromide', ko: '브롬화리튬', syn: 'LiBr', cas: '7550-35-8', liquid: false, cls: { ate: 500, skin: 2, eye: 2, sens: true }, ld50: '자료없음 (급성독성 구분4)', twa: '해당없음',
    law: { 산안법: '확인 필요', 화관법: '확인 필요', 화평법: '기존화학물질' }, src: 'Merck SDS (H302, H315, H317, H319)' },
  { name: 'Copper(II) chloride', ko: '염화구리(II)', syn: 'Cupric chloride, CuCl2', cas: '7447-39-4', liquid: false, cls: { ate: 500, ateDerm: 1100, skin: 2, eye: 1, acute: 1, chronic: 1, chronicM: 1 }, ld50: '자료없음 (급성독성 구분4, 경구·경피)', twa: 'TWA 1 mg/m³ (구리 분진·미스트로서)',
    law: { 산안법: '확인 필요', 화관법: '확인 필요', 화평법: '기존화학물질' }, src: 'Merck SDS (H302+H312, H315, H318, H410)' },
  { name: 'Tetrabutylammonium tribromide', ko: '테트라부틸암모늄 트라이브로마이드', syn: 'TBABr3, TBATB', cas: '38932-80-8', liquid: false, cls: { skin: 1, eye: 1 }, ld50: '자료없음', twa: '해당없음', un: '1759', unName: 'CORROSIVE SOLID, N.O.S.', unClass: '8', pg: 'III',
    law: { 산안법: '확인 필요', 화관법: '확인 필요', 화평법: '확인 필요(국내 신고면제 진행 물질)' }, src: 'TCI SDS (H314, UN1759 8급 III)' },
  { name: 'Poly(vinyl alcohol)', ko: '폴리비닐알코올', syn: 'PVA', cas: '9002-89-5', liquid: false, cls: {}, ld50: '> 5,000 mg/kg (쥐)', twa: '해당없음',
    law: { 산안법: '해당없음', 화관법: '해당없음', 화평법: '기존화학물질' }, src: '공급사 SDS (분류 해당없음)' },
];
// 성분 자료 찾기: 용매 키 → 사전(사용자) → 기본값, CAS로
let DICT = [];
function setDict(list) { DICT = (list || []).map(r => { let o = {}; try { o = JSON.parse(r['자료'] || '{}'); } catch (e) {} return Object.assign({ name: r['이름'], ko: r['국문명'] || '', syn: r['이명'] || '', cas: r['CAS'] || '', src: r['출처'] || '', _id: r.id }, o); }); }
const normCas = c => String(c || '').trim();
function compData(c) {
  if (c.key && SOLV[c.key]) return DICT.find(x => normCas(x.cas) === SOLV[c.key].cas) || SOLV[c.key]; // 사전에서 고친 용매가 있으면 그것
  const cas = normCas(c.cas); if (!cas) return null;
  return DICT.find(x => normCas(x.cas) === cas) || SOLV_ORDER.map(k => SOLV[k]).find(x => x.cas === cas) || BASE_COMPS.find(x => x.cas === cas) || null;
}
function findComp(q) { // 이름·약어·CAS로 (정확히 같은 것만)
  const t = String(q || '').trim().toLowerCase(); if (!t) return null;
  const all = [...DICT, ...SOLV_ORDER.map(k => SOLV[k]), ...BASE_COMPS];
  return all.find(x => [x.cas, x.name, x.ko, x.key, ...String(x.syn || '').split(',')].some(v => String(v || '').trim().toLowerCase() === t)) || null;
}

// ---------- 혼합물 분류 (화학물질의 분류·표시 기준의 혼합물 계산 규칙) ----------
function classify(comps) {
  // comps: [{name, pct, s}] — s = 성분 자료(없으면 자료없음)
  const sv = comps.filter(c => c.s && +c.pct > 0).map(c => ({ ...c, pct: +c.pct }));
  const cls = [], hs = new Set(), flags = [];
  const sum = f => sv.filter(c => f(c.s.cls || {})).reduce((a, c) => a + c.pct, 0);
  const K = c => c.s.cls || {};
  // 인화성: 5% 이상 들어간 액체 성분 중 가장 낮은 인화점
  const fl = sv.filter(c => c.s.liquid && c.s.fp != null && c.pct >= 5);
  let flash, flamCat = 0;
  if (fl.length) {
    const fp = Math.min(...fl.map(c => c.s.fp)), bp = Math.min(...fl.map(c => c.s.bp));
    const cat = fp < 23 ? (bp <= 35 ? 1 : 2) : fp <= 60 ? 3 : 0; flash = fp; flamCat = cat;
    if (cat) { cls.push(`인화성 액체 : 구분${cat}`); hs.add(cat === 1 ? 'H224' : cat === 2 ? 'H225' : 'H226'); flags.push(`혼합물 인화점은 용매 값(${fp} °C)으로 추정 — 실측값이 있으면 확인`); }
  }
  // 급성독성: 가산식(ATE)
  const ate = (f, cut, hcode, label) => { const s = sv.reduce((a, c) => a + (f(K(c)) ? c.pct / f(K(c)) : 0), 0); if (!s) return; const v = 100 / s, cat = cut.findIndex(x => v <= x);
    if (cat >= 0) { cls.push(`급성 독성(${label}) : 구분${cat + 1}`); hs.add(hcode[cat]); } };
  ate(k => k.ate, [5, 50, 300, 2000], ['H300', 'H300', 'H301', 'H302'], '경구');
  ate(k => k.ateDerm, [50, 200, 1000, 2000], ['H310', 'H310', 'H311', 'H312'], '경피');
  // 피부 부식성/자극성
  const S1 = sum(k => k.skin === 1), S2 = sum(k => k.skin === 2);
  if (S1 >= 5) { cls.push('피부 부식성/피부 자극성 : 구분1'); hs.add('H314'); }
  else if (10 * S1 + S2 >= 10) { cls.push('피부 부식성/피부 자극성 : 구분2'); hs.add('H315'); }
  // 눈 손상성/자극성
  const E1 = sum(k => k.eye === 1 || k.skin === 1), E2 = sum(k => k.eye === 2);
  if (!hs.has('H314')) {
    if (E1 >= 3) { cls.push('심한 눈 손상성/눈 자극성 : 구분1'); hs.add('H318'); }
    else if (10 * E1 + E2 >= 10) { cls.push('심한 눈 손상성/눈 자극성 : 구분2'); hs.add('H319'); }
  } else cls.push('심한 눈 손상성/눈 자극성 : 구분1');
  if (sv.some(c => K(c).sens && c.pct >= 1)) { cls.push('피부 과민성 : 구분1'); hs.add('H317'); }
  if (sv.some(c => K(c).carc && c.pct >= 1)) { cls.push('발암성 : 구분2'); hs.add('H351'); }
  const repr = sv.filter(c => K(c).repr && c.pct >= 3);
  if (repr.length) { cls.push('생식독성 : 구분2'); repr.forEach(c => hs.add(K(c).repr)); }
  if (sum(k => (k.se3 || []).includes('H336')) >= 20) { cls.push('특정표적장기 독성(1회 노출) : 구분3(마취작용)'); hs.add('H336'); }
  if (sum(k => (k.se3 || []).includes('H335')) >= 20) { cls.push('특정표적장기 독성(1회 노출) : 구분3(호흡기계 자극)'); hs.add('H335'); }
  if (sv.some(c => K(c).re2 && c.pct >= 10)) { cls.push('특정표적장기 독성(반복 노출) : 구분2'); hs.add('H373'); }
  if (sum(k => k.asp) >= 10) { cls.push('흡인 유해성 : 구분1'); hs.add('H304'); flags.push('흡인 유해성: 혼합물 동점도가 20.5 mm²/s(40 °C) 이하일 때만 해당 — 고분자 용액은 점도 확인'); }
  // 수생환경 (M 인자 가산)
  const A1 = sv.reduce((a, c) => a + (K(c).acute ? K(c).acute * c.pct : 0), 0);
  if (A1 >= 25) { cls.push('급성 수생환경 유해성 : 구분1'); hs.add('H400'); }
  const C1 = sv.reduce((a, c) => a + (K(c).chronic === 1 ? (K(c).chronicM || 1) * c.pct : 0), 0), c2 = sum(k => k.chronic === 2), c3 = sum(k => k.chronic === 3);
  if (C1 >= 25) { cls.push('만성 수생환경 유해성 : 구분1'); hs.add('H410'); }
  else if (10 * C1 + c2 >= 25) { cls.push('만성 수생환경 유해성 : 구분2'); hs.add('H411'); }
  else if (100 * C1 + 10 * c2 + c3 >= 25) { cls.push('만성 수생환경 유해성 : 구분3'); hs.add('H412'); }
  if (sv.some(c => K(c).ox)) flags.push('산화성 성분(' + sv.filter(c => K(c).ox).map(c => c.s.name).join(', ') + ') 포함 — 혼합물의 산화성은 시험으로 판정하므로 분류에 넣지 않음. 확인 필요');
  sv.forEach(c => { if (c.s.note) flags.push(`${c.s.name}: ${c.s.note}`); });
  // 그림문자·신호어
  const pic = [], has = (...a) => a.some(h => hs.has(h));
  if ([...hs].some(h => /^H22[456]$/.test(h))) pic.push('GHS02');
  if (has('H314', 'H318')) pic.push('GHS05');
  if (has('H300', 'H301', 'H310', 'H311')) pic.push('GHS06');
  if (has('H304', 'H351', 'H361d', 'H361f', 'H373')) pic.push('GHS08');
  const g07 = ['H302', 'H312', 'H315', 'H317', 'H319', 'H335', 'H336'].filter(h => hs.has(h))
    .filter(h => !(pic.includes('GHS06') && /^H3(02|12)$/.test(h))).filter(h => !(pic.includes('GHS05') && /^H31[59]$/.test(h)));
  if (g07.length) pic.push('GHS07');
  if (has('H400', 'H410', 'H411')) pic.push('GHS09');
  const danger = has('H224', 'H225', 'H304', 'H314', 'H318', 'H300', 'H301', 'H310', 'H311');
  const signal = !hs.size ? '' : danger ? '위험' : '경고';
  const hl = H_ORDER.filter(h => hs.has(h)).filter(h => !(h === 'H318' && hs.has('H314')));
  const pset = []; hl.forEach(h => (HP[h] || []).forEach(p => { if (!pset.includes(p)) pset.push(p); }));
  const pg = { 예방: pset.filter(p => /^P2/.test(p)), 대응: pset.filter(p => /^P3/.test(p)), 저장: pset.filter(p => /^P4/.test(p)), 폐기: pset.filter(p => /^P5/.test(p)) };
  return { cls, h: hl, p: pg, pic, signal, flags, flash, flamCat, sv };
}

// 단일 물질의 H 코드(성분 사전 화면용)
function hOf(d) { const r = classify([{ name: d.name, pct: 100, s: d }]); const h = [...r.h]; if ((d.cls || {}).ox && !h.includes('H272')) h.push('H272'); return h; }
// ---------- MSDS 내용 ----------
// 예전 입력(용질 1개 + 용매 키)을 성분 목록으로
function toComps(inp) {
  if (Array.isArray(inp.성분)) return inp.성분;
  const out = [], u = inp.용질 || {};
  if (u.물질명 || u.cas) out.push({ name: u.물질명 || '', cas: u.cas || '', pct: u.pct, 면제번호: u.면제번호 || '', 종류: inp.용질종류 || '' });
  (inp.용매 || []).forEach(c => { const s = SOLV[c.key]; if (s) out.push({ name: s.name, cas: s.cas, pct: c.pct, key: c.key }); });
  return out;
}
const LAW_SOLV = '관리대상 유해물질, 작업환경측정 대상, 특수건강진단 대상';
function msdsContent(inp, company) {
  // inp: {제품명, 양식, 용도, 성상, 색상, 분자량, 성분:[{name,cas,pct,면제번호,key}], 작성일, 최초작성일, 개정차수}
  const comps = toComps(inp).filter(c => c.name || c.cas).map(c => ({ ...c, pct: c.pct === '' || c.pct == null ? null : +c.pct, s: compData(c) }));
  const C = classify(comps);
  const solv = comps.filter(c => c.s && c.s.liquid && c.pct > 0);
  const main = solv.slice().sort((a, b) => b.pct - a.pct)[0], ms = main && main.s, tag = ms ? ` (${ms.name})` : '';
  const liquid = solv.length > 0, flam = C.flamCat > 0;
  const nodata = comps.filter(c => !c.s), withData = comps.filter(c => c.s);
  const nm = c => c.s ? c.s.name : (c.name || '(이름 없음)');
  const short = c => { const n = nm(c); return n.length > 40 ? (c.s ? c.s.syn || '성분' : '용질') : n; };
  const lines = a => a.filter(Boolean).map(x => '- ' + x).join('\n');
  const perComp = f => withData.map(c => { const v = f(c.s); return v ? `[${short(c)}] ${v}` : ''; }).filter(Boolean);
  const has = h => C.h.includes(h), corr = has('H314');
  const out = {};
  out.s1 = { 제품명: inp.제품명, 권고용도: inp.용도 || '연구개발용', 사용제한: '권고 용도 외 사용 금지', 회사명: company.회사명, 주소: company.주소, 긴급전화: company.전화 };
  const ndTxt = nodata.length ? '\n※ ' + nodata.map(c => `${short(c)}(${c.종류 || (c.cas ? 'CAS ' + c.cas : '신규 물질')})`).join(', ') + '은(는) 유해성 자료 없음' : '';
  out.s2 = {
    분류: C.cls.length ? C.cls.map(x => '- ' + x).join('\n') + ndTxt : '자료없음',
    그림문자: C.pic, 신호어: C.signal || '해당없음',
    H: C.h.length ? C.h.map(h => `- ${h} ${H[h]}`).join('\n') : '자료없음',
    P: Object.fromEntries(Object.entries(C.p).map(([k, v]) => [k, v.length ? v.map(p => `- ${p} ${P[p]}`).join('\n') : '해당없음'])),
    기타: lines([C.cls.length ? '' : '유해성 자료가 충분하지 않으므로 주의하여 취급할 것', ...withData.filter(c => c.s.note).map(c => `${short(c)}: ${c.s.note}`)]) || '자료없음',
  };
  out.s3 = comps.map(c => [nm(c), c.s ? (c.s.syn || '-') : '-', c.cas || (c.s && c.s.cas) || '-', c.pct != null ? String(c.pct) : '']);
  out.s4 = corr ? {
    눈: lines(['즉시 다량의 물로 15분 이상 씻어내시오. 콘택트렌즈는 가능하면 제거하시오.', '즉시 의사의 진찰을 받으시오.']),
    피부: lines(['오염된 의복을 즉시 벗고 다량의 물로 15분 이상 씻어내시오.', '즉시 의사의 진찰을 받으시오.']),
    흡입: lines(['신선한 공기가 있는 곳으로 옮기고 호흡하기 쉬운 자세로 안정을 취하시오.', '즉시 의사의 진찰을 받으시오.']),
    먹었을때: lines(['입을 씻어내시오. 토하게 하지 마시오.', '즉시 의사의 진찰을 받으시오.']),
    기타: '오염 상황을 의료 관계자에게 알려 적절한 보호조치를 취하도록 하시오.',
  } : liquid ? {
    눈: lines(['눈을 문지르지 마시오.', '많은 양의 물로 적어도 15분 동안 눈을 씻어내시오.', '증상(발적, 자극 등)이 지속되면 의사의 진찰을 받으시오.']),
    피부: lines(['오염된 의복 및 신발을 벗고 비누와 물로 충분히 씻어내시오.', '오염된 의복은 재사용 전에 세탁하시오.', '자극이 지속되면 의사의 진찰을 받으시오.']),
    흡입: lines(['신선한 공기가 있는 곳으로 옮기고 호흡하기 쉬운 자세로 안정을 취하시오.', '호흡이 없으면 인공호흡을 하시오.', '불편함을 느끼면 의사의 진찰을 받으시오.']),
    먹었을때: lines([has('H304') ? '토하게 하지 마시오(흡인 위험).' : '구토를 유발해야 하는지 의사의 조언을 받으시오.', '물로 입을 씻어내시오.', '즉시 의사의 진찰을 받으시오.']),
    기타: '오염 상황을 의료 관계자에게 알려 적절한 보호조치를 취하도록 하시오.',
  } : { 눈: '예방 차원에서 두 눈을 흐르는 물로 씻을 것.', 피부: '피부를 물로 씻으시오/샤워하시오.', 흡입: '신선한 공기가 있는 곳으로 옮기시오. 호흡을 하지 않는 경우 인공호흡을 실시할 것.', 먹었을때: '의식이 없는 사람에게는 어떠한 것도 먹이지 말 것. 물로 입을 헹구시오.', 기타: '본 물질안전보건자료를 담당 의사에게 보일 것.' };
  out.s5 = {
    소화제: flam ? lines(['분말소화제, 이산화탄소, 알코올 포말, 물분무', '직사주수는 피하시오.']) : lines(['물분무, 포말, 분말소화제, 이산화탄소(CO2)']),
    유해성: flam ? lines([C.flamCat <= 2 ? '고인화성 액체 및 증기' : '인화성 액체 및 증기', '증기는 공기와 폭발성 혼합물을 형성할 수 있음', '가열시 용기가 폭발할 수 있음', '연소 시 탄소산화물 등 유해가스가 발생할 수 있음'])
      : lines(['연소 시 탄소산화물 등 유해가스가 발생할 수 있음', withData.some(c => c.s.cls && c.s.cls.ox) ? '산화성 성분이 들어 있어 가연물과 접촉하면 연소를 도울 수 있음' : '']),
    보호구: lines(['화재 진압 시 방화복, 공기호흡기 등 적절한 보호구를 착용하시오.', '관계인 외 접근을 막고 위험 지역의 출입을 금지하시오.', flam ? '용기는 물분무로 냉각하시오.' : '']),
  };
  out.s6 = {
    인체: lines([flam ? '모든 점화원을 제거하시오.' : '', '증기·미스트·분진을 흡입하지 말고 적절한 보호구를 착용하시오.', '환기를 충분히 하시오.']),
    환경: lines(['누출물이 하수구, 수계, 토양으로 유입되지 않도록 하시오.']),
    정화: lines(['불활성 흡수제(모래, 규조토 등)로 흡수시키시오.', flam ? '스파크가 발생하지 않는 도구를 사용하여 적당한 용기에 수거하시오.' : '적당한 용기에 수거하시오.', '폐기물 관련 법령에 따라 처리하시오.']),
  };
  out.s7 = {
    취급: lines(['환기가 잘 되는 곳에서만 취급하시오.', '눈, 피부, 의복에 접촉하지 않도록 하시오.', flam ? '열, 스파크, 화염 등 점화원으로부터 멀리하고 정전기 방지 조치를 하시오.' : '', '취급 후에는 손을 철저히 씻으시오.']),
    저장: lines(['용기를 단단히 밀폐하여 서늘하고 건조하며 통풍이 잘 되는 곳에 보관하시오.', flam ? '열, 직사광선 및 점화원으로부터 멀리하시오.' : '', '산화제 등 혼합 금지 물질과 분리하여 저장하시오.']),
  };
  const twa = withData.filter(c => c.s.twa && c.s.twa !== '해당없음').map(c => `${short(c)}: ${/^TWA|^STEL/.test(c.s.twa) ? '' : 'TWA '}${c.s.twa}`);
  out.s8 = {
    국내: twa.length ? twa.join('\n') : '해당없음',
    공학: liquid ? '공정격리, 국소배기 등으로 공기 중 농도를 노출기준 이하로 유지하시오.' : '자료없음',
    호흡: liquid ? '노출기준을 초과하거나 증기가 발생하는 경우 유기화합물용 방독마스크를 착용하시오.' : '분진이 발생하는 경우 방진마스크를 착용하시오.',
    눈: corr ? '보안경과 안면보호구를 착용하시오.' : '보안경 또는 고글을 착용하시오.', 손: '화학물질용 보호장갑을 착용하시오.', 신체: '화학물질용 보호복을 착용하시오.',
  };
  out.s9 = [
    ['성상', inp.성상 || (liquid ? '액체' : '고체')], ['색상', inp.색상 || '자료없음'], ['냄새', '자료없음'], ['냄새역치', '자료없음'], ['pH', '자료없음'],
    ['녹는점/어는점', ms ? `${ms.mp} °C${tag}` : '자료없음'], ['초기 끓는점과 끓는점 범위', ms ? `${ms.bp} °C${tag}` : '자료없음'],
    ['인화점', C.flash != null ? `${C.flash} °C (밀폐식, 용매 값)` : ms && ms.fp != null ? `${ms.fp} °C (밀폐식${tag})` : (solv.some(c => c.key === 'MC' || c.s.cas === '75-09-2') ? '해당없음 (MC)' : '자료없음')],
    ['증발속도', '자료없음'], ['인화성(고체, 기체)', '해당없음'],
    ['인화 또는 폭발 범위의 상한/하한', ms && ms.uel ? `상한 ${ms.uel} %(V) / 하한 ${ms.lel} %(V)${tag}` : '자료없음'],
    ['증기압', ms && ms.vp ? ms.vp + tag : '자료없음'], ['용해도', ms && ms.sol ? ms.sol + tag : '자료없음'], ['증기밀도', '자료없음'],
    ['비중', ms && ms.d ? ms.d + tag : '자료없음'], ['n-옥탄올/물 분배계수', '자료없음'], ['자연발화온도', ms && ms.ait ? `${ms.ait} °C${tag}` : '자료없음'],
    ['분해온도', '자료없음'], ['점도', '자료없음'], ['분자량', inp.분자량 || (inp.용질 && inp.용질.mw) || '자료없음'],
  ];
  out.s9ul = { 상한: ms && ms.uel ? `${ms.uel} %(V)${tag}` : '자료없음', 하한: ms && ms.lel ? `${ms.lel} %(V)${tag}` : '자료없음' };
  out.s10 = {
    안정성: '권장하는 보관 및 취급 조건에서 안정함.' + (solv.some(c => c.key === 'THF') ? '\n- 공기와 장기간 접촉 시 폭발성 과산화물을 생성할 수 있음' : ''),
    조건: flam ? '열, 스파크, 화염 등 점화원' : '열, 직사광선', 물질: withData.some(c => c.s.cls && c.s.cls.ox) ? '가연성 물질, 환원제, 강산화제' : '강산화제', 분해물: '탄소산화물 등',
  };
  out.s11 = {
    경로: lines(['흡입, 피부 접촉, 눈 접촉, 섭취']),
    급성: [...perComp(s => s.ld50 ? `경구 LD50 ${s.ld50}` : ''), ...nodata.map(c => `[${short(c)}] 자료없음`)].join('\n') || '자료없음',
    피부: corr ? '피부에 심한 화상과 눈에 손상을 일으킴' : has('H315') ? '피부에 자극을 일으킴' : '자료없음',
    눈: corr || has('H318') ? '눈에 심한 손상을 일으킴' : has('H319') ? '눈에 심한 자극을 일으킴' : '자료없음',
    과민성: has('H317') ? '알레르기성 피부 반응을 일으킬 수 있음' : '자료없음',
    발암성: has('H351') ? '암을 일으킬 것으로 의심됨 (' + withData.filter(c => c.s.cls && c.s.cls.carc).map(short).join(', ') + ')' : '자료없음',
    변이원성: '자료없음', 생식독성: C.h.some(h => /^H361/.test(h)) ? C.h.filter(h => /^H361/.test(h)).map(h => H[h]).join(', ') : '자료없음',
    se: has('H336') ? '졸음 또는 현기증을 일으킬 수 있음' : has('H335') ? '호흡기계 자극을 일으킬 수 있음' : '자료없음',
    re: has('H373') ? '장기간 또는 반복노출 되면 장기에 손상을 일으킬 수 있음' : '자료없음', 흡인: has('H304') ? '삼켜서 기도로 유입되면 치명적일 수 있음' : '자료없음',
  };
  out.s12 = { 생태독성: [has('H400') ? H.H400 : '', has('H410') ? H.H410 : has('H411') ? H.H411 : has('H412') ? H.H412 : ''].filter(Boolean).join('\n') || '자료없음', 잔류성: '자료없음', 농축성: '자료없음', 토양: '자료없음', 기타: '자료없음' };
  out.s13 = { 방법: '폐기물관리법 및 관련 법령에 따라 처리하시오.', 주의: '내용물·용기를 폐기물 관련 법령에 따라 폐기하시오. 빈 용기에도 잔류물이 남아 있을 수 있으므로 주의하시오.' };
  // 14. 운송: 인화성 > 부식성 > 환경유해 순
  let t14; const envHaz = has('H400') || has('H410') || has('H411');
  const single = comps.length === 1 && comps[0].s;
  if (flam) {
    const pg = C.flamCat <= 2 ? 'II' : 'III', cont = solv.filter(c => c.s.fp != null).map(c => c.s.name).join(', ');
    t14 = solv.length === 1 && comps.length === 1 && solv[0].s.un ? { un: solv[0].s.un, name: solv[0].s.unName, cls: '3', pg } : { un: '1993', name: `FLAMMABLE LIQUID, N.O.S. (contains ${cont})`, cls: '3', pg };
    t14.ems = 'F-E, S-E';
  } else if (single && single.un && single.un !== '해당없음') t14 = { un: single.un, name: single.unName, cls: single.unClass || '', pg: single.pg || '', ems: '확인 필요' };
  else if (corr) { const cont = withData.filter(c => c.s.cls && c.s.cls.skin === 1).map(c => c.s.name).join(', ');
    t14 = liquid ? { un: '1760', name: `CORROSIVE LIQUID, N.O.S. (contains ${cont})`, cls: '8', pg: 'II', ems: 'F-A, S-B' } : { un: '1759', name: `CORROSIVE SOLID, N.O.S. (contains ${cont})`, cls: '8', pg: 'II', ems: 'F-A, S-B' };
    C.flags.push('14번 부식성 운송: 용기등급(II/III)은 시험·공급사 자료로 확인'); }
  else if (envHaz) { const cont = withData.filter(c => c.s.cls && (c.s.cls.acute || c.s.cls.chronic)).map(c => c.s.name).join(', ');
    t14 = liquid ? { un: '3082', name: `ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S. (contains ${cont})`, cls: '9', pg: 'III', ems: 'F-A, S-F' } : { un: '3077', name: `ENVIRONMENTALLY HAZARDOUS SUBSTANCE, SOLID, N.O.S. (contains ${cont})`, cls: '9', pg: 'III', ems: 'F-A, S-F' }; }
  else if (solv.some(c => c.key === 'MC')) t14 = { un: '1593', name: 'DICHLOROMETHANE', cls: '6.1', pg: 'III', ems: 'F-A, S-A' };
  else t14 = { un: '해당없음', name: '해당없음', cls: '해당없음', pg: '해당없음', ems: '해당없음' };
  t14.marine = envHaz ? '해당' : '해당없음';
  out.s14 = t14;
  // 15. 법적 규제 (성분별)
  const hazmat = !flam ? '해당없음' : (() => { const fp = C.flash; const cls = fp < 21 ? '제1석유류' : fp < 70 ? '제2석유류' : '제3석유류'; const ws = solv.filter(c => c.s.fp != null).every(c => c.s.waterSol); return `제4류 인화성 액체, ${cls}, ${ws ? '수용성' : '비수용성'} 액체`; })();
  const lawOf = (c, k) => { const L = c.s && c.s.law; if (L && L[k]) return L[k]; if (c.s && c.s.key && SOLV[c.s.key]) return k === '산안법' ? LAW_SOLV : k === '화평법' ? '기존화학물질' : '해당없음'; return '확인 필요'; };
  const 화평 = c => c.면제번호 ? `등록·신고 면제확인 완료(${c.면제번호})` : c.s ? lawOf(c, '화평법') : (c.cas ? '확인 필요' : '신규화학물질');
  const per = (f, skipNone) => comps.map(c => { const v = f(c); return skipNone && (v === '해당없음') ? '' : `${short(c)}${c.cas ? `(CAS No. ${c.cas})` : ''} : ${v}`; }).filter(Boolean).join('\n');
  out.s15 = {
    산안법: per(c => c.s ? lawOf(c, '산안법') : '해당없음', true) || '해당없음',
    화관법: per(c => c.s ? lawOf(c, '화관법') : '해당없음', true) || '해당없음',
    화평법: per(화평) || '해당없음',
    위험물: hazmat, 폐기물: liquid ? '지정폐기물(폐유기용제)에 해당할 수 있음' : '해당없음', 기타: '해당없음',
  };
  if ([out.s15.산안법, out.s15.화관법, out.s15.화평법].some(t => /확인 필요/.test(t))) C.flags.push('15번 법적 규제에 "확인 필요" 성분이 있음 — 화학물질정보시스템(NCIS)·안전보건공단에서 확인');
  const srcs = [...new Set(withData.filter(c => c.s.src).map(c => `${short(c)}: ${c.s.src}`))];
  out.s16 = { 출처: '- 산업안전보건법 제110조 및 고용노동부고시(화학물질의 분류·표시 및 물질안전보건자료에 관한 기준)에 근거하여 작성함.\n- 용매 정보: 공급사 MSDS 및 안전보건공단 화학물질정보' + (srcs.length ? '\n' + srcs.map(x => '- ' + x).join('\n') : ''), 최초: inp.최초작성일 || inp.작성일, 개정: inp.개정차수 || 0, 최종: inp.개정차수 > 0 ? inp.작성일 : '-',
    기타: '위험·유해성 평가가 충분하지 않으므로 반드시 주의하여 취급할 것. 여기에 기재된 내용은 현재 입수한 정보에 근거한 것이며 법령 개정 및 새로운 지식에 따라 개정될 수 있음.' };
  out.flags = C.flags; out.C = C; out.comps = comps;
  return out;
}

// ---------- 엑셀 MSDS ----------
// 공통: 회사 양식 고르기
async function buildMsdsXlsx(inp, company) { return inp.양식 === '엘에스켐' ? buildMsdsLs(inp, company) : buildMsdsHanin(inp, company); }
const dotYmd = d => String(d || '').replace(/-/g, '.');
const vlen = t => [...String(t || '')].reduce((a, ch) => a + (/[ᄀ-ᇿ　-鿿가-힯＀-￯]/.test(ch) ? 1.75 : 1), 0);
const nLines = (t, w) => String(t == null ? '' : t).split('\n').reduce((a, l) => a + Math.max(1, Math.ceil(vlen(l) / w)), 0);
const cut = t => String(t || '').replace(/^- /gm, '').trim();
// 단락별 값(여러 성분이면 "[이름] 값")
function msdsBits(M) {
  const C = M.C, has = h => C.h.includes(h), comps = M.comps, nm = c => c.s ? c.s.name : (c.name || '(이름 없음)');
  const per = f => comps.map(c => `[${nm(c)}] : ${(c.s && f(c.s)) || '자료없음'}`).join('\n');
  const unclassified = !C.cls.length;
  const acute = C.h.filter(h => /^H3(00|01|02|10|11|12)$/.test(h)).map(h => H[h]).join(', ');
  return { has, per, nm, unclassified, acute,
    호흡기: has('H336') ? '졸음 또는 현기증을 일으킬 수 있음' : has('H335') ? '호흡기계 자극을 일으킬 수 있음' : '자료없음',
    경구: C.h.filter(h => /^H30[012]$/.test(h)).map(h => H[h]).join(', ') || (has('H304') ? H.H304 : '자료없음'),
    눈피부: [M.s11.피부, M.s11.눈].filter(x => x !== '자료없음').join(', ') || '자료없음',
    t14: M.s14.un === '해당없음' ? '위험하지 않은 상품' : `UN ${M.s14.un}, ${M.s14.name}, 등급 ${M.s14.cls}${M.s14.pg && M.s14.pg !== '해당없음' ? `, 용기등급 ${M.s14.pg}` : ''}` };
}

// 한인 양식: 기존 회사 MSDS와 비슷한 모양, 손으로 고치기 쉽게(내용은 E열 한 칸, 병합은 머리말 상자·구성성분 표만)
async function buildMsdsHanin(inp, company) {
  await loadScript('exceljs'); const T = await templates();
  const M = msdsContent(inp, company), B = msdsBits(M);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('MSDS', { views: [{ showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true, margins: { left: 0.6, right: 0.6, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 } } });
  ws.columns = [{ width: 1.6 }, { width: 4.5 }, { width: 25 }, { width: 2.3 }, { width: 50 }, { width: 11 }, { width: 11 }];
  const F = { name: '맑은 고딕', size: 10 }, navy = 'FF1F3B73', thin = { style: 'thin', color: { argb: 'FF000000' } };
  const put = (addr, v, o = {}) => { const c = ws.getCell(addr); c.value = v == null ? '' : v; c.font = { ...F, ...(o.font || {}) }; c.alignment = { vertical: o.v || 'top', wrapText: true, ...(o.align || {}) }; if (o.border) c.border = o.border; return c; };
  const box = (r1, c1, r2, c2) => { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { const cell = ws.getCell(r, c); cell.border = { top: r === r1 ? thin : cell.border && cell.border.top, bottom: r === r2 ? thin : cell.border && cell.border.bottom, left: c === c1 ? thin : cell.border && cell.border.left, right: c === c2 ? thin : cell.border && cell.border.right }; } };
  // 머리말(매 쪽 반복): 로고 · 제목 · 관리번호 상자
  [2, 3, 4].forEach(r => ws.getRow(r).height = 17); ws.getRow(1).height = 6; ws.getRow(5).height = 10;
  ws.mergeCells('B2:C4'); ws.mergeCells('D2:E4');
  put('D2', '물질안전보건자료(MSDS)', { font: { bold: true, size: 16 }, v: 'middle', align: { horizontal: 'center' } });
  [['관리번호', inp.관리번호 || ''], ['최초작성일', dotYmd(M.s16.최초)], ['최종개정일', M.s16.개정 > 0 ? dotYmd(M.s16.최종) : '']].forEach(([k, v], i) => {
    put('F' + (2 + i), k, { font: { size: 8 }, v: 'middle', align: { horizontal: 'center' }, border: { top: thin, bottom: thin, left: thin, right: thin } });
    put('G' + (2 + i), v, { font: { size: 8 }, v: 'middle', align: { horizontal: 'center' }, border: { top: thin, bottom: thin, left: thin, right: thin } }); });
  box(2, 2, 4, 3); box(2, 4, 4, 5);
  if (T.logoHanin) { const id = wb.addImage({ base64: 'data:image/png;base64,' + T.logoHanin, extension: 'png' }); ws.addImage(id, { tl: { nativeCol: 1, nativeColOff: 12 * 9525, nativeRow: 1, nativeRowOff: 5 * 9525 }, ext: { width: 168, height: 56 }, editAs: 'oneCell' }); }
  ws.pageSetup.printTitlesRow = '2:5';
  ws.headerFooter.oddFooter = '&C&"맑은 고딕"&9한인정밀화학(주)    A4(210x297mm)';
  let r = 6;
  const KO = '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허';
  const sec = t => { if (r > 6) { ws.getRow(r).height = 8; r++; } put('B' + r, t, { font: { bold: true }, v: 'bottom', align: { wrapText: false } }); ['B', 'C', 'D', 'E', 'F', 'G'].forEach(c => { ws.getCell(c + r).border = { bottom: { style: 'medium', color: { argb: navy } } }; }); ws.getRow(r).height = 20; r++; ws.getRow(r).height = 5; r++; };
  // 항목: no=가나다 번호(없으면 들여쓴 하위 항목), 값은 E열 한 칸
  const item = (no, label, val) => {
    if (no != null) put('B' + r, KO[no] + '.', { align: { horizontal: 'right' } });
    put('C' + r, no == null ? '  ' + label : label, val === undefined ? { align: { wrapText: false } } : {});
    if (val !== undefined) { put('D' + r, ':', { align: { horizontal: 'center' } }); put('E' + r, val === '' || val == null ? '자료없음' : cut(val)); }
    const h = Math.max(val !== undefined ? nLines(label, 23) : 1, val !== undefined ? nLines(cut(val), 48) : 1); ws.getRow(r).height = Math.max(18, 14.5 * h + 3); r++;
  };
  sec('1. 화학제품과 회사에 관한 정보');
  item(0, '제품명', M.s1.제품명); item(1, '제품의 권고 용도와 사용상의 제한'); item(null, '권고용도', M.s1.권고용도); item(null, '사용상의 제한', M.s1.사용제한);
  item(2, '제조자/수입자/유통업자 정보'); item(null, '회사명', M.s1.회사명); item(null, '주소', M.s1.주소); item(null, '긴급전화번호', M.s1.긴급전화);
  sec('2. 유해성·위험성');
  if (B.unclassified) {
    item(0, '유해성·위험성 분류', '본 제품은 산업안전보건법 제104조에 따른 분류기준에 따라 분류되지 않음.' + (M.s2.분류 !== '자료없음' ? '\n' + M.s2.분류 : ''));
    item(1, '예방조치 문구를 포함한 경고 표지 항목', '본 제품은 산업안전보건법 제104조에 따른 분류기준에 따라 분류되지 않으므로 동법 제110조 제1항에 따른 대상화학물질에 해당되지 않으며 물질안전보건자료 작성 및 경고표지 부착 대상이 아님.');
  } else {
    item(0, '유해성·위험성 분류', M.s2.분류); item(1, '예방조치 문구를 포함한 경고 표지 항목');
    const pr = r; item(null, '그림문자', M.s2.그림문자.length ? ' ' : '해당없음');
    if (M.s2.그림문자.length) { ws.getRow(pr).height = 62; ws.getCell('E' + pr).value = '';
      M.s2.그림문자.forEach((g, i) => { const id = wb.addImage({ base64: 'data:image/png;base64,' + T.ghs[g], extension: 'png' }); ws.addImage(id, { tl: { nativeCol: 4, nativeColOff: (4 + i * 80) * 9525, nativeRow: pr - 1, nativeRowOff: 4 * 9525 }, ext: { width: 74, height: 74 }, editAs: 'oneCell' }); }); }
    item(null, '신호어', M.s2.신호어); item(null, '유해·위험 문구', M.s2.H);
    ['예방', '대응', '저장', '폐기'].forEach(k => item(null, '예방조치 문구 - ' + k, M.s2.P[k]));
  }
  item(2, '유해성·위험성 분류기준에 포함되지 않는 기타 유해성·위험성', M.s2.기타);
  sec('3. 구성성분의 명칭 및 함유량');
  const tb = { top: thin, bottom: thin, left: thin, right: thin };
  ws.mergeCells(`B${r}:E${r}`); put('B' + r, '화학물질명 / 관용명 및 이명(異名)', { v: 'middle', align: { horizontal: 'center' }, border: tb }); put('F' + r, 'CAS 번호 또는 식별번호', { v: 'middle', align: { horizontal: 'center' }, font: { size: 9 }, border: tb }); put('G' + r, '함유량(%)', { v: 'middle', align: { horizontal: 'center' }, border: tb });
  ['C', 'D', 'E'].forEach(c => ws.getCell(c + r).border = tb); ws.getRow(r).height = 30; r++;
  M.s3.forEach(([n, syn, cas, pct]) => { ws.mergeCells(`B${r}:E${r}`); const t = syn && syn !== '-' ? `${n}\n(${syn})` : n;
    put('B' + r, t, { v: 'middle', align: { horizontal: 'center' }, border: tb }); ['C', 'D', 'E'].forEach(c => ws.getCell(c + r).border = tb);
    put('F' + r, cas, { v: 'middle', align: { horizontal: 'center' }, border: tb }); put('G' + r, pct === '' ? '' : pct, { v: 'middle', align: { horizontal: 'center' }, border: tb });
    ws.getRow(r).height = Math.max(30, 14.5 * nLines(t, 72) + 10); r++; });
  sec('4. 응급조치 요령');
  item(0, '눈에 들어갔을 때', M.s4.눈); item(1, '피부에 접촉했을 때', M.s4.피부); item(2, '흡입했을 때', M.s4.흡입); item(3, '먹었을 때', M.s4.먹었을때);
  item(4, '급성 증상 / 영향', [B.acute, M.s11.피부 !== '자료없음' ? M.s11.피부 : '', M.s11.눈 !== '자료없음' ? M.s11.눈 : ''].filter(Boolean).join(', ') || '자료없음');
  item(5, '지연 증상 / 영향', '자료없음');
  item(6, '기타 의사의 주의사항', B.unclassified ? '자료없음' : M.s4.기타);
  item(7, '일반적인 조치 사항', '응급처치자는 자신을 보호할 필요가 있음.\n본 물질안전보건자료를 담당 의사에게 보일 것.');
  sec('5. 폭발·화재시 대처방법');
  item(0, '적절한(및 부적절한) 소화제', M.s5.소화제); item(1, '화학물질로부터 생기는 특정 유해성(예, 연소 시 발생 유해물질)', M.s5.유해성); item(2, '화재 진압 시 착용할 보호구 및 예방조치', M.s5.보호구);
  sec('6. 누출 사고시 대처방법');
  item(0, '인체를 보호하기 위해 필요한 조치 사항 및 보호구', M.s6.인체); item(1, '환경을 보호하기 위해 필요한 조치사항', M.s6.환경); item(2, '정화 또는 제거 방법', M.s6.정화);
  sec('7. 취급 및 저장방법');
  item(0, '안전취급요령', M.s7.취급); item(1, '안전한 저장 방법(피해야 할 조건을 포함함)', M.s7.저장);
  sec('8. 노출방지 및 개인보호구');
  item(0, '노출기준', M.s8.국내 === '해당없음' ? '직업상 노출 기준 값에 해당하는 물질을 함유하지 않음.' : M.s8.국내); item(1, '적절한 공학적 관리', M.s8.공학); item(2, '개인 보호구');
  item(null, '호흡기 보호', M.s8.호흡); item(null, '눈 보호', M.s8.눈); item(null, '손 보호', M.s8.손); item(null, '신체 보호', M.s8.신체); item(null, '위생상 주의사항', '오염된 작업복은 즉시 바꾸고, 취급 후에는 손을 씻으시오.');
  sec('9. 물리화학적 특성');
  const s9 = Object.fromEntries(M.s9);
  [['외관 (물리적 상태, 색 등)', [s9['성상'], s9['색상'] !== '자료없음' ? s9['색상'] : ''].filter(Boolean).join(', ')], ['냄새', s9['냄새']], ['냄새 역치', s9['냄새역치']], ['pH', s9['pH']], ['녹는점/어는점', s9['녹는점/어는점']], ['초기 끓는점과 끓는점 범위', s9['초기 끓는점과 끓는점 범위']],
    ['인화점', s9['인화점']], ['증발 속도', s9['증발속도']], ['인화성(고체, 기체)', s9['인화성(고체, 기체)']]].forEach(([k, v], i) => item(i, k, v));
  item(9, '인화 또는 폭발 범위의 상한/하한'); item(null, '상한값', M.s9ul.상한); item(null, '하한값', M.s9ul.하한);
  [['증기압', s9['증기압']], ['용해도', s9['용해도']], ['증기밀도', s9['증기밀도']], ['비중', s9['비중']], ['n 옥탄올/물 분배계수', s9['n-옥탄올/물 분배계수']], ['자연발화 온도', s9['자연발화온도']], ['분해 온도', s9['분해온도']], ['점도', s9['점도']], ['분자량', s9['분자량']]].forEach(([k, v], i) => item(10 + i, k, v));
  sec('10. 안정성 및 반응성');
  item(0, '화학적 안정성 및 유해 반응의 가능성', M.s10.안정성); item(1, '피해야 할 조건 (정전기 방전, 충격, 진동 등)', M.s10.조건); item(2, '피해야 할 물질', M.s10.물질); item(3, '분해시 생성되는 유해물질', M.s10.분해물); item(4, '열분해', '자료없음');
  sec('11. 독성에 관한 정보');
  item(0, '가능성이 높은 노출 경로에 관한 정보'); item(null, '호흡기', B.호흡기); item(null, '경구', B.경구); item(null, '눈·피부', B.눈피부);
  item(1, '건강 유해성 정보'); item(null, '급성 독성(노출 가능한 모든 경로에 대해 기재)', B.acute || '자료없음'); item(null, '피부 부식성 또는 자극성', M.s11.피부); item(null, '심한 눈 손상 또는 자극성', M.s11.눈);
  item(null, '호흡기 또는 피부과민성', M.s11.과민성); item(null, '발암성', M.s11.발암성); item(null, '생식세포 변이원성', M.s11.변이원성); item(null, '생식독성', M.s11.생식독성);
  item(null, '특정표적장기 독성 (1회 노출)', M.s11.se); item(null, '특정표적장기 독성 (반복 노출)', M.s11.re); item(null, '노출시 징후와 증상', '자료없음');
  item(null, '독성의 수치적 척도(급성독성 추정치 등)', M.s11.급성); item(null, '흡인 유해성', M.s11.흡인); item(null, '추가정보', '자료없음');
  sec('12. 환경에 미치는 영향');
  item(0, '생태독성', M.s12.생태독성); item(1, '잔류성 및 분해성', M.s12.잔류성); item(2, '생물 농축성', M.s12.농축성); item(3, '토양 이동성', M.s12.토양); item(4, '오존층유해성', '자료없음');
  sec('13. 폐기시 주의사항');
  item(0, '폐기방법', M.s13.방법); item(1, '폐기시 주의사항(오염된 용기 및 포장의 폐기 방법을 포함함)', M.s13.주의);
  sec('14. 운송에 필요한 정보');
  item(0, 'IMDG', B.t14 + (M.s14.un !== '해당없음' ? `, EmS ${M.s14.ems}, 해양오염물질 ${M.s14.marine}` : '')); item(1, 'IATA', B.t14); item(2, '그 밖의 참고사항', '자료없음');
  sec('15. 법적 규제현황');
  item(0, '산업안전보건법에 의한 규제', M.s15.산안법); item(1, '화학물질관리법에 의한 규제', M.s15.화관법); item(2, '화학물질의 등록 및 평가 등에 관한 법률에 의한 규제', M.s15.화평법);
  item(3, '위험물안전관리법에 의한 규제', M.s15.위험물); item(4, '폐기물관리법에 의한 규제', M.s15.폐기물); item(5, '기타 국내 및 외국법에 의한 규제', M.s15.기타);
  sec('16. 그 밖의 참고사항');
  item(0, '자료의 출처', M.s16.출처); item(1, '최초 작성일자', dotYmd(M.s16.최초)); item(2, '개정 횟수 및 최종 개정일자', M.s16.개정 > 0 ? `${M.s16.개정}회 / ${dotYmd(M.s16.최종)}` : '-');
  item(3, '기타', '본 MSDS는 산업안전보건법 및 「화학물질의 분류·표시 및 물질안전보건자료에 관한 기준」 [별표 4] 양식에 맞게 작성하였으며, 국내 관련 규제법규 현황 등을 추가하였습니다.\n국내 관련 규제법규 현황은 본 제품의 용도나 알려진 성분으로 판단한 것이므로 완전히 일치하지 않을 수 있으며, 새로운 법령의 제정 및 개정을 통하여 수시로 바뀔 수 있습니다.\n본 MSDS는 현재의 알려진 지식 경험 및 관련자료에 근거하여 작성된 것이나 제품자체를 완전히 보증하는 것은 아닙니다. 알려지지 않은 위험성이 나타날 수 있기 때문에 주의해서 사용해야 합니다.');
  ws.pageSetup.printArea = `A1:G${r}`;
  const buf = await wb.xlsx.writeBuffer();
  return { blob: new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), M };
}

// 엘에스켐 양식: 받은 MSDS 파일(P20250919-2)을 틀로 그대로 쓰고 칸 값만 바꿈(칸 너비·병합·글꼴·머리말 로고·바닥글 그대로)
async function buildMsdsLs(inp, company) {
  await loadScript('jszip'); const T = await templates(); if (!T.msdsLs) throw new Error('엘에스켐 MSDS 양식이 없습니다. 앱을 업데이트하세요.');
  const M = msdsContent(inp, company), B = msdsBits(M), zip = await JSZip.loadAsync(b64ToBytes(T.msdsLs));
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', P = 'xl/worksheets/sheet1.xml';
  const doc = new DOMParser().parseFromString(await zip.file(P).async('string'), 'application/xml'), sd = doc.getElementsByTagName('sheetData')[0];
  const rowEl = n => [...sd.getElementsByTagName('row')].find(x => +x.getAttribute('r') === n);
  const colN = c => c.charCodeAt(0) - 64;
  // 성분 줄이 3개 이상이면 33번 줄을 복사해 아래 줄을 밀어냄
  const extra = Math.max(0, M.s3.length - 2);
  if (extra) {
    const shift = ref => ref.replace(/([A-Z]+)(\d+)/g, (m, c, n) => +n >= 34 ? c + (+n + extra) : m);
    [...sd.getElementsByTagName('row')].reverse().forEach(rw => { const n = +rw.getAttribute('r'); if (n >= 34) { rw.setAttribute('r', n + extra); [...rw.getElementsByTagName('c')].forEach(c => c.setAttribute('r', shift(c.getAttribute('r')))); } });
    [...doc.getElementsByTagName('mergeCell')].forEach(m => m.setAttribute('ref', shift(m.getAttribute('ref'))));
    const dim = doc.getElementsByTagName('dimension')[0]; if (dim) dim.setAttribute('ref', shift(dim.getAttribute('ref')));
    const base = rowEl(33);
    for (let i = extra; i >= 1; i--) { const cp = base.cloneNode(true); cp.setAttribute('r', 33 + i); [...cp.getElementsByTagName('c')].forEach(c => c.setAttribute('r', c.getAttribute('r').replace(/\d+/, 33 + i))); base.parentNode.insertBefore(cp, base.nextSibling); }
    const wbx = await zip.file('xl/workbook.xml').async('string'); zip.file('xl/workbook.xml', wbx.replace(/\$D\$(\d+)/, (m, n) => '\x24D\x24' + (+n + extra)));
  }
  const R = n => n >= 34 ? n + extra : n; // 원래 양식 줄 번호 → 실제 줄 번호
  const set = (ref, text) => {
    const m = ref.match(/([A-Z]+)(\d+)/), n = R(+m[2]), addr = m[1] + n, rw = rowEl(n);
    let c = [...rw.getElementsByTagName('c')].find(x => x.getAttribute('r') === addr);
    if (!c) { c = doc.createElementNS(NS, 'c'); c.setAttribute('r', addr); const after = [...rw.getElementsByTagName('c')].find(x => colN(x.getAttribute('r')) > colN(m[1])); rw.insertBefore(c, after || null); }
    while (c.firstChild) c.removeChild(c.firstChild);
    const v = text == null ? '' : String(text);
    if (/^-?\d+(\.\d+)?$/.test(v)) { c.removeAttribute('t'); const e = doc.createElementNS(NS, 'v'); e.textContent = v; c.appendChild(e); return; }
    c.setAttribute('t', 'inlineStr'); const is = doc.createElementNS(NS, 'is'), t = doc.createElementNS(NS, 't'); t.setAttribute('xml:space', 'preserve'); t.textContent = v; is.appendChild(t); c.appendChild(is);
  };
  const W = 74; // B:D 합친 칸 너비(글자)
  const fit = (n, text, w = W, min = 15) => { const rw = rowEl(R(n)); rw.setAttribute('ht', Math.max(min, 11 * nLines(text, w) + 4).toFixed(1)); rw.setAttribute('customHeight', '1'); };
  const sv = (n, text, min) => { const v = text === '' || text == null ? '자료없음' : text; set('B' + n, v); fit(n, v, W, min); };
  set('A4', inp.제품명);
  sv(8, M.s1.제품명); sv(10, M.s1.권고용도); sv(11, M.s1.사용제한); sv(13, M.s1.회사명); sv(14, M.s1.주소); sv(15, M.s1.긴급전화);
  sv(18, M.s2.분류); set('B20', ''); sv(21, M.s2.신호어); sv(22, M.s2.H);
  sv(24, M.s2.P.예방); sv(25, M.s2.P.대응); sv(26, M.s2.P.저장); sv(27, M.s2.P.폐기);
  rowEl(20).setAttribute('ht', M.s2.그림문자.length ? '49.1' : '15');
  // 3. 구성성분
  const rowsC = M.s3.length ? M.s3 : [['', '', '', '']];
  for (let i = 0; i < Math.max(2, rowsC.length); i++) { const n = 32 + i, rr = rowsC[i] || ['', '', '', ''], rw = rowEl(n);
    ['A', 'B', 'C', 'D'].forEach((c, k) => { const addr = c + n, ce = [...rw.getElementsByTagName('c')].find(x => x.getAttribute('r') === addr); while (ce && ce.firstChild) ce.removeChild(ce.firstChild); if (ce) ce.removeAttribute('t');
      if (rr[k] !== '' && rr[k] != null) { ce.setAttribute('t', 'inlineStr'); const is = doc.createElementNS(NS, 'is'), t = doc.createElementNS(NS, 't'); t.setAttribute('xml:space', 'preserve'); t.textContent = String(rr[k]); is.appendChild(t); ce.appendChild(is); } });
    rw.setAttribute('ht', Math.max(19.9, 12.6 * Math.max(nLines(rr[0], 30), nLines(rr[1], 43)) + 6).toFixed(1)); }
  sv(37, M.s4.눈); sv(38, M.s4.피부); sv(39, M.s4.흡입); sv(40, M.s4.먹었을때); sv(41, '- ' + cut(M.s4.기타));
  set('B45', M.s5.소화제 + '\n' + M.s5.보호구); rowEl(R(45)).setAttribute('ht', Math.max(15, 12.6 * nLines(M.s5.소화제 + '\n' + M.s5.보호구, W) / 2 + 2).toFixed(1)); rowEl(R(46)).setAttribute('ht', rowEl(R(45)).getAttribute('ht'));
  sv(48, M.s5.유해성); sv(50, M.s5.보호구); sv(54, M.s6.인체); sv(56, M.s6.환경); sv(58, M.s6.정화); sv(61, M.s7.취급); sv(62, M.s7.저장);
  const twa = B.per(s => s.twa && s.twa !== '해당없음' ? (/^TWA|^STEL/.test(s.twa) ? s.twa : 'TWA ' + s.twa) : '해당없음');
  sv(67, twa); sv(69, '자료없음'); sv(71, '해당없음'); sv(73, '자료없음'); sv(74, M.s8.공학); sv(75, '운전시 먼지, 흄 또는 미스트를 발생하는 경우, 공기 오염이 노출기준 이하로 유지되도록 환기하시오');
  sv(77, '- ' + M.s8.호흡); sv(78, '- 작업장 가까운 곳에 세안설비와 비상세척설비(샤워식)를 설치하시오.\n- ' + M.s8.눈); sv(79, '- ' + M.s8.손); sv(80, '- ' + M.s8.신체);
  const s9 = Object.fromEntries(M.s9);
  sv(84, s9['성상']); sv(85, s9['색상']); sv(86, s9['냄새']); sv(87, s9['냄새역치']); sv(88, s9['pH']); sv(89, s9['녹는점/어는점']); sv(90, s9['초기 끓는점과 끓는점 범위']); sv(91, s9['인화점']); sv(92, s9['증발속도']); sv(93, s9['인화성(고체, 기체)']);
  sv(94, M.s9ul.상한 === '자료없음' ? '자료없음' : `상한-${M.s9ul.상한}, 하한-${M.s9ul.하한}`); sv(95, s9['증기압']); sv(96, s9['용해도']); sv(97, s9['증기밀도']); sv(98, s9['비중']); sv(99, s9['n-옥탄올/물 분배계수']); sv(100, s9['자연발화온도']); sv(101, s9['분해온도']); sv(102, s9['점도']); sv(103, s9['분자량']);
  sv(106, M.s10.안정성); sv(107, M.s10.조건); sv(108, M.s10.물질); sv(109, M.s10.분해물);
  sv(113, B.호흡기); sv(114, B.경구); sv(115, B.눈피부);
  sv(118, B.per(s => s.ld50 ? `경구 LD50 ${s.ld50}` : '')); sv(119, B.per(s => (s.cls || {}).ateDerm ? `경피 ATE ${s.cls.ateDerm} mg/kg` : '')); sv(120, B.per(() => ''));
  sv(121, M.s11.피부); sv(122, M.s11.눈); sv(123, '자료없음'); sv(124, M.s11.과민성); sv(125, M.s11.발암성); [126, 127, 128, 129, 130, 131, 132].forEach(n => sv(n, '자료없음'));
  sv(133, M.s11.변이원성); sv(134, M.s11.생식독성); sv(135, M.s11.se); sv(136, M.s11.re); sv(137, M.s11.흡인); sv(138, '자료없음');
  set('B141', M.s12.생태독성 === '자료없음' ? '' : M.s12.생태독성); fit(141, M.s12.생태독성 === '자료없음' ? '' : M.s12.생태독성);
  [142, 143, 144, 146, 147, 149, 150, 151, 152].forEach(n => sv(n, '자료없음'));
  sv(155, M.s13.방법); sv(156, M.s13.주의);
  sv(159, M.s14.un); sv(160, M.s14.name); sv(161, M.s14.cls); sv(162, M.s14.pg); sv(163, M.s14.marine);
  const ems = String(M.s14.ems || ''), em = ems.match(/(F-\w)\s*,\s*(S-\w)/); sv(165, em ? em[1] : '해당없음'); sv(166, em ? em[2] : '해당없음');
  sv(169, M.s15.산안법); sv(170, M.s15.화관법); sv(171, M.s15.위험물); sv(172, M.s15.폐기물); sv(175, '화학물질의 등록 및 평가 등에 관한 법률\n' + M.s15.화평법);
  [177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187].forEach(n => sv(n, '해당없음'));
  sv(190, M.s16.출처); set('D191', dotYmd(M.s16.최초)); set('D193', String(M.s16.개정 || 0)); set('D194', M.s16.개정 > 0 ? dotYmd(M.s16.최종) : '-');
  zip.file(P, new XMLSerializer().serializeToString(doc));
  // 그림문자(2번 칸 B20)
  const pics = M.s2.그림문자; let dr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">', rel = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  pics.forEach((g, i) => { const x = 69272 + i * 577595, sz = 540000;
    dr += `<xdr:oneCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:colOff>${x}</xdr:colOff><xdr:row>19</xdr:row><xdr:rowOff>51954</xdr:rowOff></xdr:from><xdr:ext cx="${sz}" cy="${sz}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="${g}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rIdG${i}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${sz}" cy="${sz}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    rel += `<Relationship Id="rIdG${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${g}.png"/>`;
    zip.file(`xl/media/${g}.png`, b64ToBytes(T.ghs[g])); });
  zip.file('xl/drawings/drawing1.xml', dr + '</xdr:wsDr>'); zip.file('xl/drawings/_rels/drawing1.xml.rels', rel + '</Relationships>');
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
  return { blob, M };
}

// ---------- 단량체 정보 ----------
async function buildMonomerXlsx(sample, monomers) {
  await loadScript('exceljs');
  const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet(safeName(sample.제품명).slice(0, 28) || '단량체');
  ws.columns = [{ width: 3 }, { width: 14 }, { width: 70 }, { width: 18 }];
  const font = { name: '맑은 고딕', size: 10 }, bd = { style: 'thin' }, border = { top: bd, left: bd, bottom: bd, right: bd };
  const c = (a, v, o = {}) => { const x = ws.getCell(a); x.value = v; x.font = { ...font, ...(o.font || {}) }; x.border = border; x.alignment = { vertical: 'middle', wrapText: true, ...(o.al || {}) }; if (o.fill) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } }; };
  c('B2', '제품명', { font: { bold: true }, al: { horizontal: 'center' }, fill: 'FFF2F2F2' }); ws.mergeCells('C2:D2'); c('C2', sample.제품명);
  c('B3', '물질명', { font: { bold: true }, al: { horizontal: 'center' }, fill: 'FFF2F2F2' }); ws.mergeCells('C3:D3'); c('C3', sample.물질명); ws.getRow(3).height = Math.max(18, 15 * Math.ceil(String(sample.물질명 || '').length / 70));
  const n = Math.max(monomers.length, 1);
  ws.mergeCells(`B4:B${5 + n - 1}`); c('B4', '단량체 정보', { font: { bold: true }, al: { horizontal: 'center' }, fill: 'FFF2F2F2' });
  c('C4', '물질명', { font: { bold: true }, al: { horizontal: 'center' } }); c('D4', 'cas no.', { font: { bold: true }, al: { horizontal: 'center' } });
  monomers.forEach((m, i) => { c(`C${5 + i}`, m.물질명); c(`D${5 + i}`, m.CAS || '-', { al: { horizontal: 'center' } }); });
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ---------- 워드 채우기 ----------
const xmlEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pngSize = b => (b && b.length > 24 && b[1] === 0x50 && b[2] === 0x4E) ? [(b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0] : null;
async function fillDocx(b64, map, images) {
  await loadScript('jszip');
  const zip = await JSZip.loadAsync(b64ToBytes(b64));
  let x = await zip.file('word/document.xml').async('string');
  Object.entries(map).forEach(([k, v]) => {
    const tok = '{{' + k + '}}', lines = String(v == null ? '' : v).split(/\r?\n/);
    // 여러 줄 값이 한 문단을 다 차지하면 줄마다 문단을 나눔(내어쓰기 유지)
    if (lines.length > 1) x = x.replace(new RegExp('<w:p\\b(?:(?!<w:p\\b)[\\s\\S])*?' + tok.replace(/[{}]/g, c => '\\' + c) + '[\\s\\S]*?</w:p>', 'g'), p => lines.map(l => p.split(tok).join(xmlEsc(l))).join(''));
    x = x.split(tok).join(xmlEsc(v).replace(/\r?\n/g, '</w:t><w:br/><w:t xml:space="preserve">'));
  });
  if (images instanceof Uint8Array) images = { 'word/media/image1.png': images };
  const rels = await zip.file('word/_rels/document.xml.rels').async('string');
  Object.entries(images || {}).forEach(([p, b]) => {
    if (!b || !zip.file(p)) return; zip.file(p, b);
    // 그림 비율 맞춤(가로 그대로, 세로를 그림 비율로, 가운데 유지)
    const wh = pngSize(b); if (!wh) return;
    const rel = rels.match(new RegExp('Id="([^"]+)"[^>]*Target="' + p.replace('word/', '').replace(/[.]/g, '\\.') + '"')); if (!rel) return;
    x = x.replace(new RegExp('<w:drawing>(?:(?!</w:drawing>)[\\s\\S])*?r:embed="' + rel[1] + '"[\\s\\S]*?</w:drawing>'), dr => {
      const m = dr.match(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/); if (!m) return dr;
      const cx = +m[1], cy0 = +m[2], cy = Math.round(cx * wh[1] / wh[0]);
      return dr.replace(/(<wp:extent cx="\d+" cy=")\d+/, '$1' + cy).replace(/(<a:ext cx="\d+" cy=")\d+/, '$1' + cy)
        .replace(/(<wp:positionV relativeFrom="\w+"><wp:posOffset>)(-?\d+)/, (a, h, v) => h + (+v - Math.round((cy - cy0) / 2)));
    });
  });
  zip.file('word/document.xml', x);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
async function structurePng(mol, w = 1200, h = 700) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  if (mol) {
    const svg = mol.toSVG(w, h, undefined, { autoCrop: true, autoCropMargin: 10, suppressChiralText: true, suppressCIPParity: true });
    const img = new Image(); await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const iw = img.naturalWidth || img.width || w, ih = img.naturalHeight || img.height || h;
    const k = Math.min((w - 40) / iw, (h - 40) / ih, 4), dw = iw * k, dh = ih * k;
    g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else { g.fillStyle = '#9aa0a6'; g.font = '36px sans-serif'; g.textAlign = 'center'; g.fillText('(구조 그림을 붙여 넣으세요)', w / 2, h / 2); }
  return new Promise(ok => canvas.toBlob(b => b.arrayBuffer().then(a => ok(new Uint8Array(a))), 'image/png'));
}
async function buildRnd(v, stampB64) { const T = await templates(); return fillDocx(T.rnd, v, { 'word/media/image1.png': stampB64 ? b64ToBytes(stampB64) : null }); }
// 물질 식별정보: 위 분자량, 가운데 구조, 아래 물질명 (PNG)
async function buildIdPng(mol, mw, name, formula) {
  const W = 1100, pad = 40, font = '30px Arial, sans-serif';
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  g.font = font;
  const words = String(name || '').split(/(?<=[\s\-,\]\)])/), lines = []; let cur = '';
  words.forEach(w => { if (g.measureText(cur + w).width > W - pad * 2 && cur) { lines.push(cur); cur = w; } else cur += w; }); if (cur) lines.push(cur);
  const svg0 = mol.toSVG(900, 600, undefined, { autoCrop: true, autoCropMargin: 10, suppressChiralText: true, suppressCIPParity: true, strokeWidth: 1.4 });
  const svg = svg0.replace(/rgb\(\d+,\s*\d+,\s*\d+\)/g, 'rgb(0,0,0)'); // ChemDraw처럼 검은색
  const img = new Image(); await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const iw = img.naturalWidth || 900, ih = img.naturalHeight || 600, k = Math.min((W - pad * 2) / iw, 620 / ih, 2.2), dw = iw * k, dh = ih * k;
  const top = formula ? 84 : 44, H = pad + top + 20 + dh + 30 + lines.length * 40 + pad;
  cv.width = W; cv.height = H; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#000'; g.textAlign = 'center'; g.font = font;
  if (formula) g.fillText('Molecular Formula: ' + formula, W / 2, pad + 32);
  g.fillText('Molecular Weight: ' + mw, W / 2, pad + 32 + (formula ? 40 : 0));
  g.drawImage(img, (W - dw) / 2, pad + top + 20, dw, dh);
  lines.forEach((l, i) => g.fillText(l.trim(), W / 2, pad + top + 20 + dh + 50 + i * 40));
  return new Promise(ok => cv.toBlob(ok, 'image/png'));
}
async function blobToB64(blob) { const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s); }
// 형식 선택에 따라 원본·PDF 내려받기 (fmt: orig | pdf | both)
// Google 변환용: Google 문서에 없는 글꼴을 비슷한 글꼴로 바꿈 (Word·Excel 원본은 그대로)
const FONT_SWAP = [[/^(맑은 고딕|Malgun Gothic|돋움|Dotum|굴림|Gulim|함초롬돋움)$/i, 'Nanum Gothic'], [/^(바탕|Batang|함초롬바탕|휴먼명조|HY견명조|신명조|궁서)$/i, 'Nanum Myeongjo']];
async function pdfFonts(blob, ext) {
  await loadScript('jszip'); const zip = await JSZip.loadAsync(blob);
  const files = Object.keys(zip.files).filter(p => ext === 'docx' ? /^word\/(document|styles|numbering|fontTable)\.xml$|^word\/theme\/theme\d*\.xml$/.test(p) : /^xl\/(styles|sharedStrings)\.xml$|^xl\/theme\/theme\d*\.xml$|^xl\/worksheets\/sheet\d+\.xml$/.test(p));
  const swap = f => { for (const [re, to] of FONT_SWAP) if (re.test(f)) return to; return f; };
  for (const p of files) { let t = await zip.file(p).async('string'); t = t.replace(/((?:w:ascii|w:hAnsi|w:eastAsia|w:cs|w:name|typeface)="|<(?:name|rFont) val=")([^"]*)"/g, (m, a, f) => a + swap(f) + '"'); zip.file(p, t); }
  return zip.generateAsync({ type: 'blob' });
}
async function deliver(blob, base, ext, fmt) {
  if (fmt !== 'pdf') download(blob, base + '.' + ext);
  if (fmt === 'pdf' || fmt === 'both') {
    const pb = (ext === 'docx' || ext === 'xlsx') ? await pdfFonts(blob, ext).catch(() => blob) : blob;
    const b64 = await window.serverCall('toPdf', await blobToB64(pb), ext, base);
    download(new Blob([b64ToBytes(b64)], { type: 'application/pdf' }), base + '.pdf');
  }
}
async function buildSelfCheck(v, stampB64) { const T = await templates(); return fillDocx(T.selfcheck, v, { 'word/media/image1.png': stampB64 ? b64ToBytes(stampB64) : null }); }
async function buildCasCert(v, mol, stampB64) { const T = await templates(); return fillDocx(T.cas, v, { 'word/media/image1.png': await structurePng(mol), 'word/media/stamp.png': stampB64 ? b64ToBytes(stampB64) : null }); }

// ---------- 통지서 읽기 ----------
async function readNotice(file) {
  await loadScript('pdfjs'); pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfworker;
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), cMapUrl: LIBS.pdfcmaps, cMapPacked: true }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) { const pg = await pdf.getPage(i); const tc = await pg.getTextContent(); text += tc.items.map(t => t.str + (t.hasEOL ? '\n' : ' ')).join('') + '\n'; }
  const t = text.replace(/[ \t]+/g, ' ');
  const g = (re, i = 1) => { const m = t.match(re); return m ? m[i].trim() : ''; };
  const num = g(/제\s*(\d{2}\s*-\s*\d{4}\s*-\s*\d{6})\s*호/);
  const dates = [...t.matchAll(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)];
  const last = dates.at(-1);
  return {
    면제번호: num ? '제' + num.replace(/\s/g, '') + '호' : '',
    물질명: g(/화학물질명\s*\(총칭명\)\s*([\s\S]+?)\s*고유번호/),
    CAS: g(/고유번호[\s\S]{0,40}?(\d{2,7}-\d{2}-\d)/),
    연간제조량: g(/연간\s*제조\s*\(수입\)\s*량\s*\(톤\)\s*([\d.]+)/),
    결과: /비대상\s*\[\s*[√✓Vv]\s*\]/.test(t) ? '비대상' : /대상\s*\[\s*[√✓Vv]\s*\]/.test(t) ? '대상' : '',
    사유: g(/사유\s*:\s*(.+?)(?:\n|면제확인)/),
    통지일: last ? `${last[1]}-${last[2].padStart(2, '0')}-${last[3].padStart(2, '0')}` : '',
    원문: text.slice(0, 3000),
  };
}

window.Docs = { hOf, setDict, compData, findComp, toComps, BASE_COMPS, templates, buildRnd, buildIdPng, deliver, blobToB64, SOLV, SOLV_ORDER, classify, msdsContent, buildMsdsXlsx, buildMonomerXlsx, buildSelfCheck, buildCasCert, readNotice, download, safeName, ymd, loadScript };
})();
