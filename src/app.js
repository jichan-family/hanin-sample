const OCL_URL = 'https://cdn.jsdelivr.net/npm/openchemlib@9.26.0/dist/openchemlib.js';
const KINDS = ['단분자', '고분자', '이온성물질', '혼합물'];
const MOD_TYPES = ['없음', '말단개질', '그래프트', '반응생성물', '개질'];
const DEFAULT_COS = ['한인', '엘에스켐', '제이와이트리켐', '케미웍스'];
const EX_DOCS = ['연구개발용확인서', 'CAS미부여확인서', '물질식별정보', '단량체정보'];
const SUB_DOCS = ['자진확인서', 'MSDS'];
const DOC_LABEL = { 연구개발용확인서: '연구개발용 확인서', CAS미부여확인서: 'CAS 미부여 확인서', 물질식별정보: '물질 식별정보', 단량체정보: '단량체 정보', 자진확인서: '자진확인서', MSDS: 'MSDS' };
const S = window.S = { data: {}, samples: [], tab: '한인', kind: '전체', view: 'list', q: '', sort: 'new', pw: null, hits: null, OCL: null, mols: {}, dmols: {}, qEditor: null, fEditor: null, mEditor: null, editing: null, today: '', setTab: '기타', ptTab: '고객사', dTab: 'info' };

// ---------- 공통 ----------
const call = window.serverCall = (fn, ...args) => new Promise((ok, no) => {
  const r = google.script.run.withSuccessHandler(ok).withFailureHandler(no);
  // 업데이트 직후 열린 창은 새 서버 기능을 모를 수 있음 → 새로고침 안내
  if (typeof r[fn] !== 'function') { no(new Error('앱이 새 버전 기능을 아직 모릅니다. 창을 새로고침(Ctrl+F5)한 뒤 다시 해 주세요.')); return; }
  r[fn](...args);
});
const $ = id => document.getElementById(id);
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rows = t => S.data[t] || (S.data[t] = []);
function upsert(t, o) { const L = rows(t), i = L.findIndex(x => x.id === o.id); if (i >= 0) L[i] = o; else L.push(o); }
async function save(t, o) { const r = await call('saveRow', S.pw, t, o); upsert(t, r); return r; }
async function remove(t, id) { await call('deleteRow', S.pw, t, id); S.data[t] = rows(t).filter(x => x.id !== id); if (t === '샘플') S.samples = rows('샘플'); }
function setting(id, def) { const r = rows('설정').find(x => x.id === id); return r && r['값'] !== '' ? r['값'] : def; }
const errMsg = e => esc((e && e.message) || e);
function flash(id, text, ok = true) { const el = $(id); if (!el) return; el.className = 'msg ' + (ok ? 'ok' : 'bad'); el.innerHTML = text; }
// 서류 만들기 꼬리표: 만든 샘플이 지금 열려 있을 때만 그 줄에 ✓, 아니면 화면 아래 알림
function toast(text, ok = true) {
  let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  const el = document.createElement('div'); el.className = 'tmsg ' + (ok ? 'ok' : 'bad'); el.innerHTML = text; t.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ok ? 3500 : 6000);
}
function docJob(msgId, label) {
  const sid = S.cur && S.cur.id, no = S.cur ? (S.cur['관리번호'] || S.cur['제품명']) : '';
  const here = () => $('detail').classList.contains('open') && S.cur && S.cur.id === sid;
  return {
    busy(t) { if (here()) flash(msgId, t); },
    done(ok = true, err = '') { if (here()) flash(msgId, ok ? '✓' : err, ok); else toast(ok ? `${esc(no)} ${esc(label)} 다운로드 완료` : `${esc(no)} ${esc(label)} 실패: ${err}`, ok); }
  };
}
window.docJob = docJob;
// 저장·삭제 버튼: 누르면 '저장 중…'으로 바꾸고 끝날 때까지 다시 못 누름
async function busy(fn, label = '저장 중…') {
  const ev = window.event, b = ev && ev.target && ev.target.closest ? ev.target.closest('button') : null;
  if (b && b.dataset.busy) return;
  const t = b ? b.innerHTML : ''; if (b) { b.dataset.busy = '1'; b.disabled = true; b.textContent = label; }
  try { return await fn(); } finally { if (b) { delete b.dataset.busy; b.disabled = false; b.innerHTML = t; } }
}
const dash = v => (v == null || v === '') ? '<span class="dash">-</span>' : esc(v);
const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);

// ---------- 출고사 · 고객사 ----------
function coRows() { return rows('출고사').filter(r => r['정식'] === 'Y').sort((a, b) => (+a['순서'] || 99) - (+b['순서'] || 99)); }
function coNames() { const L = coRows().map(r => r['이름']); return L.length ? L : DEFAULT_COS; }
const coOf = n => rows('출고사').find(r => r['이름'] === n) || null;
const coColor = n => { const c = coOf(n); return (c && c['색']) || (DEFAULT_COS.includes(n) ? { 한인: '#1f6feb', 엘에스켐: '#1a7f37', 제이와이트리켐: '#c4520a', 케미웍스: '#6e7781' }[n] : '#8c959f'); };
function coDocs(n) { const c = coOf(n); if (c) return list(c['작성서류']); return n === '한인' ? [...EX_DOCS, ...SUB_DOCS] : n === '엘에스켐' ? ['CAS미부여확인서', '물질식별정보', '단량체정보', 'MSDS'] : ['MSDS']; }
const coBadge = (n, big) => `<span class="b co ${big ? 'big' : ''}" style="--c:${coColor(n)}">${esc(n)}</span>`;
const companyOf = s => s['관리회사'] === '기타' ? (s['기타회사'] || '기타') : s['관리회사'];
const noTag = s => `<span class="no co" style="--c:${coColor(companyOf(s))}">${esc(s['관리번호'] || '번호 없음')}</span>`;
const namesOf = s => list(s['명의']);
function etcNames() {
  const N = coNames(), set = new Set();
  S.samples.forEach(s => { if (s['관리회사'] === '기타' && s['기타회사']) set.add(s['기타회사']); namesOf(s).forEach(n => { if (!N.includes(n)) set.add(n); }); });
  rows('출고').forEach(x => { if (x['명의'] && !N.includes(x['명의'])) set.add(x['명의']); });
  return [...set];
}
const coFull = n => n === '한인' ? '한인정밀화학' : n; // 넓은 곳(선택 칸·버튼)에서만 긴 이름, 저장 값은 '한인'
const custOf = n => rows('고객사').find(r => r['회사명'] === n) || null;
function seg(id, opts, chosen, type, colored) {
  $(id).innerHTML = opts.map(o => `<label><input type="${type}" name="${id}" value="${esc(o)}" ${chosen.includes(o) ? 'checked' : ''}><span class="${colored ? 'co' : ''}" style="${colored ? '--c:' + coColor(o) : ''}">${esc(colored ? coFull(o) : o)}</span></label>`).join('');
}
const segVal = id => { const x = document.querySelector(`input[name="${id}"]:checked`); return x ? x.value : ''; };
const segVals = id => [...document.querySelectorAll(`input[name="${id}"]:checked`)].map(x => x.value);

// ---------- 날짜 ----------
const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const m = String(s || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const yearEnd = s => { const d = parseD(s); return d ? fmt(new Date(d.getFullYear() + 1, d.getMonth(), d.getDate() - 1)) : ''; };
const daysSince = s => { const d = parseD(s), t = parseD(S.today); return d && t ? Math.round((t - d) / 864e5) : 0; };
const korDate = s => { const d = parseD(s); return d ? `${d.getFullYear()}년 ${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일` : ''; };
const dotDate = s => { const d = parseD(s); return d ? `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}.` : ''; };
const pointDate = s => { const d = parseD(s); return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : ''; };

// ---------- 화면 이동 · 뒤로가기 ----------
const NAV = { stack: [], seq: 0, waiting: null };
const H = () => (window.google && google.script && google.script.history) || null;
function pushNav(e) { e.n = ++NAV.seq; NAV.stack.push(e); try { const h = H(); if (h) h.push({ n: e.n }); else history.pushState({ n: e.n }, ''); } catch (er) {} }
function undoNav(e) { if (e.t === 'modal') $(e.id).classList.remove('open'); else if (e.t === 'view') { showView(e.prev); if (e.from) showDetail(e.from, true, e.fromTab); } }
function onNavChange(n) { if (NAV.waiting) { clearTimeout(NAV.waiting); NAV.waiting = null; } while (NAV.stack.length && NAV.stack[NAV.stack.length - 1].n > (n || 0)) undoNav(NAV.stack.pop()); }
function navBack(fallback) {
  try { history.back(); } catch (er) {}
  NAV.waiting = setTimeout(() => { NAV.waiting = null; const e = NAV.stack.pop(); if (e) undoNav(e); else if (fallback) fallback(); }, 350);
}
try { const h = H(); if (h) h.setChangeHandler(ev => onNavChange(ev.state && ev.state.n)); else window.addEventListener('popstate', ev => onNavChange(ev.state && ev.state.n)); } catch (er) {}
window.openModal = (id, noPush) => { $(id).classList.add('open'); if (!noPush) pushNav({ t: 'modal', id }); };
window.closeModal = id => {
  const top = NAV.stack[NAV.stack.length - 1];
  if (top && top.t === 'modal' && top.id === id) navBack(); else { $(id).classList.remove('open'); NAV.stack = NAV.stack.filter(e => !(e.t === 'modal' && e.id === id)); }
};
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; const st = NAV.stack.filter(x => x.t === 'modal' && $(x.id).classList.contains('open')), L = [...document.querySelectorAll('.modal.open')]; const id = st.length ? st[st.length - 1].id : L.length ? L[L.length - 1].id : null; if (id) { e.preventDefault(); closeModal(id); } });
window.closeAllModals = closeAllModals; function closeAllModals() { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); NAV.stack = NAV.stack.filter(e => e.t !== 'modal'); }
function showView(v) {
  S.view = v;
  document.querySelectorAll('.nav').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  ['list', 'partners', 'msds', 'settings'].forEach(k => $('view_' + k).style.display = k === v ? '' : 'none');
  if (v === 'settings') renderSettings(); if (v === 'msds') msdsRefresh(); if (v === 'list') render(); if (v === 'partners') renderPartners();
  window.scrollTo(0, 0);
}
window.navTo = (v, from, fromTab) => {
  if (v === 'msds' && !from) { S.msds = blankMsds(); S.msdsCtx = null; }
  if (v === S.view && v !== 'msds') return;
  closeAllModals(); pushNav({ t: 'view', prev: S.view, from: from || null, fromTab }); S.msdsFrom = from || null; S.msdsFromTab = fromTab; showView(v);
};
window.goBack = () => navBack(() => { showView('list'); if (S.msdsFrom) showDetail(S.msdsFrom, false, S.msdsFromTab); });

// ---------- 구조 라이브러리 ----------
let oclPromise = null;
function loadOCL() { if (!oclPromise) oclPromise = import(OCL_URL).then(m => { S.OCL = m.default || m; return S.OCL; }); return oclPromise; }
function molFrom(idcode, coords) { try { return S.OCL.Molecule.fromIDCode(idcode, coords || undefined); } catch (e) { return null; } }
function molOf(s) { if (!s || !s.idcode) return null; if (!(s.id in S.mols)) S.mols[s.id] = molFrom(s.idcode, s['좌표']); return S.mols[s.id]; }
function parseText(txt) {
  const M = S.OCL.Molecule, t = (txt || '').trim(); if (!t) return null;
  if (/M\s+END/.test(t) || /V[23]000/.test(t)) return M.fromMolfile(t);
  if (/^<\?xml|<CDXML/i.test(t)) throw new Error('CDXML 형식은 읽을 수 없습니다. ChemDraw에서 Copy As → SMILES 또는 Molfile로 복사해 주세요.');
  return M.fromSmiles(t.split(/\s+/)[0]);
}
// ---------- 구조 배치 정리 (RDKit CoordGen: 큰 고리·스피로 구조도 켐드로우처럼) ----------
let RDK = null;
async function rdkit() {
  if (RDK) return RDK;
  await Docs.loadScript('rdkit');
  const base = document.querySelector('script[src*="RDKit_minimal"]').src.replace(/RDKit_minimal\.js.*$/, '');
  RDK = await window.initRDKitModule({ locateFile: () => base + 'RDKit_minimal.wasm' }); RDK.prefer_coordgen(true); return RDK;
}
async function tidyMol(m) {
  if (!m || !m.getAllAtoms()) return m;
  const R = await rdkit(), r = R.get_mol(m.toMolfile());
  if (!r || !r.is_valid()) { if (r) r.delete(); throw new Error('구조를 정리하지 못했습니다.'); }
  try { r.set_new_coords(true); return S.OCL.Molecule.fromMolfile(r.get_molblock()); } finally { r.delete(); }
}
window.tidyMol = tidyMol;
// 붙여넣기: Molfile은 원래 배치 그대로, SMILES는 정리한 배치로
async function pasteInto(editor, txt) {
  const isMolfile = /M\s+END/.test(txt) || /V[23]000/.test(txt), m = parseText(txt); if (!m) return false;
  editor.setMolecule(m);
  if (!isMolfile && !editor.fragment) { try { editor.setMolecule(await tidyMol(m), true); } catch (e) { console.warn(e); } }
  return true;
}
window.pasteInto = pasteInto;
const smilesOf = m => { try { return m.toIsomericSmiles ? m.toIsomericSmiles() : m.toSmiles(); } catch (e) { return ''; } };
function prepQuery(mol, skeleton) {
  const M = S.OCL.Molecule, f = mol.getCompactCopy();
  f.setFragment(true); f.ensureHelperArrays(M.cHelperRings);
  if (skeleton) { const any = M.cBondQFSingle | M.cBondQFDouble | M.cBondQFTriple | M.cBondQFDelocalized; for (let b = 0; b < f.getAllBonds(); b++) f.setBondQueryFeature(b, any, true); return f; }
  const rs = f.getRingSet(), ar = [];
  for (let r = 0; r < rs.getSize(); r++) { const atoms = rs.getRingAtoms(r), bonds = rs.getRingBonds(r); ar.push({ atoms, bonds, arom: bonds.every(b => f.isAromaticBond(b) || f.isDelocalizedBond(b)), het: atoms.some(a => f.getAtomicNo(a) !== 6) }); }
  const mark = ar.map(r => r.arom && r.het); let grow = true;
  while (grow) { grow = false; ar.forEach((r, i) => { if (mark[i] || !r.arom) return; if (ar.some((o, j) => mark[j] && o.atoms.some(a => r.atoms.includes(a)))) { mark[i] = true; grow = true; } }); }
  const flag = M.cBondQFSingle | M.cBondQFDouble | M.cBondQFDelocalized;
  ar.forEach((r, i) => { if (!mark[i]) return; r.bonds.forEach(b => f.setBondQueryFeature(b, flag, true)); r.atoms.forEach(a => f.setAtomQueryFeature(a, M.cAtomQFAromatic, true)); });
  return f;
}
function svgOf(mol, w, h, hl) {
  const m = mol.getCompactCopy();
  if (hl) hl.forEach(a => { if (a >= 0) m.setAtomColor(a, S.OCL.Molecule.cAtomColorRed); });
  return m.toSVG(w, h, undefined, { autoCrop: true, autoCropMargin: 8, suppressChiralText: true, suppressCIPParity: true });
}
function chemInfo(mol) { const f = mol.getMolecularFormula(), ic = mol.getIDCodeAndCoordinates(); return { formula: f.formula, mw: f.relativeWeight.toFixed(2), idcode: ic.idCode, coords: ic.coordinates, index: mol.getIndex().join(',') }; }
function ionParts(mol) {
  const groups = new Map();
  mol.getFragments().forEach(f => {
    let q = 0; for (let a = 0; a < f.getAllAtoms(); a++) q += f.getAtomCharge(a);
    const smi = smilesOf(f), fm = f.getMolecularFormula();
    if (!groups.has(smi)) groups.set(smi, { smi, q, formula: fm.formula, mw: fm.relativeWeight, n: 0 });
    groups.get(smi).n++;
  });
  const list = [...groups.values()];
  return { list, total: list.reduce((a, g) => a + g.q * g.n, 0), multi: list.reduce((a, g) => a + g.n, 0) > 1, charged: list.some(g => g.q) };
}
function ionHtml(m, balanceFn) {
  const p = ionParts(m); if (!p.multi && !p.charged) return '';
  const c = m.getMolecularFormula(), qs = q => q ? (q > 0 ? `+${q > 1 ? q : ''}` : `−${q < -1 ? -q : ''}`) : '중성';
  return `<b>전체(염)</b> ${esc(c.formula)} · ${c.relativeWeight.toFixed(2)} · 전하 합 ${p.total > 0 ? '+' : ''}${p.total}` +
    (p.charged && p.total !== 0 ? ` <span class="b bad">전하 불균형</span> <button class="sm" onclick="${balanceFn}">개수 맞추기</button>` : '') + '<br>' +
    p.list.map(g => `${g.q > 0 ? '양이온' : g.q < 0 ? '음이온' : '조각'} (${qs(g.q)}) ${esc(g.formula)} · ${g.mw.toFixed(2)}${g.n > 1 ? ` × ${g.n}` : ''}`).join('<br>');
}
const gcd = (a, b) => b ? gcd(b, a % b) : a;
function balanced(m) {
  const p = ionParts(m), cat = p.list.filter(g => g.q > 0), an = p.list.filter(g => g.q < 0);
  if (cat.length !== 1 || an.length !== 1) { alert('양이온 1종과 음이온 1종일 때만 자동으로 맞출 수 있습니다.'); return null; }
  const qc = cat[0].q, qa = -an[0].q, g = gcd(qc, qa);
  const others = p.list.filter(x => !x.q).flatMap(x => Array(x.n).fill(x.smi));
  return S.OCL.Molecule.fromSmiles([...Array(qa / g).fill(cat[0].smi), ...Array(qc / g).fill(an[0].smi), ...others].join('.'));
}
function checkMol(mol) {
  const w = [];
  for (let a = 0; a < mol.getAllAtoms(); a++) if (mol.getAtomicNo(a) === 0) { w.push('* 또는 R 원자가 있습니다. 고분자는 단량체로 등록하세요.'); break; }
  const p = ionParts(mol);
  if (p.charged && p.total !== 0) w.push(`전하 합이 ${p.total > 0 ? '+' : ''}${p.total}입니다. 이온 개수를 확인하세요 ([개수 맞추기]).`);
  else if (p.multi && !p.charged) w.push('구조가 여러 조각으로 나뉘어 있습니다. 끊어진 결합이 없는지 확인하세요.');
  return w;
}

// ---------- 단량체 ----------
const parseMono = str => String(str || '').split(';').map(x => x.trim()).filter(Boolean).map(x => { const p = x.split('|').map(y => y.trim()); return p.length >= 3 ? { abbr: p[0], name: p[1], cas: p[2] } : { abbr: p[0], name: p[1] || p[0], cas: '' }; });
const fmtMono = L => L.filter(m => m.abbr || m.name).map(m => [m.abbr || m.name, m.name || m.abbr, m.cas || ''].join('|')).join('; ');
function parseMod(s) {
  let o = {}; try { o = typeof s === 'string' ? JSON.parse(s || '{}') : (s || {}); } catch (e) { o = {}; }
  let list = o.물질; if (typeof list === 'string') list = list ? [{ abbr: '', name: list, cas: '' }] : []; if (!Array.isArray(list)) list = [];
  return { 방식: o.방식 || '', 기반: o.기반 || '', 물질: list };
}
function dictFind(m) {
  const D = rows('단량체'), a = String(m.abbr || '').trim().toLowerCase(), c = String(m.cas || '').trim();
  return (a && D.find(d => String(d['약어']).trim().toLowerCase() === a)) || (c && D.find(d => d.CAS === c)) || null;
}
function monoMol(m) {
  if (m.idcode) return molFrom(m.idcode, m.coords);
  const d = dictFind(m); if (!d || !d.idcode) return null;
  if (!(d.id in S.dmols)) S.dmols[d.id] = molFrom(d.idcode, d['좌표']);
  return S.dmols[d.id];
}
function polyParts(s) {
  const mono = parseMono(s['단량체']), md = parseMod(s['개질']);
  let base = mono;
  if (md.기반 && !mono.length) { const b = S.samples.find(x => x.id === md.기반); if (b) base = parseMono(b['단량체']); }
  return { mono: base, mod: md.방식 && md.방식 !== '없음' ? md.물질 : [], md };
}
function monoView(s, w, h) {
  if (!S.OCL) return '';
  const { mono, mod } = polyParts(s);
  const items = [...mono.map(m => ({ m, mod: false })), ...mod.map(m => ({ m, mod: true }))].map(x => ({ ...x, mol: monoMol(x.m) }));
  if (!items.some(x => x.mol)) return '';
  const show = items.slice(0, 3), more = items.length - show.length, ww = Math.floor(w / show.length);
  return '<div class="monos">' + show.map((x, i) => `${i ? '<span class="plus">+</span>' : ''}<div class="m ${x.mod ? 'mod' : ''}">${x.mol ? svgOf(x.mol, ww, h) : '<span class="nostruct">구조 없음</span>'}<small>${esc(x.m.abbr || x.m.name)}${x.mod ? ' (개질)' : ''}</small></div>`).join('') +
    (more > 0 ? `<span class="hint">외 ${more}개</span>` : '') + '</div>';
}

// ---------- 제출 형태 ----------
const SOLV_SHORT = { EA: 'EA', MEK: 'MEK', ACT: 'Acetone', TOL: 'Toluene', HEX: 'Hexane', THF: 'THF', MC: 'MC', PGMEA: 'PGMEA', PGME: 'PGME', DMSO: 'DMSO' };
const SOLV_ALIAS = { ACETONE: 'ACT', TOLUENE: 'TOL', HEXANE: 'HEX', 'N-HEXANE': 'HEX', 'ETHYL ACETATE': 'EA', DCM: 'MC', 'METHYLENE CHLORIDE': 'MC' };
function parseForm(str) { try { const o = typeof str === 'string' ? JSON.parse(str || 'null') : str; if (o && o.t) return o; } catch (e) {} return null; }
function legacyForm(s) {
  const m = String((s && s['용매농도']) || '').match(/(\d+(?:\.\d+)?)\s*%\s*in\s*(.+)/i); if (!m) return null;
  const ks = [...new Set(m[2].split(/[\/,+]| and /i).map(t => t.trim().toUpperCase()).map(k => SOLV_ALIAS[k] || k).filter(k => Docs.SOLV[k]))];
  if (!ks.length) return null; const p = parseFloat(m[1]), rest = 100 - p;
  return { t: 'sol', p, s: ks.map(k => ({ k, p: +(rest / ks.length).toFixed(2) })) };
}
const formText = f => !f ? '-' : f.t === 'neat' ? '물질 그대로' : `${f.p}% in ${f.s.map(x => SOLV_SHORT[x.k] || x.k).join(' + ')}`;
const formSuffix = f => f && f.t === 'sol' && f.s.length ? `(${f.p}% ${f.s.map(x => SOLV_SHORT[x.k] || x.k).join('+')})` : '';
const baseName = s => Docs.safeName(s ? `${s['관리번호'] ? s['관리번호'] + '_' : ''}${s['제품명']}` : '');

// ---------- 신고면제 · 상태 ----------
const exOf = (sid, inst) => rows('신고면제').filter(e => e['샘플id'] === sid && (!inst || (e['기관'] || '동우화인켐') === inst)).sort((a, b) => (b['신청일'] || '').localeCompare(a['신청일'] || ''));
const shipDate = x => x['출고일'] || x['서류제출일'] || x['요청일'] || String(x['등록일'] || '').slice(0, 10);
const shipsOf = sid => rows('출고').filter(e => e['샘플id'] === sid).sort((a, b) => shipDate(b).localeCompare(shipDate(a)) || String(b['등록일'] || '').localeCompare(String(a['등록일'] || '')));
function exState(e) {
  if (e['결과'] === '비대상') return { k: '반려', cls: 'bad', txt: '비대상(면제 안 됨)' };
  if (e['면제번호']) {
    if (e['기간종료'] && e['기간종료'] < S.today) return { k: '만료', cls: 'bad', txt: '기간 만료 · 재신청 필요' };
    return { k: '유효', cls: 'ok', txt: `면제 유효 ~${e['기간종료'] || '?'}` };
  }
  if (e['신청일']) { const d = daysSince(e['신청일']); return { k: '대기', cls: d > 14 ? 'bad' : 'wait', txt: `통지 대기 ${d}일째${d > 14 ? ' · 지연' : ''}` }; }
  return { k: '없음', cls: 'etc', txt: '기록 없음' };
}
function sampleEx(sid, inst) { const L = exOf(sid, inst).map(e => ({ e, st: exState(e) })); return L.find(x => x.st.k === '유효') || L.find(x => x.st.k === '대기') || L[0] || null; }
function sampleStatus(sid) {
  const L = exOf(sid), sh = shipsOf(sid)[0];
  const pend = L.find(e => exState(e).k === '대기');
  if (pend) { const d = daysSince(pend['신청일']); return { txt: d > 14 ? `신고면제 진행중 · ${d}일` : '신고면제 진행중', cls: d > 14 ? 'bad' : 'wait' }; }
  if (sh && sh['서류제출일']) return { txt: '서류 제출완료', cls: 'ok' };
  if (L.length && !L.some(e => exState(e).k === '유효') && L.some(e => exState(e).k === '만료')) return { txt: '재신청 필요', cls: 'bad' };
  return null;
}
const kindsOf = s => String(s['종류'] || '').replace(/단물질/g, '단분자').replace(/이온성액체/g, '이온성물질').split(',').map(x => x.trim()).filter(Boolean);

// ---------- 목록 ----------
function inTab(s, t) {
  if (t === '전체') return true;
  if (t === '기타') { const N = coNames(); return s['관리회사'] === '기타' || namesOf(s).some(n => !N.includes(n)); }
  return s['관리회사'] === t || namesOf(s).includes(t);
}
const inKind = (s, k) => k === '전체' || kindsOf(s).includes(k);
function cardBadges(s) {
  const n = namesOf(s), own = companyOf(s);
  const show = n.length >= 2 ? n : (n.length === 1 && n[0] !== own ? n : []);
  return show.map(x => coBadge(x)).join('');
}
function renderFilters() {
  const tabs = ['전체', ...coNames(), ...(etcNames().length || S.samples.some(s => s['관리회사'] === '기타') ? ['기타'] : [])];
  if (!tabs.includes(S.tab)) S.tab = tabs.includes('한인') ? '한인' : '전체';
  $('tabs').innerHTML = tabs.map(t => `<button class="tab ${S.tab === t ? 'on' : ''}" style="${t === '전체' || t === '기타' ? '' : '--c:' + coColor(t)}" onclick="setTab('${esc(t)}')">${esc(t)}<span class="n">${S.samples.filter(s => inTab(s, t)).length}</span></button>`).join('');
  const base = S.samples.filter(s => inTab(s, S.tab));
  $('kinds').innerHTML = ['전체', ...KINDS].map(k => `<button class="chip ${S.kind === k ? 'on' : ''}" onclick="setKind('${k}')">${k}<span class="n">${base.filter(s => inKind(s, k)).length}</span></button>`).join('');
}
window.setTab = t => { S.tab = t; render(); };
window.setKind = k => { S.kind = k; render(); };
const numKey = s => { const m = String(s['관리번호'] || '').match(/(\d+)$/); return m ? +m[1] : 0; };
function render() {
  if (!S.samples) return;
  renderFilters();
  let L = S.samples.filter(s => inTab(s, S.tab) && inKind(s, S.kind));
  const q = S.q.trim().toLowerCase();
  if (q) L = L.filter(s => ['관리번호', '제품명', '물질명', 'CAS', '용도', '고객사', '고객사담당자', '비고', '성상', '분자식', '단량체', '성분', '용매농도', '명의', '기타회사'].some(k => (s[k] || '').toLowerCase().includes(q)));
  if (S.hits) L = L.filter(s => S.hits.has(s.id));
  if (S.hits && S.hitMode === 'sim') L.sort((a, b) => S.hits.get(b.id).score - S.hits.get(a.id).score);
  else if (S.sort === 'name') L.sort((a, b) => a['제품명'].localeCompare(b['제품명'], 'ko'));
  else if (S.sort === 'num') L.sort((a, b) => companyOf(a).localeCompare(companyOf(b), 'ko') || numKey(a) - numKey(b));
  else L.sort((a, b) => { const ao = a['출처'] === '기존 자료', bo = b['출처'] === '기존 자료'; if (ao !== bo) return ao ? 1 : -1; if (ao) return numKey(b) - numKey(a); return (b['등록일'] || '').localeCompare(a['등록일'] || ''); });
  if (q && /^\S+-\d+$/.test(q)) L.sort((a, b) => ((b['관리번호'] || '').toLowerCase() === q) - ((a['관리번호'] || '').toLowerCase() === q));
  $('status').textContent = `${L.length}건` + (S.hits ? ` · 구조 검색 결과 (${{ sub: '부분구조', exact: '완전일치', sim: '유사구조' }[S.hitMode]})` : '');
  $('grid').innerHTML = L.map(s => {
    const h = S.hits && S.hits.get(s.id), st = sampleStatus(s.id);
    return `<div class="card" onclick="showDetail('${s.id}')">
      <div class="struct" data-id="${s.id}">${st ? `<span class="b ${st.cls} stbadge">${st.txt}</span>` : ''}${s['출처'] === '기존 자료' && s['검증'] !== 'Y' ? '<span class="olddot" title="기존 자료 (엑셀에서 이관, 미검증)"></span>' : ''}<div class="sv">${s.idcode ? '' : noStruct(s)}</div></div>
      <div class="body"><div class="cardhead">${noTag(s)}<div class="name">${esc(s['제품명'])}</div></div>
      <div class="chem">${s['물질명'] ? esc(s['물질명']) : '<span class="dash">물질명 -</span>'}</div>
      <div class="cas">CAS ${s.CAS ? esc(s.CAS) : '<span class="dash">-</span>'}</div>
      <div class="badges">${h && S.hitMode === 'sim' ? `<span class="b score">${Math.round(h.score * 100)}%</span>` : ''}${h && h.mono ? '<span class="b info">단량체 일치</span>' : ''}${cardBadges(s)}</div></div></div>`;
  }).join('') || '<p class="empty">조건에 맞는 샘플이 없습니다.</p>';
  drawCards();
}
function drawCards() {
  if (!S.OCL) return;
  document.querySelectorAll('.struct[data-id]').forEach(el => {
    const s = S.samples.find(x => x.id === el.dataset.id); if (!s) return; const sv = el.querySelector('.sv'), m = molOf(s);
    if (m) { const h = S.hits && S.hits.get(s.id); try { sv.innerHTML = svgOf(m, 240, 158, h && h.match); } catch (e) { sv.innerHTML = '<span class="nostruct">그리기 오류</span>'; } }
    else { const mv = monoView(s, 238, 130); if (mv) { sv.style.width = '100%'; sv.style.height = '100%'; sv.innerHTML = mv; } }
  });
}
function noStruct(s) {
  if (s['성분']) { const L = parseComps(s['성분']); if (L.length) return '<div class="nostruct mixsum"><b>혼합물</b><br>' + L.map(c => esc(c.name || c.cas) + (c.rest ? '' : c.pct !== '' && c.pct != null ? ' ' + esc(c.pct) + '%' : '')).join(' · ') + (L.some(c => c.rest) ? ' in ' + esc((L.find(c => c.rest) || {}).name || '') : '') + '</div>'; }
  if (s['단량체']) return '<div class="nostruct">단량체<br>' + parseMono(s['단량체']).map(m => esc(m.abbr)).join(' · ') + '</div>';
  return '<span class="nostruct">구조 미등록</span>';
}

// ---------- 상세 ----------
window.showDetail = (id, noPush, tab) => {
  const s = S.samples.find(x => x.id === id); if (!s) return;
  S.cur = s; if (tab) S.dTab = tab; else if (!$('detail').classList.contains('open')) S.dTab = 'info';
  renderDetail();
  if (!$('detail').classList.contains('open')) openModal('detail', noPush);
};
window.setDTab = t => { S.dTab = t; renderDetail(); };
function exDot(sid) {
  const L = exOf(sid); if (!L.length) return '';
  const sts = L.map(e => exState(e).cls);
  const c = sts.includes('bad') ? 'var(--bad)' : sts.includes('wait') ? '#d4a72c' : sts.includes('ok') ? 'var(--ok)' : '';
  return c ? `<i class="tdot" style="background:${c}"></i>` : '';
}
function renderDetail() {
  const s = S.cur, st = sampleStatus(s.id);
  $('dName').innerHTML = `${noTag(s)}<span class="dn">${esc(s['제품명'])}</span>${st ? `<span class="b ${st.cls}" style="margin-left:6px">${st.txt}</span>` : ''}`;
  $('dTabs').innerHTML = [['info', '샘플 정보', ''], ['ex', '신고면제', exDot(s.id)], ...(document.body.classList.contains('editing') ? [['ship', '제출 서류', '']] : [])].map(([k, l, d]) => `<button class="tab ${S.dTab === k ? 'on' : ''}" onclick="setDTab('${k}')">${l}${d}</button>`).join('');
  $('dInfo').style.display = S.dTab === 'info' ? '' : 'none'; $('dExTab').style.display = S.dTab === 'ex' ? '' : 'none'; $('dShipTab').style.display = S.dTab === 'ship' ? '' : 'none';
  const m = S.OCL && molOf(s), mv = !m && S.OCL ? monoView(s, 500, 240) : '';
  $('dStruct').classList.toggle('small', !m && !mv);
  $('dStruct').innerHTML = m ? svgOf(m, 520, 290, S.hits && S.hits.get(s.id) && S.hits.get(s.id).match) : (mv || noStruct(s));
  const poly = kindsOf(s).includes('고분자'), md = parseMod(s['개질']);
  const items = [['물질명', s['물질명']], ['CAS', s.CAS], ['종류', kindsOf(s).join(', ')]];
  if (s['성분']) items.push(['성분', compSummary(parseComps(s['성분']))]);
  if (poly) items.push(['단량체', parseMono(s['단량체']).map(x => `${x.abbr}${x.name !== x.abbr ? ' (' + x.name + ')' : ''}${x.cas ? ' ' + x.cas : ''}`).join(' · ')]);
  else items.push(['분자식', s['분자식']], ['분자량', s['분자량']]);
  items.push(['성상', s['성상']], ['용도', s['용도']], ['고객사', s['고객사']], ['관리회사', companyOf(s)]);
  if (md.방식 && md.방식 !== '없음') items.push(['개질', `${md.방식}${md.기반 ? ' · 기반: ' + ((S.samples.find(x => x.id === md.기반) || {})['제품명'] || '') : ''} · ${md.물질.map(x => x.name || x.abbr).join(', ')}`]);
  if (s['비고']) items.push(['비고', s['비고']]);
  if (s['용매농도']) items.push(['이전 형태', s['용매농도']]);
  $('dKv').innerHTML = items.map(([k, v]) => `<div class="k">${k}</div><div>${dash(v)}</div>`).join('');
  $('dFoot').textContent = [s['등록일'] && '등록 ' + s['등록일'], s['수정일'] && '수정 ' + s['수정일']].filter(Boolean).join(' · ');
  renderShipList(s); renderExTab(s); renderDocsTab(s);
  $('dEdit').onclick = () => { closeAllModals(); openForm(s.id); };
}
// ----- 신고면제 탭 -----
function exDocsFor(s, co) {
  const docs = coDocs(co), hasCas = !!s.CAS, poly = kindsOf(s).includes('고분자'), out = [];
  if (docs.includes('연구개발용확인서')) out.push({ k: '연구개발용확인서', f: 'docx' });
  if (docs.includes('CAS미부여확인서')) out.push({ k: 'CAS미부여확인서', f: 'docx', off: hasCas });
  if (docs.includes('물질식별정보') && !poly) out.push({ k: '물질식별정보', f: 'png', off: hasCas });
  if (docs.includes('단량체정보') && poly) out.push({ k: '단량체정보', f: 'xlsx', off: hasCas });
  return out;
}
const FMTB = { docx: [['orig', 'Word'], ['pdf', 'PDF']], xlsx: [['orig', 'Excel'], ['pdf', 'PDF']], png: [['orig', 'PNG']] };
function renderExTab(s) {
  const L = exOf(s.id);
  const L2 = [...L].reverse();
  $('dEx').innerHTML = L.length ? L2.map((e, i) => { const st = exState(e); return `<div class="exrow"><span class="exno">${i + 1}</span>
      <b class="exnum">${e['면제번호'] ? esc(e['면제번호']) : `<span class="dash">통지 대기${e['신청일'] ? ' (신청 ' + esc(e['신청일']) + ')' : ''}</span>`}</b>
      <span class="exdate">${esc(e['통지일'] || '')}</span><span class="exinst">${esc(e['기관'] || '동우화인켐')}</span><span class="b ${st.cls} exst">${st.txt}</span>
      <span style="flex:1"></span><span class="acts edit-only">${!e['면제번호'] && e['결과'] !== '비대상' ? `<label class="file" title="통지서 PDF를 읽어 이 기록에 채웁니다"><input type="file" accept=".pdf" style="display:none" onchange="exNoticeFor('${e.id}',this.files[0]);this.value=''"><span class="b info big">통지서 넣기</span></label>` : ''}<button class="sm" onclick="openEx('${e.id}')">상세</button><button class="sm danger" onclick="delExRow('${e.id}')">삭제</button></span></div>`; }).join('')
    : '<div class="exrow"><span class="dash">기록 없음</span></div>';
  const cos = coNames().filter(n => coDocs(n).some(d => EX_DOCS.includes(d)));
  if (!S.exCo || !cos.includes(S.exCo)) S.exCo = (L[0] && L[0]['신청회사']) || (cos.includes(companyOf(s)) ? companyOf(s) : '한인');
  const insts = rows('고객사').map(x => x['회사명']); const inst0 = (L[0] && L[0]['기관']) || '동우화인켐';
  $('xd_co').innerHTML = cos.map(c => `<option value="${esc(c)}" ${c === S.exCo ? 'selected' : ''}>${esc(coFull(c))}</option>`).join('');
  $('xd_inst').innerHTML = (insts.length ? insts : ['동우화인켐']).map(c => `<option ${c === inst0 ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('xd_date').value = (L[0] && L[0]['신청일']) || S.today; $('xd_name').value = s['물질명'] || ''; $('xd_use').value = s['용도'] ? useText(s['용도']) : '';
  renderExDocs();
}
window.renderExDocs = () => {
  const s = S.cur; S.exCo = $('xd_co').value || S.exCo;
  const docs = exDocsFor(s, S.exCo), c = coOf(S.exCo) || {}, cu = custOf($('xd_inst').value) || {}, nm = $('xd_name').value.trim();
  const warnFor = k => {
    const w = [];
    if (k === '연구개발용확인서') { if (!c['안전관리자']) w.push(`${S.exCo} 안전관리자`); ['안전관리자', '주소', '보관창고'].forEach(f => { if (!cu[f]) w.push(`${$('xd_inst').value} ${f}`); }); return w.length ? '거래처에 없음: ' + w.join(', ') : ''; }
    if ((k === 'CAS미부여확인서' || k === '물질식별정보') && !nm) return '물질명 없음';
    if (k === '물질식별정보' && !molOf(s)) return '구조 없음';
    if (k === '단량체정보' && !s['단량체']) return '단량체 없음';
    return '';
  };
  $('xd_rows').innerHTML = docs.length ? docs.map(d => { const w = warnFor(d.k), blocked = (d.k === '물질식별정보' && !molOf(s)) || (d.k === '단량체정보' && !s['단량체']);
    return `<div class="docrow ${d.off ? 'off' : ''}" title="${d.off ? 'CAS가 있어 보통 필요 없음' : ''}"><b>${DOC_LABEL[d.k]}</b>${w ? `<span class="wmini">${esc(w)}</span>` : ''}<span class="sp"></span><span class="msg" id="xm_${d.k}"></span>
      ${FMTB[d.f].map(([k, l]) => `<button class="sm ${k === 'orig' ? 'primary' : ''}" ${blocked ? 'disabled' : ''} onclick="exDocRun('${d.k}','${k}')">${l}</button>`).join('')}</div>`; }).join('')
    : `<div class="docrow"><span class="dash">${esc(S.exCo)}은(는) 작성할 신고면제 서류가 없습니다</span></div>`;
};
window.exDocRun = async (k, fk) => {
  const s = S.cur, co = S.exCo || '한인', c = coOf(co) || { 이름: co, 회사명: co }, inst = $('xd_inst').value, nm = $('xd_name').value.trim(), job = docJob('xm_' + k, DOC_LABEL[k]);
  job.busy(fk === 'pdf' ? 'PDF 변환 중…' : '만드는 중…');
  try {
    if (k === '연구개발용확인서') {
      const cu = custOf(inst) || { 회사명: inst }, T = await Docs.templates();
      const v = { 제조자: c['안전관리자'] || '', 제조직위: c['안전관리자직위'] || '', 제조연락처: c['안전관리자연락처'] || '', 기관안전: cu['안전관리자'] || '', 기관직위: cu['안전관리자직위'] || '', 기관연락처: cu['안전관리자연락처'] || '',
        주의_취급: setting('주의_취급', ''), 주의_저장: setting('주의_저장', ''), 주의_화재: setting('주의_화재', ''), 사후1: c['회사명'] || co, 사후2: cu['회사명'], 처리업체: setting('처리업체', ''), 운반업체: setting('운반업체', ''),
        이송방법: setting('이송방법', '자차로 이송'), 수령주소: cu['주소'] || '', 보관창고: cu['보관창고'] || '', 운송업체: setting('운반업체', ''), 날짜: pointDate($('xd_date').value), 회사명: c['회사명'] || co, 대표: c['대표'] || '' };
      await Docs.deliver(await Docs.buildRnd(v, c['직인'] || (co === '한인' ? T.stamp : null)), `연구개발용 확인서_${String($('xd_date').value || S.today).replace(/-/g, '')}${inst !== '동우화인켐' ? '(' + Docs.safeName(inst) + ')' : ''}`, 'docx', fk);
    } else if (k === 'CAS미부여확인서') {
      if (!nm) throw new Error('물질명을 입력하세요.');
      const v = { 물질명: nm, 회사명: c['회사명'] || co, 주소: c['주소'] || '', 사업자번호: c['사업자번호'] || '', 담당자: [c['부서'], c['담당자']].filter(Boolean).join(' '), 확인일: korDate($('xd_date').value || S.today), 대표: c['대표'] || '' };
      await Docs.deliver(await Docs.buildCasCert(v, molOf(s), c['직인'] || (co === '한인' ? (await Docs.templates()).stamp : null)), `${baseName(s)}_CAS미부여확인서${co !== '한인' ? '(' + Docs.safeName(co) + ')' : ''}`, 'docx', fk);
    } else if (k === '물질식별정보') {
      if (!nm) throw new Error('물질명을 입력하세요.');
      const m = molOf(s), ci = chemInfo(m); Docs.download(await Docs.buildIdPng(m, ci.mw, nm, ci.formula), `${baseName(s)}_물질식별정보.png`);
    } else if (k === '단량체정보') {
      await Docs.deliver(await Docs.buildMonomerXlsx(s, parseMono(s['단량체']).map(x => ({ 물질명: x.name, CAS: x.cas }))), `${baseName(s)}_단량체정보`, 'xlsx', fk);
    }
    job.done();
  } catch (e) { job.done(false, errMsg(e)); }
};
// 용도는 '~ 연구개발용'으로 (신고면제 '구체적 용도에 대한 설명')
const useText = u => { const t = String(u || '').trim(); return !t ? '' : /연구\s*개발용$/.test(t) ? t.replace(/연구\s*개발용$/, '연구개발용') : t + ' 연구개발용'; };
window.saveUse = () => busy(async () => {
  const s = S.cur, v = useText($('xd_use').value); $('xd_use').value = v; if (v === (s['용도'] || '')) return;
  try { const r = await save('샘플', Object.assign({}, s, { 용도: v })); S.samples = rows('샘플'); S.cur = r; toast('용도 저장됨'); } catch (e) { toast('용도를 저장하지 못했습니다: ' + errMsg(e), false); }
});
window.copyField = async (id, btn) => {
  const v = $(id).value; if (!v) return;
  try { await navigator.clipboard.writeText(v); } catch (e) { const t = $(id); t.select(); document.execCommand('copy'); }
  const o = btn.textContent; btn.textContent = '복사됨'; setTimeout(() => btn.textContent = o, 1200);
};
window.exNoticeFor = (id, f) => { if (!f) return; openEx(id, true); noticeFill(f); };
window.delExRow = id => busy(async () => {
  const e = rows('신고면제').find(r => r.id === id); if (!e) return;
  if (!confirm(`${e['기관'] || '동우화인켐'} 신청 기록(${e['신청일'] || '날짜 없음'})을 삭제할까요?`)) return;
  try { await remove('신고면제', id); toast('삭제됨'); renderDetail(); render(); } catch (er) { toast('삭제하지 못했습니다: ' + errMsg(er), false); }
}, '삭제 중…');
// ----- 출고 탭 -----
function neededDocs(x) {
  const co = x['명의'], can = coDocs(co), need = x['필요서류'] != null && x['필요서류'] !== '' ? list(x['필요서류']) : defaultNeed(co, x['고객사']);
  return need.filter(d => can.includes(d));
}
function defaultNeed(co, cust) { const c = custOf(cust); const base = c && c['필요서류'] ? list(c['필요서류']) : ['MSDS']; return base.filter(d => coDocs(co).includes(d)); }
// [샘플 정보] 아래 출고 기록 목록 (조회 모드에서도 기록 가능)
function renderShipList(s) {
  const L = shipsOf(s.id);
  $('dShipSum').innerHTML = `<div class="sechead"><h4>출고 기록</h4><span class="sp"></span><button class="sm" onclick="openShip()">+ 출고 기록</button></div>` + (L.length ? L.map(x => `<div class="shsum" onclick="openShip('${x.id}')" title="눌러서 고치기">
      <span class="d">${esc(shipDate(x))}</span>${coBadge(x['명의'] || '?')}<span>→ <b>${esc(x['고객사'] || '고객사 미입력')}</b></span>
      ${x['수량'] ? `<span class="q">${esc(x['수량'])}</span>` : ''}${x['가격'] ? `<span class="q">${esc(priceText(x['가격']))}</span>` : ''}<span class="sp"></span>${x['서류제출일'] ? `<span class="b ok">서류 제출 ${esc(x['서류제출일'])}</span>` : ''}${!x['출고일'] && x['서류제출일'] ? '<span class="b etc">서류만</span>' : ''}</div>`).join('')
    : '<div class="emptybox">아직 출고 기록이 없습니다. 샘플이 나가면 [+ 출고 기록]으로 날짜·고객사·수량을 남겨 두세요.</div>');
}
// ----- [제출 서류] 탭: 기록 없이 바로 서류 받기 -----
function sdInit(s) {
  if (S.sd && S.sd.sid === s.id) return;
  const last = shipsOf(s.id)[0], f = (last && parseForm(last['제출형태'])) || legacyForm(s) || { t: 'neat' };
  S.sd = { sid: s.id, co: (last && last['명의']) || namesOf(s)[0] || companyOf(s) || '한인', cust: (last && last['고객사']) || '동우화인켐', F: JSON.parse(JSON.stringify(f)) };
}
window.SD = { add(k) { addSolvTo(S.sd.F, k); this.draw(); }, draw() { solvEditor('sd_형태칸', S.sd.F, 'SD'); this.sum(); },
  get F() { return S.sd.F; }, sum() { SF.sum.call({ F: S.sd.F }, 'sd_형태칸'); if ($('se_함량')) $('se_함량').value = S.sd.F.p; } };
function sdShip() { const S2 = S.sd; return { 명의: S2.co, 고객사: S2.cust, 제출형태: JSON.stringify(S2.F), 함량: S2.F.t === 'sol' ? String(S2.F.p) : '100' }; }
function renderDocsTab(s) {
  if (S.detailNote && S.detailCust) { S.sd = null; }
  sdInit(s); if (S.detailCust) { S.sd.cust = S.detailCust; S.detailCust = ''; }
  const N = [...new Set([...coNames(), S.sd.co])], custs = [...new Set([...rows('고객사').map(x => x['회사명']), S.sd.cust].filter(Boolean))];
  $('sd_note').innerHTML = S.detailNote ? `<div class="warn" style="margin:0 0 12px">${esc(S.detailNote)}</div>` : ''; S.detailNote = '';
  $('sd_co').innerHTML = N.map(c => `<option value="${esc(c)}" ${c === S.sd.co ? 'selected' : ''}>${esc(coFull(c))}</option>`).join('');
  $('sd_cust').innerHTML = custs.map(c => `<option ${c === S.sd.cust ? 'selected' : ''}>${esc(c)}</option>`).join('');
  seg('sd_형태', ['물질 그대로', '용액·혼합물'], [S.sd.F.t === 'sol' ? '용액·혼합물' : '물질 그대로'], 'radio');
  $('sd_date').value = S.today; $('sd_msg').textContent = '';
  sdFormRender();
}
window.sdChanged = () => { S.sd.co = $('sd_co').value; S.sd.cust = $('sd_cust').value; renderSdRows(); };
window.sdFormRender = () => {
  const sol = segVal('sd_형태') === '용액·혼합물';
  if (!sol) { S.sd.F = { t: 'neat' }; $('sd_형태칸').innerHTML = ''; $('sd_형태칸').style.display = 'none'; renderSdRows(); return; }
  if (S.sd.F.t !== 'sol') S.sd.F = { t: 'sol', p: 100, s: [] };
  $('sd_형태칸').style.display = ''; SD.draw(); renderSdRows();
};
function renderSdRows() {
  const s = S.cur, x = sdShip(), can = coDocs(x['명의']), need = defaultNeed(x['명의'], x['고객사']), ex = sampleEx(s.id, x['고객사']), valid = ex && ex.st.k === '유효';
  const co = coOf(x['명의']), lsForm = (co && co['MSDS양식'] === '엘에스켐') || (!co && x['명의'] === '엘에스켐'), cust = custOf(x['고객사']) || {}, f = S.sd.F;
  const docs = SUB_DOCS.filter(d => can.includes(d));
  const exTxt = ex ? `<span class="b ${ex.st.cls} dst">${esc(x['고객사'])} 신고면제 · ${ex.st.txt}</span>` : `<span class="b etc dst">${esc(x['고객사'])} 신고면제 기록 없음</span>`;
  const row = d => {
    const off = !need.includes(d) ? ' off' : '', tip = off ? `title="${esc(x['고객사'])}에는 보통 필요 없음"` : '';
    if (d === '자진확인서') return `<div class="docrow${off}" ${tip}><b>자진확인서</b>${exTxt}${valid ? '' : '<span class="wmini">유효한 면제번호가 있어야 만들 수 있습니다</span>'}<span class="sp"></span><span class="msg" id="sm_self"></span>
        <button class="sm" onclick="toggleSelf()">편집</button>${FMTB.docx.map(([k, l]) => `<button class="sm ${k === 'orig' ? 'primary' : ''}" ${valid ? '' : 'disabled'} onclick="selfRun('${k}')">${l}</button>`).join('')}</div>
      <div class="f selfed" id="se_box" style="display:none">
        <div class="c3"><label>To.</label><input id="se_TO" value="${esc(cust['영문명'] || cust['회사명'] || x['고객사'] || '')}"></div>
        <div class="c3"><label>물질명</label><input id="se_물질명" value="${esc((ex && ex.e['통지물질명']) || s['물질명'] || '')}"></div>
        <div class="c2"><label>면제번호</label><input id="se_면제번호" value="${esc(valid ? ex.e['면제번호'] : '')}"></div>
        <div class="c2"><label>취급최대수량(톤)</label><input id="se_수량" value="${esc(setting('자진확인서수량', '0.01'))}"></div>
        <div class="c2"><label>함량(%)</label><input id="se_함량" value="${f && f.t === 'sol' ? f.p : 100}"></div></div>`;
    return `<div class="docrow${off}" ${tip}><b>MSDS${lsForm ? ' (엘에스켐 양식)' : ''}</b><span class="sp"></span><button class="sm primary" onclick="goMsdsDocs()">작성</button></div>`;
  };
  $('sd_rows').innerHTML = (docs.length ? docs.map(row).join('') : `<div class="docrow"><span class="dash">${esc(x['명의'])}은(는) 작성할 제출 서류가 없습니다</span></div>`);
}
window.toggleSelf = () => { const el = $('se_box'); el.style.display = el.style.display === 'none' ? '' : 'none'; };
window.selfRun = async fk => {
  const s = S.cur, g = k => $('se_' + k).value.trim(), job = docJob('sm_self', '자진확인서'), co = coOf(S.sd.co) || {};
  const v = { TO: g('TO'), 제품명: s['제품명'], 물질명: g('물질명'), 면제번호: g('면제번호'), 수량: g('수량'), 함량: g('함량'), 확인일: dotDate(S.today) };
  if (!v.면제번호) { flash('sm_self', '면제번호 없음', false); return; }
  job.busy(fk === 'pdf' ? 'PDF 변환 중…' : '만드는 중…');
  try { const T = await Docs.templates(); await Docs.deliver(await Docs.buildSelfCheck(v, co['직인'] || (S.sd.co === '한인' ? T.stamp : null)), `${baseName(s)}_자진확인서${formSuffix(S.sd.F)}`, 'docx', fk); job.done(); } catch (e) { job.done(false, errMsg(e)); }
};
window.goMsdsDocs = () => { const s = S.cur; msdsFromSample(s, sdShip()); navTo('msds', s.id, 'ship'); };
// 서류를 낸 뒤 기록으로 남기기(선택)
window.recordSubmit = () => busy(async () => {
  const s = S.cur, x = Object.assign(sdShip(), { 샘플id: s.id, 제품명: s['제품명'], 서류제출일: $('sd_date').value, 필요서류: defaultNeed(S.sd.co, S.sd.cust).join(',') });
  try { const r = await call('saveShipment', x); upsert('출고', r.ship); if (r.sample) { upsert('샘플', r.sample); S.cur = r.sample; } flash('sd_msg', ''); toast('출고 기록에 남겼습니다'); renderShipList(S.cur); render(); } catch (e) { flash('sd_msg', errMsg(e), false); }
}, '기록 중…');

// ---------- 편집 모드 (계속 기억) ----------
function setEditing(on) { document.body.classList.toggle('editing', on); if (on && !S.updChecked) { S.updChecked = true; setTimeout(() => checkUpd(false), 1500); } $('lockBtn').innerHTML = on ? '🔓 <span class="t">편집 중</span>' : '🔒 <span class="t">편집</span>'; }
window.toggleEdit = () => {
  if (S.pw) { S.pw = null; try { localStorage.removeItem('sm_pw'); } catch (e) {} setEditing(false); if (S.view === 'msds' || S.view === 'settings') { closeAllModals(); showView('list'); } else if ($('detail').classList.contains('open')) renderDetail(); return; }
  $('pwErr').textContent = ''; openModal('pwBox'); setTimeout(() => $('pwIn').focus(), 50);
};
window.submitPw = async () => {
  const pw = $('pwIn').value, ok = await call('verifyPassword', pw).catch(() => false);
  if (!ok) { $('pwErr').textContent = '비밀번호가 맞지 않습니다.'; return; }
  S.pw = pw; try { localStorage.setItem('sm_pw', JSON.stringify({ pw })); } catch (e) {}
  $('pwIn').value = ''; closeModal('pwBox'); setEditing(true);
};
async function restorePw() {
  try { const v = JSON.parse(localStorage.getItem('sm_pw') || 'null'); if (v && v.pw) { S.pw = v.pw; setEditing(true);
    const ok = await call('verifyPassword', v.pw).catch(() => true); if (!ok) { S.pw = null; localStorage.removeItem('sm_pw'); setEditing(false); } } } catch (e) {}
}

// ---------- 구조 검색 ----------
window.toggleStruct = async () => {
  setTimeout(() => $('structBtn') && $('structBtn').classList.toggle('on', $('structPanel').classList.contains('open')), 0);
  const p = $('structPanel'); p.classList.toggle('open');
  if (p.classList.contains('open') && !S.qEditor) { await loadOCL(); S.qEditor = new MolEditor($('qEditor'), { fragment: true }); }
};
window.applyPaste = (taId, editor) => {
  const ta = $(taId);
  const t = ta.value; ta.value = '';
  pasteInto(editor, t).catch(e => { ta.value = t; alert('구조를 읽지 못했습니다. ' + (e.message || '')); });
};
document.addEventListener('paste', e => {
  const txt = (e.clipboardData || window.clipboardData).getData('text');
  const target = $('monoBox').classList.contains('open') ? S.mEditor : $('form').classList.contains('open') ? S.fEditor : ($('structPanel').classList.contains('open') && S.view === 'list' ? S.qEditor : null);
  if (!target || !txt || /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  try { if (!parseText(txt)) return; } catch (err) { alert('붙여넣은 내용을 구조로 읽지 못했습니다. ' + (err.message || '')); return; }
  e.preventDefault(); e.stopPropagation(); pasteInto(target, txt);
}, true);
window.runStruct = () => {
  if (S.qEditor.isEmpty()) { alert('찾을 구조를 그리거나 붙여넣어 주세요.'); return; }
  const qm = S.qEditor.getMolecule(), skel = $('skel').checked, mode = segVal('smode') || 'sub';
  const hits = new Map();
  if (mode === 'sub') {
    const frag = prepQuery(qm, skel), ss = new S.OCL.SSSearcher(); ss.setFragment(frag);
    const test = m => { ss.setMolecule(m); return ss.findFragmentInMolecule({ countMode: 'firstMatch' }) > 0; };
    S.samples.forEach(s => {
      const m = molOf(s);
      if (m) { if (test(m)) hits.set(s.id, { match: ss.getMatchList()[0] || [] }); return; }
      const { mono, mod } = polyParts(s);
      if ([...mono, ...mod].some(x => { const mm = monoMol(x); return mm && test(mm); })) hits.set(s.id, { mono: true });
    });
  } else {
    const full = qm.getCompactCopy(); full.setFragment(false);
    if (mode === 'exact') { const code = full.getIDCode(); S.samples.forEach(s => { const m = molOf(s); if (m && m.getIDCode() === code) hits.set(s.id, {}); }); }
    else { const qi = full.getIndex(); S.samples.forEach(s => { const m = molOf(s); if (!m) return;
      const idx = s['검색값'] ? s['검색값'].split(',').map(Number) : m.getIndex(), na = full.getAtoms(), nb = m.getAtoms();
      const sc = S.OCL.SSSearcherWithIndex.getSimilarityTanimoto(qi, idx) * Math.min(na, nb) / Math.max(na, nb);
      if (sc >= 0.3) hits.set(s.id, { score: sc }); }); }
  }
  S.hits = hits; S.hitMode = mode; render();
  $('zeroHint').style.display = mode === 'sub' && !skel && hits.size === 0 ? 'flex' : 'none';
};
window.clearStruct = () => { if (S.qEditor) S.qEditor.clearAll(); S.hits = null; $('zeroHint').style.display = 'none'; render(); };

// ---------- 샘플 등록·수정 ----------
window.openForm = async id => {
  await loadOCL();
  S.editing = id ? S.samples.find(x => x.id === id) : null;
  const s = S.editing || {};
  $('fTitle').textContent = S.editing ? `샘플 수정 — ${s['제품명']}` : '샘플 등록';
  ['제품명', '물질명', 'CAS', '고객사', '성상', '용도', '비고'].forEach(k => $('f_' + k).value = s[k] || '');
  const N = coNames();
  seg('f_관리회사', [...N, '기타'], [s['관리회사'] || (N.includes(S.tab) ? S.tab : '한인')], 'radio', true);
  $('etcDl').innerHTML = etcNames().map(n => `<option value="${esc(n)}">`).join('');
  $('f_기타회사').value = s['기타회사'] || ''; const syncEtc = () => { $('f_기타회사').style.display = segVal('f_관리회사') === '기타' ? '' : 'none'; };
  $('f_관리회사').onchange = syncEtc; syncEtc();
  $('f_관리번호').textContent = s['관리번호'] || '저장하면 자동';
  const nm = namesOf(s); seg('f_명의', [...N, ...nm.filter(x => !N.includes(x))], nm, 'checkbox', true);
  seg('f_종류', KINDS, S.editing ? kindsOf(s) : (S.kind !== '전체' ? [S.kind] : []), 'checkbox');
  $('fWarn').innerHTML = ''; $('fWarn').dataset.ack = ''; $('fPaste').value = ''; $('pcBox').innerHTML = ''; S.pcLast = null;
  S.fMono = parseMono(s['단량체']); S.fMod = parseMod(s['개질']); S.mainEdForced = false;
  openModal('form');
  if (!S.fEditor) S.fEditor = new MolEditor($('fEditor'), { onChange: () => { updateCalc(); schedulePubChem(); } });
  const m = S.editing && molOf(S.editing);
  S.fEditor.clearAll(); if (m) { S.fEditor.setMolecule(m.getCompactCopy()); S.fEditor.undoStack = []; }
  ctInit('f_comp', parseComps(s['성분']));
  $('f_종류').onchange = () => { renderPoly(); syncStructBox(); };
  renderPoly(); syncStructBox(); updateCalc();
  if (m) schedulePubChem(10);
};
function isPolyForm() { return segVals('f_종류').includes('고분자'); }
const isMixForm = () => segVals('f_종류').includes('혼합물');
function syncStructBox() {
  const poly = isPolyForm() || isMixForm(), hasMol = S.fEditor && !S.fEditor.isEmpty();
  $('mixBox').style.display = isMixForm() ? '' : 'none';
  const hide = poly && !hasMol && !S.mainEdForced;
  $('mainEd').style.display = hide ? 'none' : ''; $('polyStructNote').style.display = hide ? '' : 'none';
  $('polyStructNote').firstChild.textContent = isMixForm() ? '혼합물은 아래 성분 표로 넣습니다 · ' : '단량체 칸에 구조를 넣습니다 · ';
  if (!hide && S.fEditor) setTimeout(() => S.fEditor.redraw(), 0);
}
window.showMainEditor = () => { S.mainEdForced = true; syncStructBox(); setTimeout(() => { S.fEditor.fit(); S.fEditor.redraw(); }, 30); };
function formMol() { return S.fEditor && !S.fEditor.isEmpty() ? S.fEditor.getMolecule() : null; }
function updateCalc() {
  const m = formMol();
  if (!m) { $('fCalc').textContent = ''; $('ionBox').innerHTML = ''; return; }
  const c = chemInfo(m); $('fCalc').textContent = `${c.formula} · ${c.mw}`;
  $('ionBox').innerHTML = ionHtml(m, 'balanceIons()');
}
window.balanceIons = () => { const b = balanced(formMol()); if (b) S.fEditor.setMolecule(b); };

// PubChem 자동 조회
let pcTimer = null;
function schedulePubChem(delay = 1500) { clearTimeout(pcTimer); pcTimer = setTimeout(() => runPubChem(formMol(), 'pcBox', 'f_CAS', 'f_물질명', 'pcLast'), delay); }
async function runPubChem(m, boxId, casId, nameId, key) {
  const box = $(boxId); if (!m) { box.innerHTML = ''; return; }
  const smi = smilesOf(m); if (!smi || smi === S[key]) return; S[key] = smi;
  box.innerHTML = '<span class="hint">PubChem에서 CAS 번호 찾는 중…</span>';
  const p = ionParts(m), out = [];
  try {
    const r = await call('lookupPubChem', { smiles: smi }); if (S[key] !== smi) return;
    out.push(pcLine(p.multi ? '전체(염)' : '', r, true, casId, nameId));
    if (p.multi && !r.cas.length) for (const g of p.list) { const ri = await call('lookupPubChem', { smiles: g.smi }); out.push(pcLine((g.q > 0 ? '양이온' : g.q < 0 ? '음이온' : '조각') + ' ' + g.formula, ri, false, casId, nameId)); }
    if (S[key] === smi) box.innerHTML = out.join('');
  } catch (e) { box.innerHTML = '<span class="hint">PubChem에 연결하지 못했습니다.</span>'; }
}
function pcLine(label, r, main, casId, nameId) {
  const lab = label ? `<b>${esc(label)}</b> ` : '';
  if (!r.found && !r.cas.length) return `<div>${lab}PubChem에 등록되지 않은 구조</div>`;
  const cas = r.cas.length ? r.cas.map(c => `CAS <b>${esc(c)}</b> <button class="sm" onclick="putVal('${casId}','${esc(c)}')">CAS에 넣기</button>`).join(' ') : 'PubChem에 등록된 CAS 없음';
  const names = (r.names && r.names.length ? r.names : (r.iupac ? [r.iupac] : []));
  const nm = main && names.length ? `<br>추천 이름: ${names.map(n => `<button class="sm" style="margin:2px 2px 0 0" title="물질명에 넣기" onclick="putVal('${nameId}', this.dataset.v)" data-v="${esc(n)}">${esc(n.length > 70 ? n.slice(0, 67) + '…' : n)}</button>`).join('')}` : (main ? '<br><span class="hint">추천 이름 없음</span>' : '');
  return `<div>${lab}${cas}${!main && r.cas.length ? ' <span class="hint">(이온 CAS — 염 전체 CAS 아님)</span>' : ''}${nm}</div>`;
}
window.putVal = (id, v) => { $(id).value = v; };

// 고분자: 단량체·개질
function monoRowHtml(m, i, role) {
  const mol = monoMol(m);
  return `<div class="mrow"><div class="thumb" onclick="openMono('${role}',${i})" title="구조 그리기">${mol ? svgOf(mol, 86, 58) : '구조 그리기'}</div>
    <input list="monoDl" placeholder="약어 (예: EHA)" value="${esc(m.abbr)}" oninput="monoSet('${role}',${i},'abbr',this.value)">
    <input placeholder="물질명" value="${esc(m.name)}" oninput="monoSet('${role}',${i},'name',this.value)">
    <input placeholder="CAS" value="${esc(m.cas)}" oninput="monoSet('${role}',${i},'cas',this.value)">
    <button class="sm" onclick="monoDel('${role}',${i})">삭제</button></div>`;
}
function renderPoly() {
  const on = isPolyForm(); $('polyBox').style.display = on ? '' : 'none'; if (!on) return;
  if (!S.fMono.length) S.fMono.push({ abbr: '', name: '', cas: '' });
  $('monoDl').innerHTML = rows('단량체').map(d => `<option value="${esc(d['약어'])}">${esc(d['물질명'])}</option>`).join('');
  $('monoRows').innerHTML = S.fMono.map((m, i) => monoRowHtml(m, i, 'mono')).join('');
  const md = S.fMod;
  $('modBase').innerHTML = '<option value="">위 단량체로 만든 고분자</option>' + S.samples.filter(x => kindsOf(x).includes('고분자') && (!S.editing || x.id !== S.editing.id)).map(x => `<option value="${x.id}" ${md.기반 === x.id ? 'selected' : ''}>${esc(x['관리번호'] || '')} ${esc(x['제품명'])}</option>`).join('');
  seg('modType', MOD_TYPES, [md.방식 || '없음'], 'radio');
  $('modType').onchange = () => { modChange(); renderModRows(); };
  renderModRows(); polyCandidates();
}
function renderModRows() {
  const on = (S.fMod.방식 || '없음') !== '없음';
  if (on && !S.fMod.물질.length) S.fMod.물질.push({ abbr: '', name: '', cas: '' });
  $('modRows').innerHTML = on ? S.fMod.물질.map((m, i) => monoRowHtml(m, i, 'mod')).join('') : '';
  $('modAddBtn').style.display = on ? '' : 'none';
}
const listOf = role => role === 'mod' ? S.fMod.물질 : S.fMono;
window.monoSet = (role, i, k, v) => {
  const L = listOf(role); L[i][k] = v;
  if (k === 'abbr') { const d = dictFind({ abbr: v }); if (d) { L[i].name = d['물질명']; L[i].cas = d['CAS']; delete L[i].idcode; role === 'mod' ? renderModRows() : renderPoly(); const el = document.querySelectorAll(`#${role === 'mod' ? 'modRows' : 'monoRows'} .mrow`)[i]; const inp = el && el.querySelectorAll('input')[0]; if (inp) { inp.focus(); inp.setSelectionRange(v.length, v.length); } return; } }
  polyCandidates();
};
window.monoDel = (role, i) => { listOf(role).splice(i, 1); role === 'mod' ? renderModRows() : renderPoly(); polyCandidates(); };
window.monoAdd = role => { listOf(role).push({ abbr: '', name: '', cas: '' }); role === 'mod' ? renderModRows() : renderPoly(); };
window.modChange = () => { S.fMod.방식 = segVal('modType') || '없음'; S.fMod.기반 = $('modBase').value; polyCandidates(); };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
function polyName(monos) { const n = monos.filter(m => m.name || m.abbr).map(m => m.name || m.abbr); return !n.length ? '' : n.length === 1 ? `Poly(${n[0]})` : `Poly(${n.join('-co-')})`; }
window.makePolyName = () => {
  modChange(); const md = S.fMod;
  const base = md.기반 ? (S.samples.find(x => x.id === md.기반) || {})['물질명'] || '' : polyName(S.fMono);
  if (!base) { alert('단량체를 입력하거나 기반 고분자를 고르세요.'); return; }
  const X = md.물질.filter(m => m.name || m.abbr).map(m => m.name || m.abbr).join(' and ');
  if (md.방식 !== '없음' && !X) { alert('붙이는 물질을 입력하세요.'); return; }
  $('f_물질명').value = md.방식 === '말단개질' ? `${X}-terminated ${base}` : md.방식 === '그래프트' ? `${base}-graft-${X}` : md.방식 === '반응생성물' ? `${base}, reaction products with ${X}` : md.방식 === '개질' ? `${cap(X)}-modified ${base}` : base;
};
const keyOf = L => L.map(m => (m.cas || m.name || m.abbr || '').trim().toLowerCase()).filter(Boolean).sort().join('|');
const polyKey = (mono, md) => keyOf(mono) + '#' + ((md.방식 && md.방식 !== '없음') ? md.방식 + ':' + keyOf(md.물질) : '');
function polyCandidates() {
  const el = $('polyCas'); if (!keyOf(S.fMono)) { el.innerHTML = ''; return; }
  const key = polyKey(S.fMono, S.fMod);
  const same = S.samples.filter(x => (!S.editing || x.id !== S.editing.id) && x['단량체'] && polyKey(parseMono(x['단량체']), parseMod(x['개질'])) === key);
  el.innerHTML = (same.length ? '같은 조성(비율 무관): ' + same.map(x => `${esc(x['관리번호'] || '')} ${esc(x['제품명'])}${x.CAS ? ` — CAS <b>${esc(x.CAS)}</b> <button class="sm" onclick="putVal('f_CAS','${esc(x.CAS)}')">CAS에 넣기</button>` : ''}`).join(' · ') : '같은 조성으로 등록된 샘플 없음') +
    (S.fMono.filter(m => m.name).length === 1 && (S.fMod.방식 || '없음') === '없음' ? ` · <button class="sm" onclick="polyPubChem()">단독중합체 PubChem 검색</button><span id="polyPc"></span>` : '');
}
window.polyPubChem = async () => {
  const o = $('polyPc'); o.textContent = ' 찾는 중…';
  try { const r = await call('lookupPubChem', { name: polyName(S.fMono) }); o.innerHTML = ' ' + (r.cas.length ? r.cas.map(c => `<b>${esc(c)}</b> <button class="sm" onclick="putVal('f_CAS','${esc(c)}')">CAS에 넣기</button>`).join(' ') : 'PubChem에 등록된 CAS 없음'); }
  catch (e) { o.textContent = ' PubChem에 연결하지 못했습니다.'; }
};

// 단량체 구조 창
window.openMono = async (role, i) => {
  await loadOCL();
  const m = role === 'dict' ? (() => { const d = rows('단량체').find(x => x.id === i) || {}; return { abbr: d['약어'] || '', name: d['물질명'] || '', cas: d['CAS'] || '', idcode: d.idcode, coords: d['좌표'] }; })() : listOf(role)[i];
  S.mbTarget = { role, i };
  $('mbTitle').textContent = role === 'mod' ? '붙이는 물질 구조' : '단량체 구조';
  $('mb_abbr').value = m.abbr || ''; $('mb_name').value = m.name || ''; $('mb_cas').value = m.cas || ''; $('mbPaste').value = ''; $('mbPc').innerHTML = ''; S.mbLast = null;
  openModal('monoBox');
  if (!S.mEditor) S.mEditor = new MolEditor($('mEditor'), { onChange: () => { mbCalc(); clearTimeout(S.mbT); S.mbT = setTimeout(() => runPubChem(S.mEditor.isEmpty() ? null : S.mEditor.getMolecule(), 'mbPc', 'mb_cas', 'mb_name', 'mbLast'), 1500); } });
  S.mEditor.clearAll(); const mol = monoMol(m); if (mol) { S.mEditor.setMolecule(mol.getCompactCopy()); S.mEditor.undoStack = []; }
  mbCalc();
};
function mbCalc() { const e = S.mEditor; if (e.isEmpty()) { $('mbCalc').textContent = ''; $('mbIon').innerHTML = ''; return; } const m = e.getMolecule(), c = chemInfo(m); $('mbCalc').textContent = `${c.formula} · ${c.mw}`; $('mbIon').innerHTML = ionHtml(m, 'mbBalance()'); }
window.mbBalance = () => { const b = balanced(S.mEditor.getMolecule()); if (b) S.mEditor.setMolecule(b); };
window.monoClearStruct = () => { S.mEditor.clearAll(); mbCalc(); };
async function upsertDict(m) {
  if (!S.pw || !(m.abbr || m.name)) return null;
  const d = Object.assign({}, dictFind(m) || {});
  d['약어'] = m.abbr || d['약어'] || m.name; d['물질명'] = m.name || d['물질명'] || ''; d['CAS'] = m.cas || d['CAS'] || '';
  if (m.idcode !== undefined) { d.idcode = m.idcode || ''; d['좌표'] = m.coords || ''; }
  const r = await save('단량체', d); delete S.dmols[r.id]; return r;
}
window.monoApply = () => busy(async () => {
  const e = S.mEditor, info = e.isEmpty() ? null : chemInfo(e.getMolecule());
  const m = { abbr: $('mb_abbr').value.trim(), name: $('mb_name').value.trim(), cas: $('mb_cas').value.trim(), idcode: info ? info.idcode : '', coords: info ? info.coords : '' };
  const { role, i } = S.mbTarget;
  try {
    if (role === 'dict') { const d = Object.assign({}, rows('단량체').find(x => x.id === i) || {}); Object.assign(d, { 약어: m.abbr || m.name, 물질명: m.name, CAS: m.cas, idcode: m.idcode, 좌표: m.coords }); const r = await save('단량체', d); delete S.dmols[r.id]; closeModal('monoBox'); toast('저장됨'); renderSettings(); return; }
    const L = listOf(role); Object.assign(L[i], m);
    await upsertDict(m).catch(() => null);
    closeModal('monoBox'); toast('저장됨'); role === 'mod' ? renderModRows() : renderPoly(); polyCandidates();
  } catch (er) { alert('저장하지 못했습니다: ' + ((er && er.message) || er)); }
}, '저장 중…');

function duplicates(obj, info) {
  const w = [], others = S.samples.filter(s => !S.editing || s.id !== S.editing.id);
  const sameName = others.find(s => s['제품명'].trim().toLowerCase() === obj['제품명'].trim().toLowerCase());
  if (sameName) w.push(`같은 제품명 <b>${esc(sameName['제품명'])}</b>(${esc(sameName['관리번호'] || '')})이 이미 있습니다.`);
  if (info) { const code = S.OCL.Molecule.fromIDCode(info.idcode).getIDCode(); const sameMol = others.find(s => { const m = molOf(s); return m && m.getIDCode() === code; });
    if (sameMol) w.push(`같은 구조가 <b>${esc(sameMol['제품명'])}</b>(${esc(sameMol['관리번호'] || '')})로 이미 등록되어 있습니다.`); }
  const cas = (obj.CAS || '').trim();
  if (cas) { const sameCas = others.find(s => (s.CAS || '').split(/[,\s]+/).includes(cas)); if (sameCas) w.push(`CAS ${esc(cas)}가 <b>${esc(sameCas['제품명'])}</b>에도 쓰였습니다.`); }
  return w;
}
window.saveForm = () => busy(async () => {
  const obj = Object.assign({}, S.editing || {});
  ['제품명', '물질명', 'CAS', '고객사', '성상', '용도', '비고'].forEach(k => obj[k] = $('f_' + k).value.trim());
  obj['용도'] = useText(obj['용도']);
  obj['명의'] = segVals('f_명의').join(','); obj['종류'] = segVals('f_종류').join(',');
  obj['관리회사'] = segVal('f_관리회사'); obj['기타회사'] = obj['관리회사'] === '기타' ? $('f_기타회사').value.trim() : '';
  if (obj['관리회사'] === '기타' && !obj['기타회사']) { alert('기타 회사 이름을 입력하세요.'); return; }
  if (obj['관리회사'] === '기타' && !obj['명의'].split(',').includes(obj['기타회사'])) obj['명의'] = [obj['명의'], obj['기타회사']].filter(Boolean).join(',');
  if (S.editing && S.editing['관리회사'] !== obj['관리회사'] && !(S.editing['관리회사'] === '기타' && obj['관리회사'] === S.editing['기타회사'])) obj['관리번호'] = '';
  if (!obj['제품명']) { alert('제품명을 입력하세요.'); return; }
  if (!obj['관리회사']) { alert('관리회사를 고르세요.'); return; }
  if (obj['종류'].includes('혼합물')) { obj['성분'] = JSON.stringify(ctRaw('f_comp')); if (!ctSum('f_comp')) { alert('혼합물 성분의 함량 합계가 100%가 아닙니다.'); return; } } else obj['성분'] = '';
  if (obj['종류'].includes('고분자')) { modChange(); obj['단량체'] = fmtMono(S.fMono); const md = S.fMod; obj['개질'] = (md.방식 && md.방식 !== '없음') || md.기반 ? JSON.stringify({ 방식: md.방식, 기반: md.기반, 물질: md.물질.filter(x => x.name || x.abbr).map(x => ({ abbr: x.abbr, name: x.name, cas: x.cas })) }) : ''; }
  const m = formMol(); let info = null;
  if (m) { info = chemInfo(m); Object.assign(obj, { idcode: info.idcode, 좌표: info.coords, 검색값: info.index, 분자식: info.formula, 분자량: obj['종류'].includes('고분자') ? '' : info.mw }); }
  else Object.assign(obj, { idcode: '', 좌표: '', 검색값: '' });
  const vb = m && S.fEditor.valenceIssues ? [...new Set(S.fEditor.valenceIssues().values())] : [];
  const warns = [...vb.map(x => '구조: ' + x), ...(m ? checkMol(m) : []), ...duplicates(obj, info)];
  const wEl = $('fWarn');
  if (warns.length && wEl.dataset.ack !== JSON.stringify(warns)) { wEl.innerHTML = warns.map(x => '⚠ ' + x).join('<br>') + '<br><b>그래도 저장하려면 저장을 한 번 더 누르세요.</b>'; wEl.dataset.ack = JSON.stringify(warns); return; }
  const btn = $('fSave'); btn.disabled = true; btn.textContent = '저장 중…';
  try { const saved = await save('샘플', obj); delete S.mols[saved.id]; wEl.dataset.ack = ''; closeModal('form'); render(); toast('저장됨'); }
  catch (e) { wEl.innerHTML = '저장하지 못했습니다: ' + errMsg(e); }
  finally { btn.disabled = false; btn.textContent = '저장'; }
}, '저장 중…');

// ---------- 출고 (조회 모드에서도 입력) ----------
function solvEditor(boxId, F, onchg) {
  // F: {t:'sol', p, s:[{k,p}]} 를 직접 고침
  const used = new Set(F.s.map(c => c.k));
  $(boxId).innerHTML = `<div class="row" style="margin:0 0 8px"><span>용질(제품) 함량</span><input type="number" step="any" value="${F.p}" class="num" style="width:90px;text-align:right" oninput="${onchg}.F.p=+this.value;${onchg}.sum()"> %</div>
    <div class="solvbtns">${Docs.SOLV_ORDER.map(k => `<button ${used.has(k) ? 'disabled' : ''} onclick="${onchg}.add('${k}')">+ ${SOLV_SHORT[k]}</button>`).join('')}</div>
    ${F.s.map((c, i) => `<div class="srow"><div><b>${esc(Docs.SOLV[c.k].name)}</b> <span class="hint">${esc(Docs.SOLV[c.k].ko)}</span></div>
      <div class="pct"><input type="number" step="any" value="${c.p}" oninput="${onchg}.F.s[${i}].p=+this.value;${onchg}.sum()"> %</div><button class="sm" onclick="${onchg}.F.s.splice(${i},1);${onchg}.draw()">삭제</button></div>`).join('') || '<p class="empty">용매 없음</p>'}
    <div class="sumtxt" id="${boxId}_sum"></div>`;
}
function addSolvTo(F, key) {
  if (F.s.some(c => c.k === key)) return;
  const sum = (+F.p || 0) + F.s.reduce((a, c) => a + (+c.p || 0), 0); let give = +(100 - sum).toFixed(2);
  if (give <= 0) { const big = F.s.length ? F.s.reduce((a, c) => (+c.p > +a.p ? c : a)) : null;
    if (big && +big.p >= (+F.p || 0)) { give = +(big.p / 2).toFixed(2); big.p = +(big.p - give).toFixed(2); } else { give = +((+F.p || 0) / 2).toFixed(2); F.p = +((+F.p || 0) - give).toFixed(2); } }
  F.s.push({ k: key, p: give });
}
window.SF = { F: null, add(k) { addSolvTo(this.F, k); this.draw(); }, draw() { solvEditor('s_형태칸', this.F, 'SF'); this.sum(); },
  sum(box = 's_형태칸') { const t = +((+this.F.p || 0) + this.F.s.reduce((a, c) => a + (+c.p || 0), 0)).toFixed(2), el = $(box + '_sum'); if (el) el.innerHTML = Math.abs(t - 100) < 0.01 ? '<span class="msg ok">합계 100% ✓</span>' : `<span class="msg bad">합계 ${t}%</span>`; } };
window.shipCustChanged = () => {};
function shipCo() { const v = segVal('s_명의'); return v === '기타' ? $('s_기타').value.trim() : v; }
const SHIP_KEYS = ['고객사', '출고일', '수량', '가격', '비고'];
// 가격은 만원 단위 숫자로 저장. 예전 글자 값('500만원', '3,000,000원', '1.2억')도 숫자로 읽음
function manwon(v) { const t = String(v == null ? '' : v).replace(/[,\s]/g, ''); if (!t) return '';
  let m = t.match(/^([\d.]+)억(?:([\d.]+)만)?/); if (m) return String(+m[1] * 10000 + (+m[2] || 0));
  m = t.match(/^([\d.]+)만/); if (m) return String(+m[1]);
  m = t.match(/^([\d.]+)원$/); if (m) return String(+m[1] / 10000);
  m = t.match(/^[\d.]+$/); return m ? String(+t) : t; }
const priceText = v => { const n = manwon(v); return n === '' ? '' : /^[\d.]+$/.test(n) ? `${(+n).toLocaleString('ko-KR')}만원` : n; };
// 출고 기록 창(짧게): 출고사 · 고객사 · 출고일 · 수량 · 서류 제출일 · 비고. 다른 칸(요청일, 제출 형태 등)은 있던 값 그대로 둠
window.openShip = id => {
  const s = S.cur; let x = id ? rows('출고').find(r => r.id === id) : null;
  if (!x) { const prev = shipsOf(s.id)[0];
    x = { 명의: (prev && prev['명의']) || namesOf(s)[0] || companyOf(s) || '한인', 고객사: (prev && prev['고객사']) || '동우화인켐', 수량: (prev && prev['수량']) || '', 출고일: S.today,
      제출형태: (prev && prev['제출형태']) || JSON.stringify(legacyForm(s) || { t: 'neat' }) }; }
  S.ship = x; const N = coNames(), isEtc = x['명의'] && !N.includes(x['명의']);
  $('custDl').innerHTML = rows('고객사').map(c => `<option value="${esc(c['회사명'])}">`).join('');
  $('etcDl').innerHTML = etcNames().map(n => `<option value="${esc(n)}">`).join('');
  $('sTitle').textContent = `${x.id ? '출고 기록 수정' : '출고 기록'} — ${s['제품명']}`;
  seg('s_명의', [...N, '기타'], [isEtc ? '기타' : x['명의']], 'radio', true);
  $('s_기타').value = isEtc ? x['명의'] : ''; const syncEtc = () => { $('s_기타').style.display = segVal('s_명의') === '기타' ? '' : 'none'; };
  $('s_명의').onchange = syncEtc;
  SHIP_KEYS.forEach(k => $('s_' + k).value = k === '가격' ? manwon(x[k]) : (x[k] || ''));
  syncEtc();
  $('sDel').style.visibility = x.id ? '' : 'hidden'; $('sMsg').textContent = '';
  openModal('shipBox');
};
window.saveShip = () => busy(async () => {
  const s = S.cur, x = Object.assign({}, S.ship);
  x['샘플id'] = s.id; x['제품명'] = s['제품명']; x['명의'] = shipCo();
  SHIP_KEYS.forEach(k => x[k] = $('s_' + k).value.trim()); x['가격'] = manwon(x['가격']);
  if (x['가격'] && !/^[\d.]+$/.test(x['가격'])) { flash('sMsg', '가격은 만원 단위 숫자로 넣어 주세요 (예: 300).', false); return; }
  if (!x.id && !x['필요서류']) x['필요서류'] = defaultNeed(x['명의'], x['고객사']).join(',');
  if (!x['함량']) { const f = parseForm(x['제출형태']); x['함량'] = f && f.t === 'sol' ? String(f.p) : '100'; }
  delete x['체크'];
  if (!x['명의']) { flash('sMsg', '출고사를 고르세요.', false); return; }
  try {
    if (x['고객사'] && !custOf(x['고객사']) && S.pw && confirm(`"${x['고객사']}"는 거래처에 없는 고객사입니다. 고객사로 추가할까요?\n(일회성이면 [취소] — 이 기록에만 이름이 남습니다)`))
      await save('고객사', { 회사명: x['고객사'], 필요서류: 'MSDS' });
    const r = await call('saveShipment', x); upsert('출고', r.ship);
    if (r.sample) { upsert('샘플', r.sample); S.cur = r.sample; }
    closeModal('shipBox'); toast('저장됨'); setTimeout(() => { showDetail(s.id, false, 'info'); render(); }, 380);
  } catch (e) { flash('sMsg', '저장하지 못했습니다: ' + errMsg(e), false); }
}, '저장 중…');
window.delShip = () => busy(async () => { if (!confirm('이 출고 기록을 지울까요?')) return; await remove('출고', S.ship.id); closeModal('shipBox'); toast('삭제됨'); setTimeout(() => showDetail(S.cur.id, false, 'info'), 380); }, '삭제 중…');

// ---------- 신고면제 ----------
const EX_KEYS = ['신청일', '통지일', '면제번호', '통지물질명', '통지CAS'];
window.openEx = (id, notice) => {
  const s = S.cur, e = id ? rows('신고면제').find(r => r.id === id) : { 신청일: S.today, 기관: '동우화인켐', 신청회사: S.exCo || '한인' };
  S.exRec = e; $('eTitle').textContent = `신고면제 — ${s['제품명']}`;
  EX_KEYS.forEach(k => $('e_' + k).value = e[k] || '');
  const insts = [...new Set([...rows('고객사').map(c => c['회사명']), e['기관'] || '동우화인켐'])];
  $('e_기관').innerHTML = insts.map(n => `<option ${n === (e['기관'] || '동우화인켐') ? 'selected' : ''}>${esc(n)}</option>`).join('');
  const cos = [...new Set([...coNames(), e['신청회사'] || '한인'])];
  $('e_신청회사').innerHTML = cos.map(n => `<option value="${esc(n)}" ${n === (e['신청회사'] || '한인') ? 'selected' : ''}>${esc(coFull(n))}</option>`).join('');
  $('eWarn').innerHTML = ''; $('eWarn').className = 'warn'; $('eFile').value = ''; $('eFile2').value = ''; $('eDel').style.visibility = e.id ? '' : 'hidden';
  $('eTitle').textContent = `${e.id ? (notice ? '통지서 넣기' : '신고면제 기록') : '신고면제 신청 기록'} — ${s['제품명']}`;
  $('eNotice').style.display = e.id ? '' : 'none'; $('eOld').style.display = e.id ? 'none' : '';
  openModal('exBox');
};
const norm = t => String(t || '').toLowerCase().replace(/[\s\-_,()[\]{}'"]/g, '');
window.readNoticeFile = async inp => noticeFill(inp.files[0]);
async function noticeFill(f) {
  if (!f) return; const w = $('eWarn');
  $('eNotice').style.display = ''; $('eOld').style.display = 'none';
  w.className = 'warn'; w.textContent = '통지서 읽는 중… (파일은 저장되지 않습니다)';
  try {
    const r = await Docs.readNotice(f), s = S.cur, msgs = [];
    ['면제번호', '통지일'].forEach(k => { if (r[k]) $('e_' + k).value = r[k]; });
    S.exRec._notice = { 결과: r.결과 || '', 사유: r.사유 || '', 연간제조량: r.연간제조량 || '' };
    const inst = rows('고객사').map(c => c['회사명']).find(n => n && r.원문 && norm(r.원문).includes(norm(n)));
    if (inst && !S.exRec.id) $('e_기관').value = inst;
    if (r.물질명) $('e_통지물질명').value = r.물질명; if (r.CAS) $('e_통지CAS').value = r.CAS;
    if (!r.면제번호) msgs.push('면제확인번호를 찾지 못했습니다. 직접 입력하세요.');
    if (r.물질명 && s['물질명'] && norm(r.물질명) !== norm(s['물질명'])) msgs.push(`통지서 물질명이 샘플 물질명과 다릅니다.<br>· 통지서: ${esc(r.물질명)}<br>· 샘플: ${esc(s['물질명'])}`);
    if (r.CAS && s.CAS && !s.CAS.includes(r.CAS)) msgs.push(`통지서 CAS ${esc(r.CAS)}가 샘플 CAS ${esc(s.CAS)}와 다릅니다.`);
    if (r.결과 === '비대상') msgs.push('결과가 <b>비대상</b>입니다. 사유를 확인하세요.');
    const ap = $('e_신청일').value; if (r.통지일 && ap && r.통지일 < ap) msgs.push(`통지일 ${esc(r.통지일)}이 이 기록의 신청일 ${esc(ap)}보다 빠릅니다. 다른 신청의 통지서인지 확인하세요.`);
    w.innerHTML = (msgs.length ? msgs.map(x => '⚠ ' + x).join('<br>') : '✓ 통지서 내용을 채웠습니다.') + '<br>확인하고 [저장]을 누르면 통지 완료로 바뀝니다.';
  } catch (e) { w.className = 'warn err'; w.textContent = '통지서를 읽지 못했습니다: ' + ((e && e.message) || e); }
}
// 기록 칸에서 바로 통지서 넣기: 통지 대기 기록이 있으면 거기에, 없으면 새 기록
window.exNotice = f => {
  if (!f) return;
  const wait = exOf(S.cur.id).find(e => !e['면제번호']);
  openEx(wait ? wait.id : null, true); noticeFill(f);
};
window.saveEx = () => busy(async () => {
  const s = S.cur, e = Object.assign({}, S.exRec), before = S.exRec['면제번호'];
  e['샘플id'] = s.id; e['제품명'] = s['제품명']; e['기관'] = $('e_기관').value; e['신청회사'] = $('e_신청회사').value;
  EX_KEYS.forEach(k => e[k] = $('e_' + k).value.trim());
  if (e._notice) { Object.keys(e._notice).forEach(k => { if (e._notice[k]) e[k] = e._notice[k]; }); delete e._notice; }
  e['기간시작'] = e['신청일']; e['기간종료'] = e['신청일'] ? yearEnd(e['신청일']) : '';
  try {
    await save('신고면제', e);
    const goDocs = e['면제번호'] && !before && e['결과'] !== '비대상';
    S.detailNote = goDocs ? `${e['기관']} 면제번호가 등록되었습니다. 자진확인서·MSDS를 만드세요.` : '';
    S.detailCust = goDocs ? e['기관'] : '';
    closeModal('exBox'); toast('저장됨'); setTimeout(() => { showDetail(s.id, false, goDocs ? 'ship' : 'ex'); render(); }, 380);
  } catch (err) { const w = $('eWarn'); w.className = 'warn err'; w.textContent = '저장하지 못했습니다: ' + ((err && err.message) || err); }
}, '저장 중…');
window.delEx = () => busy(async () => { if (!confirm('이 신고면제 기록을 지울까요?')) return; await remove('신고면제', S.exRec.id); closeModal('exBox'); toast('삭제됨'); setTimeout(() => showDetail(S.cur.id, false, 'ex'), 380); }, '삭제 중…');

// ---------- 성분 표 (MSDS 작성 · 혼합물 샘플 공용) ----------
// 행: {name, cas, pct, rest(나머지), key(용매), 면제번호, unknown(붙여넣기에서 못 읽음)}
const CT = window.CT = {};
function ctInit(id, list, onChange) { CT[id] = { list: (list || []).map(c => ({ ...c })), onChange }; if (!CT[id].list.length) CT[id].list.push({ name: '', cas: '', pct: '' }); ctDraw(id); }
const ctRestVal = L => { if (!L.some(c => c.rest)) return null; return +(100 - L.reduce((a, c) => a + (c.rest ? 0 : (+c.pct || 0)), 0)).toFixed(4); };
function ctResolved(id) {
  const L = CT[id] ? CT[id].list : [], r = ctRestVal(L);
  return L.filter(c => (c.name || '').trim() || (c.cas || '').trim()).map(c => { const o = { name: (c.name || '').trim(), cas: (c.cas || '').trim(), pct: c.rest ? r : (c.pct === '' || c.pct == null ? null : +c.pct), 면제번호: (c.면제번호 || '').trim() }; if (c.key) o.key = c.key; if (c.종류) o.종류 = c.종류; return o; });
}
const ctRaw = id => (CT[id] ? CT[id].list : []).filter(c => (c.name || '').trim() || (c.cas || '').trim()).map(c => { const o = { name: c.name || '', cas: c.cas || '', pct: c.rest ? '' : c.pct }; if (c.rest) o.rest = true; if (c.key) o.key = c.key; if (c.면제번호) o.면제번호 = c.면제번호; return o; });
function ctStatus(id, i) {
  const c = CT[id].list[i]; if (!c.name && !c.cas) return '';
  if (c.unknown) return `<span class="b bad" title="사전에 없는 이름입니다. CAS를 넣거나 [사전에 추가]하세요.">못 읽음</span>`;
  const s = Docs.compData(c); if (s) return `<span class="b ok" title="${esc(s.name + (s.src ? ' · ' + s.src : ''))}">자료 있음</span>`;
  if (c.cas) return `<span class="b wait">자료 없음</span><button class="sm" onclick="dictOpen(null,'${id}',${i})">사전에 추가</button>`;
  return '<span class="b etc">신규 물질</span>';
}
function ctDraw(id) {
  const T = CT[id], el = $(id); if (!el) return;
  const used = new Set(T.list.map(c => c.key).filter(Boolean));
  el.innerHTML = `<table class="ctbl"><thead><tr><th>물질명</th><th style="width:112px">CAS</th><th style="width:78px">함량(%)</th><th style="width:132px">면제번호</th><th style="width:150px">자료</th><th style="width:34px"></th></tr></thead><tbody>` +
    T.list.map((c, i) => `<tr class="${c.unknown ? 'bad' : ''}">
      <td><input value="${esc(c.name)}" placeholder="이름 또는 약어 (예: DMSO)" oninput="ctSet('${id}',${i},'name',this.value)" onchange="ctMatch('${id}',${i})"></td>
      <td><input value="${esc(c.cas)}" placeholder="없으면 비움" oninput="ctSet('${id}',${i},'cas',this.value)"></td>
      <td><input value="${c.rest ? '나머지' : esc(c.pct)}" placeholder="% 또는 나머지" oninput="ctSet('${id}',${i},'pct',this.value)" style="text-align:right"></td>
      <td><input value="${esc(c.면제번호 || '')}" placeholder="있으면" oninput="ctSet('${id}',${i},'면제번호',this.value)"></td>
      <td id="${id}_st${i}" class="ctst">${ctStatus(id, i)}</td>
      <td><button class="sm ghost" title="행 삭제" onclick="ctDel('${id}',${i})">×</button></td></tr>`).join('') + `</tbody></table>
    <div class="row" style="margin-top:8px"><button class="sm" onclick="ctAdd('${id}')">+ 행 추가</button><button class="sm" onclick="pasteOpen('${id}')">붙여넣기</button>
      <span class="hint" style="margin-left:8px">용매</span>${Docs.SOLV_ORDER.map(k => `<button class="sm" ${used.has(k) ? 'disabled' : ''} onclick="ctAddSolv('${id}','${k}')" title="${esc(Docs.SOLV[k].ko)}">+ ${SOLV_SHORT[k] || k}</button>`).join('')}</div>
    <div class="sumbar" id="${id}_bar"></div><div class="sumtxt" id="${id}_sum"></div>`;
  ctSum(id);
}
function ctSum(id) {
  const L = CT[id].list, r = ctRestVal(L), cols = ['#14304d', '#2f80d8', '#1a7f37', '#c4520a', '#8250df', '#bf8700', '#d61f69', '#0aa3a3'];
  const parts = L.filter(c => c.name || c.cas).map((c, i) => ({ n: c.name || c.cas, p: c.rest ? r : (+c.pct || 0), c: cols[i % cols.length] }));
  const tot = +parts.reduce((a, x) => a + (+x.p || 0), 0).toFixed(4);
  if ($(id + '_bar')) $(id + '_bar').innerHTML = parts.map(x => `<i style="width:${Math.max(0, Math.min(100, x.p))}%;background:${x.c}" title="${esc(x.n)} ${x.p}%"></i>`).join('');
  const ok = r != null ? r >= 0 : Math.abs(tot - 100) < 0.01, el = $(id + '_sum');
  if (el) el.innerHTML = !parts.length ? '' : r != null ? (r >= 0 ? `<span class="msg ok">나머지 = ${r}% · 합계 100% ✓</span>` : `<span class="msg bad">다른 성분 합이 100%를 넘습니다 (나머지 ${r}%)</span>`)
    : ok ? '<span class="msg ok">합계 100% ✓</span>' : `<span class="msg bad">합계 ${tot}% — 100%가 되어야 합니다</span>`;
  return ok;
}
window.ctSet = (id, i, k, v) => {
  const c = CT[id].list[i];
  if (k === 'pct') { const t = v.trim(); if (t === '나머지' || t === '나') { CT[id].list.forEach(x => { x.rest = false; }); c.rest = true; c.pct = ''; } else { c.rest = false; c.pct = t.replace('%', ''); } }
  else { c[k] = v; if (k === 'name' || k === 'cas') { c.unknown = false; if (k === 'cas' || !Docs.SOLV[c.key] || Docs.SOLV[c.key].name !== v) { if (k === 'cas' && c.key && Docs.SOLV[c.key] && Docs.SOLV[c.key].cas !== v.trim()) delete c.key; } } }
  const st = $(`${id}_st${i}`); if (st) st.innerHTML = ctStatus(id, i);
  const tr = st && st.closest('tr'); if (tr) tr.classList.toggle('bad', !!c.unknown);
  ctSum(id); if (CT[id].onChange) CT[id].onChange();
};
window.ctMatch = (id, i) => { // 이름으로 사전·용매 찾아 CAS 채우기(정확히 같은 이름만)
  const c = CT[id].list[i]; if (!c.name || c.cas) return;
  const s = Docs.findComp(c.name); if (!s) return;
  c.cas = s.cas || ''; if (s.key) c.key = s.key; ctDraw(id); if (CT[id].onChange) CT[id].onChange();
};
window.ctAdd = id => { CT[id].list.push({ name: '', cas: '', pct: '' }); ctDraw(id); };
window.ctDel = (id, i) => { CT[id].list.splice(i, 1); if (!CT[id].list.length) CT[id].list.push({ name: '', cas: '', pct: '' }); ctDraw(id); if (CT[id].onChange) CT[id].onChange(); };
window.ctAddSolv = (id, k) => {
  const L = CT[id].list, s = Docs.SOLV[k]; if (L.some(c => c.key === k)) return;
  const row = { name: s.name, cas: s.cas, key: k, pct: '' }; if (!L.some(c => c.rest)) row.rest = true;
  const empty = L.findIndex(c => !c.name && !c.cas); if (empty >= 0) L[empty] = row; else L.push(row);
  ctDraw(id); if (CT[id].onChange) CT[id].onChange();
};
const compSummary = L => (L || []).filter(c => c.name || c.cas).map(c => `${c.name || c.cas}${c.rest ? '' : c.pct !== '' && c.pct != null ? ' ' + c.pct + '%' : ''}`).join(' · ') + ((L || []).some(c => c.rest) ? ' (나머지 ' + ((L.find(c => c.rest) || {}).name || '') + ')' : '');
const parseComps = s => { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };

// ---------- 조성 붙여넣기: "HI-SW-01 AgNO3 1.7%, LiCl 2.12%, PVA 10% in DMSO" ----------
function parseCompLine(line) {
  let t = line.trim().replace(/\s+/g, ' '); if (!t) return null;
  let solv = ''; const m = t.match(/^(.*)\s+in\s+([^,%]+)$/i); if (m) { t = m[1]; solv = m[2].trim(); }
  const segs = t.split(/[,;]/).map(x => x.trim()).filter(Boolean), comps = []; let product = '';
  segs.forEach((sg, si) => {
    const mm = sg.match(/^(.*?)\s*([\d.]+)\s*(?:wt\s*)?%$/i);
    let name = mm ? mm[1].trim() : sg, pct = mm ? mm[2] : '';
    if (si === 0) { // 맨 앞 칸에는 제품명이 붙어 있을 수 있음
      const tk = name.split(' ');
      if (!Docs.findComp(name) && tk.length > 1) { let k = tk.findIndex((_, j) => j > 0 && Docs.findComp(tk.slice(j).join(' '))); if (k < 0) k = 1; product = tk.slice(0, k).join(' ').replace(/[:：]$/, ''); name = tk.slice(k).join(' '); }
    }
    const s = Docs.findComp(name); comps.push({ name, cas: s ? s.cas : '', key: s && s.key, pct: pct, unknown: !s || !pct });
  });
  solv.split(/[\/+]/).map(x => x.trim()).filter(Boolean).forEach((n, j) => { const s = Docs.findComp(n); comps.push({ name: n, cas: s ? s.cas : '', key: s && s.key, pct: '', rest: j === 0, unknown: !s || j > 0 }); });
  return { product, comps, line };
}
window.pasteOpen = id => { S.pasteFor = id; $('pasteTa').value = ''; $('pasteRes').innerHTML = ''; openModal('pasteBox'); setTimeout(() => $('pasteTa').focus(), 50); };
window.pasteParse = () => {
  const L = $('pasteTa').value.split(/\r?\n/).map(parseCompLine).filter(Boolean); S.pasteRes = L;
  if (!L.length) { $('pasteRes').innerHTML = '<p class="empty">읽을 줄이 없습니다.</p>'; return; }
  const multi = L.length > 1 && S.pasteFor === 'm_comp';
  $('pasteRes').innerHTML = `<table class="tbl"><tr><th>원문</th><th>제품명</th><th>읽은 성분</th>${multi ? '<th></th>' : ''}</tr>` + L.map((p, i) => {
    const bad = p.comps.filter(c => c.unknown).length;
    return `<tr><td class="hint">${esc(p.line)}</td><td><b>${esc(p.product || '-')}</b></td><td>${p.comps.map(c => `<span class="b ${c.unknown ? 'bad' : 'ok'}" style="margin:1px">${esc(c.name)} ${c.rest ? '나머지' : esc(c.pct) + '%'}</span>`).join(' ')}${bad ? `<div class="wmini">못 읽은 성분 ${bad}개 — 표에서 고쳐야 합니다</div>` : ''}</td>${multi ? `<td><button class="sm" onclick="pasteUse(${i})">이 제품 열기</button></td>` : ''}</tr>`; }).join('') + '</table>' +
    `<div class="row" style="margin-top:10px">${multi ? `<button class="primary" onclick="batchMsds()" ${L.some(p => p.comps.some(c => c.unknown)) || L.some(p => !p.product) ? 'disabled title="못 읽은 성분이나 제품명이 없는 줄이 있으면 하나씩 열어서 고치세요"' : ''}>${L.length}개 MSDS 한 번에 Excel로 받기</button>` : `<button class="primary" onclick="pasteUse(0)">표에 넣기</button>`}<span class="msg" id="pasteMsg"></span></div>`;
};
window.pasteUse = i => {
  const p = S.pasteRes[i], id = S.pasteFor; closeModal('pasteBox');
  ctInit(id, p.comps, CT[id] && CT[id].onChange);
  if (id === 'm_comp' && p.product) $('m_제품명').value = p.product;
  if (CT[id].onChange) CT[id].onChange();
};
window.batchMsds = async () => {
  const base = msdsRead(), ci = companyInfoFor(base.양식);
  for (let i = 0; i < S.pasteRes.length; i++) {
    const p = S.pasteRes[i]; flash('pasteMsg', `만드는 중… ${i + 1}/${S.pasteRes.length} (${esc(p.product)})`);
    ctInit('m_comp', p.comps); const M = msdsMeta({ ...base, 제품명: p.product, 성분: ctResolved('m_comp') });
    try { const { blob } = await Docs.buildMsdsXlsx(M, ci); await Docs.deliver(blob, msdsFileName(M), 'xlsx', 'orig'); await msdsLog(M); }
    catch (e) { flash('pasteMsg', `${esc(p.product)}: ${errMsg(e)}`, false); return; }
  }
  flash('pasteMsg', `✓ ${S.pasteRes.length}개를 받았습니다. 노란 칸을 확인하세요.`); ctInit('m_comp', [], msdsPreview); msdsPreview(); renderMsdsHist();
};

// ---------- MSDS ----------
function blankMsds() { return { 제품명: '', 양식: '한인', 성분: [], 성상: '', 색상: '', 용도: '연구개발용', 분자량: '' }; }
S.msds = blankMsds();
function msdsFromSample(s, ship) {
  const inst = ship && ship['고객사'], ex = sampleEx(s.id, inst || undefined), mol = molOf(s);
  const co = ship ? coOf(ship['명의']) : null;
  const form = (co && co['MSDS양식']) || (ship && ship['명의'] === '엘에스켐' ? '엘에스켐' : '한인');
  const exNo = ex && ex.st.k === '유효' ? ex.e['면제번호'] : '';
  let comps;
  if (kindsOf(s).includes('혼합물') && s['성분']) comps = parseComps(s['성분']);
  else {
    const f = ship ? parseForm(ship['제출형태']) : legacyForm(s);
    comps = [{ name: (ex && ex.e['통지물질명']) || s['물질명'] || s['제품명'], cas: s.CAS || '', pct: f && f.t === 'sol' ? String(f.p) : '100', 면제번호: exNo, 종류: kindsOf(s).includes('고분자') ? '고분자' : '신규 물질' }];
    if (f && f.t === 'sol') f.s.forEach(x => { const v = Docs.SOLV[x.k]; if (v) comps.push({ name: v.name, cas: v.cas, key: x.k, pct: String(x.p) }); });
  }
  S.msdsCtx = { sid: s.id };
  S.msds = { 제품명: s['제품명'], 양식: form, 성분: comps, 성상: s['성상'] || '', 색상: '', 용도: '연구개발용', 분자량: kindsOf(s).includes('고분자') || kindsOf(s).includes('혼합물') ? '' : (s['분자량'] || (mol ? chemInfo(mol).mw : '')) };
}
function msdsRefresh() {
  const M = S.msds; Docs.setDict(rows('성분사전'));
  $('m_samples').innerHTML = S.samples.map(s => `<option value="${esc(s['제품명'])}">${esc(s['관리번호'] || '')}</option>`).join('');
  $('m_제품명').value = M.제품명 || ''; seg('m_양식', [...new Set(['한인', '엘에스켐', M.양식 || '한인'])], [M.양식 || '한인'], 'radio', true);
  ['성상', '색상', '용도', '분자량'].forEach(k => $('m_' + k).value = M[k] || '');
  ctInit('m_comp', M.성분, msdsPreview);
  $('m_msg').textContent = ''; msdsPreview(); renderMsdsHist();
  const c = S.msdsCtx, s = c && S.samples.find(x => x.id === c.sid);
  $('m_from').innerHTML = s ? `<button class="linkbtn" onclick="msdsBackToSample()" title="샘플로 돌아가기">← ${esc(s['관리번호'] || '')} ${esc(s['제품명'])}</button>` : '';
}
window.msdsBackToSample = () => { const c = S.msdsCtx; if (!c) return; navTo('list'); setTimeout(() => showDetail(c.sid, false, S.msdsFromTab || 'ship'), 50); };
const companyInfoFor = form => { const c = coOf(form) || {}; return { 회사명: c['회사명'] || '', 주소: c['주소'] || '', 전화: c['전화'] || '' }; };
window.msdsPick = () => { const s = S.samples.find(x => x['제품명'] === $('m_제품명').value); if (s) { msdsFromSample(s, shipsOf(s.id)[0]); msdsRefresh(); } };
// 형태 꼬리표(파일 이름·개정 구분): 액체 용매가 있으면 "(용질 % 용매+용매)"
function formTag(comps) {
  const liq = comps.filter(c => { const s = Docs.compData(c); return s && s.liquid; }); if (!liq.length || liq.length === comps.length) return '';
  const p = +(100 - liq.reduce((a, c) => a + (+c.pct || 0), 0)).toFixed(2);
  return `(${p}% ${liq.map(c => SOLV_SHORT[c.key] || (Docs.compData(c) || {}).syn || c.name).join('+')})`;
}
function msdsMeta(M) {
  M.형태 = formTag(M.성분 || []);
  const hist = rows('MSDS이력').filter(h => { let t = ''; try { t = JSON.parse(h['입력'] || '{}').형태 || ''; } catch (e) {} return h['제품명'] === M.제품명 && h['양식'] === M.양식 && t === M.형태; }).sort((a, b) => (a['작성일'] || '').localeCompare(b['작성일'] || ''));
  M.개정차수 = hist.length; M.최초작성일 = hist.length ? hist[0]['작성일'] : S.today; M.작성일 = S.today;
  const sm = S.samples.find(x => x['제품명'] === M.제품명); M.관리번호 = sm ? sm['관리번호'] || '' : ''; return M;
}
function msdsRead() {
  const M = S.msds; M.제품명 = $('m_제품명').value.trim(); M.양식 = segVal('m_양식') || '한인';
  ['성상', '색상', '용도', '분자량'].forEach(k => M[k] = $('m_' + k).value.trim());
  M.성분 = ctResolved('m_comp'); return msdsMeta(M);
}
let ghsImgs = null;
async function msdsPreview() {
  const M = msdsRead(), ci = companyInfoFor(M.양식), C = Docs.msdsContent(M, ci);
  const w = [...C.flags]; if (!ci.회사명) w.push(`거래처 → 출고사에 ${M.양식} 회사 정보가 없습니다.`);
  if (M.성분.some(c => c.key)) w.push('용매 자료(노출기준, 15번 규제)는 공급사 MSDS로 한 번 검수하세요.');
  if ((CT.m_comp ? CT.m_comp.list : []).some(c => c.unknown)) w.unshift('빨간 줄(못 읽은 성분)을 고쳐야 만들 수 있습니다.');
  if (!ghsImgs) { try { const T = await Docs.templates(); ghsImgs = T.ghs; } catch (e) { ghsImgs = {}; } }
  const pics = C.C.pic.length ? `<div class="pics">${C.C.pic.map(g => ghsImgs[g] ? `<img src="data:image/png;base64,${ghsImgs[g]}" title="${g}">` : `<span class="b etc">${g}</span>`).join('')}</div>` : '없음';
  $('m_prev').innerHTML = `<div class="kv"><div>신호어</div><div>${C.s2.신호어 === '위험' ? '<span class="b bad big">위험</span>' : C.s2.신호어 === '경고' ? '<span class="b wait big">경고</span>' : '해당없음'}</div>
    <div>그림문자</div><div>${pics}</div>
    <div>분류</div><div>${C.C.cls.length ? C.C.cls.map(esc).join('<br>') : '자료없음 (분류 안 됨)'}</div>
    <div>유해·위험문구</div><div>${C.C.h.join(', ') || '없음'}</div>
    <div>운송(14번)</div><div>${C.s14.un === '해당없음' ? '해당없음' : `UN ${esc(C.s14.un)} · ${esc(C.s14.name)} · ${esc(C.s14.cls)}급 · 용기등급 ${esc(C.s14.pg)}`}</div>
    <div>위험물(15번)</div><div>${esc(C.s15.위험물)}</div>
    <div>개정</div><div>${M.개정차수 ? `${M.개정차수}차 개정 (최초 ${esc(M.최초작성일)})` : '최초 작성'}</div></div>` +
    (w.length ? `<div class="wl" style="margin-top:12px">${w.map(x => `<div>${esc(x)}</div>`).join('')}</div>` : '');
}
window.msdsPreview = msdsPreview;
const msdsFileName = M => { const s = S.samples.find(x => x['제품명'] === M.제품명); return `${s ? baseName(s) : Docs.safeName(M.제품명)}_MSDS${M.양식 !== '한인' ? '(' + Docs.safeName(M.양식) + ')' : ''}${Docs.safeName(M.형태)}${M.개정차수 ? '_개정' + M.개정차수 : ''}`; };
async function msdsLog(M) {
  if (!S.pw || !$('m_hist').checked) return;
  await save('MSDS이력', { 제품명: M.제품명, 양식: M.양식, 입력: JSON.stringify({ 형태: M.형태, 성분: M.성분, 성상: M.성상, 색상: M.색상, 용도: M.용도, 분자량: M.분자량 }), 작성일: S.today, 개정차수: String(M.개정차수) });
}
window.makeMsds = async fmtK => {
  const M = msdsRead(); if (!M.제품명) { flash('m_msg', '제품명을 입력하세요.', false); return; }
  if (!M.성분.length) { flash('m_msg', '성분을 한 줄 이상 넣으세요.', false); return; }
  if (CT.m_comp.list.some(c => c.unknown)) { flash('m_msg', '빨간 줄(못 읽은 성분)을 먼저 고치세요.', false); return; }
  if (!ctSum('m_comp')) { flash('m_msg', '함량 합계가 100%가 아닙니다.', false); return; }
  const ci = companyInfoFor(M.양식); flash('m_msg', fmtK === 'orig' ? '만드는 중…' : 'PDF로 바꾸는 중… (몇 초 걸려요)');
  try {
    const { blob } = await Docs.buildMsdsXlsx(M, ci);
    await Docs.deliver(blob, msdsFileName(M), 'xlsx', fmtK); await msdsLog(M);
    flash('m_msg', '✓ 내려받았습니다. 노란 칸을 확인한 뒤 PC에 저장하세요.'); msdsPreview(); renderMsdsHist();
  } catch (e) { flash('m_msg', '만들지 못했습니다: ' + errMsg(e), false); }
};
window.cancelMsds = () => {
  const M = msdsRead(), touched = M.제품명 || M.성분.length || M.성상 || M.색상;
  if (touched && !confirm('작성 중인 내용을 지우고 새로 시작할까요?')) return;
  S.msds = blankMsds(); S.msdsCtx = null; msdsRefresh();
};
// MSDS로 만든 제품을 샘플로 저장(관리번호 생성). 성분이 여러 개면 혼합물
window.msdsToSample = () => busy(async () => {
  const M = msdsRead(); if (!M.제품명) { flash('m_msg', '제품명을 입력하세요.', false); return; }
  if (!S.pw) { flash('m_msg', '편집 모드에서 저장할 수 있습니다.', false); return; }
  const ex = S.samples.find(x => x['제품명'] === M.제품명), raw = ctRaw('m_comp'), mix = raw.length > 1;
  const co = coNames().includes(M.양식) ? M.양식 : '한인';
  if (ex && !confirm(`"${M.제품명}"은 이미 ${ex['관리번호'] || ''} 샘플로 있습니다. 성분을 이 내용으로 바꿀까요?`)) return;
  if (!ex && !confirm(`"${M.제품명}"을 ${co} 샘플로 등록할까요? (관리번호는 자동)`)) return;
  const o = Object.assign({}, ex || { 관리회사: co, 명의: co }, { 제품명: M.제품명, 성상: M.성상 || (ex && ex['성상']) || '' });
  if (mix) { o['종류'] = [...new Set([...kindsOf(o).filter(k => k !== '단분자'), '혼합물'])].join(','); o['성분'] = JSON.stringify(raw); }
  else if (!ex) { o['종류'] = '단분자'; o['물질명'] = raw[0] ? raw[0].name : ''; o['CAS'] = raw[0] ? raw[0].cas : ''; }
  try { const r = await save('샘플', o); S.samples = rows('샘플'); S.msdsCtx = { sid: r.id }; msdsRefresh(); render(); flash('m_msg', `✓ ${esc(r['관리번호'] || '')} ${esc(r['제품명'])} 샘플로 저장했습니다.`); }
  catch (e) { flash('m_msg', '저장하지 못했습니다: ' + errMsg(e), false); }
}, '저장 중…');
// 작성 이력: 찾아보고 다시 만들기
function renderMsdsHist() {
  const q = ($('m_hq') && $('m_hq').value || '').trim().toLowerCase();
  const L = rows('MSDS이력').map(h => { let o = {}; try { o = JSON.parse(h['입력'] || '{}'); } catch (e) {} const comps = Docs.toComps(o); return { h, o, comps, sum: comps.map(c => `${c.name}${c.pct != null && c.pct !== '' ? ' ' + c.pct + '%' : ''}`).join(' · ') }; })
    .filter(x => !q || [x.h['제품명'], x.h['양식'], x.sum, ...x.comps.map(c => c.cas)].some(v => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => String(b.h['작성일'] || '').localeCompare(String(a.h['작성일'] || '')) || String(b.h['수정일'] || '').localeCompare(String(a.h['수정일'] || '')));
  if (!$('m_hlist')) return;
  $('m_hlist').innerHTML = L.length ? `<table class="tbl"><tr><th style="width:96px">작성일</th><th style="width:130px">제품명</th><th style="width:70px">양식</th><th>성분</th><th style="width:60px">개정</th><th style="width:70px"></th></tr>` +
    L.slice(0, 100).map(x => `<tr><td>${esc(x.h['작성일'])}</td><td style="white-space:nowrap"><b>${esc(x.h['제품명'])}</b></td><td>${esc(x.h['양식'])}</td><td class="hint">${esc(x.sum)}</td><td>${+x.h['개정차수'] ? x.h['개정차수'] + '차' : '최초'}</td>
      <td><button class="sm" onclick="msdsLoadHist('${x.h.id}')">불러오기</button></td></tr>`).join('') + '</table>' + (L.length > 100 ? `<p class="hint">${L.length}건 중 100건만 보입니다. 검색으로 좁혀 주세요.</p>` : '')
    : `<div class="emptybox">${q ? '찾는 이력이 없습니다.' : 'MSDS를 만들면(이력 남기기 켜짐) 여기에 쌓입니다.'}</div>`;
}
window.renderMsdsHist = renderMsdsHist;
window.msdsLoadHist = id => {
  const h = rows('MSDS이력').find(x => x.id === id); if (!h) return; let o = {}; try { o = JSON.parse(h['입력'] || '{}'); } catch (e) {}
  S.msds = { 제품명: h['제품명'], 양식: h['양식'] || '한인', 성분: Docs.toComps(o).map(c => ({ ...c, pct: c.pct == null ? '' : String(c.pct) })), 성상: o.성상 || '', 색상: o.색상 || '', 용도: o.용도 || '연구개발용', 분자량: o.분자량 || (o.용질 && o.용질.mw) || '' };
  const s = S.samples.find(x => x['제품명'] === h['제품명']); S.msdsCtx = s ? { sid: s.id } : null;
  msdsRefresh(); window.scrollTo(0, 0); flash('m_msg', `${esc(h['작성일'])} 이력을 불러왔습니다. 고쳐서 다시 받으면 개정판이 됩니다.`);
};

// ---------- 성분 사전 (설정) ----------
const DICT_F = [['이름', '이름(영문) *', 'c2'], ['국문명', '국문명', 'c2'], ['이명', '약어·이명 (쉼표로)', 'c2'], ['CAS', 'CAS *', 'c2']];
window.dictOpen = (id, ctId, rowI) => {
  Docs.setDict(rows('성분사전'));
  let r = id ? rows('성분사전').find(x => x.id === id) : null, d = {};
  if (r) { try { d = JSON.parse(r['자료'] || '{}'); } catch (e) {} }
  else if (ctId != null) { const c = CT[ctId].list[rowI]; r = { 이름: c.name, CAS: c.cas }; }
  else if (S.dictCopy) { const b = [...Docs.BASE_COMPS, ...Docs.SOLV_ORDER.map(k => Docs.SOLV[k])].find(x => x.cas === S.dictCopy); r = { 이름: b.name, 국문명: b.ko, 이명: b.syn, CAS: b.cas, 출처: b.src || (b.key ? '용매 (공급사 MSDS·EU CLP)' : '') }; d = JSON.parse(JSON.stringify(b)); ['name', 'ko', 'syn', 'cas', 'src', 'key'].forEach(k => delete d[k]); S.dictCopy = null; }
  r = r || {}; S.dictCtx = { id: r.id || null, ctId, rowI, base: d }; const k = d.cls || {}, L = d.law || {};
  const sel = (nm, opts, v) => `<select id="dc_${nm}">${opts.map(([val, lab]) => `<option value="${val}" ${String(v ?? '') === String(val) ? 'selected' : ''}>${lab}</option>`).join('')}</select>`;
  const inp = (nm, v, ph) => `<input id="dc_${nm}" value="${esc(v ?? '')}" placeholder="${esc(ph || '')}">`;
  $('dictTitle').textContent = r.id ? `성분 사전 — ${r['이름']}` : r['이름'] ? `성분 사전 — ${r['이름']} 고치기` : '성분 사전에 추가';
  $('dictBody').innerHTML = `<div class="f">${DICT_F.map(([f, lab, cl]) => `<div class="${cl}"><label>${lab}</label>${inp(f, r[f])}</div>`).join('')}
      <div class="c2"><label>상태</label>${sel('liquid', [['', '고체'], ['1', '액체(용매)']], d.liquid ? '1' : '')}</div>
      <div class="c4"><label>출처 (SDS·분류 근거)</label>${inp('출처', r['출처'], '예: Sigma-Aldrich SDS 2025, EU CLP 조화분류')}</div></div>
    <h3 style="margin:16px 0 8px">유해성 분류</h3>
    <div class="f">
      <div class="c2"><label>급성독성 경구 ATE (mg/kg)</label>${inp('ate', k.ate, '구분4만 알면 500')}</div>
      <div class="c2"><label>급성독성 경피 ATE (mg/kg)</label>${inp('ateDerm', k.ateDerm, '구분4만 알면 1100')}</div>
      <div class="c2"><label>LD50 (MSDS 11번 문구)</label>${inp('ld50', d.ld50, '예: 526 mg/kg (쥐)')}</div>
      <div class="c2"><label>피부 부식성/자극성</label>${sel('skin', [['', '해당없음'], ['1', '구분1 (H314)'], ['2', '구분2 (H315)']], k.skin)}</div>
      <div class="c2"><label>눈 손상성/자극성</label>${sel('eye', [['', '해당없음'], ['1', '구분1 (H318)'], ['2', '구분2 (H319)']], k.eye)}</div>
      <div class="c2"><label>피부 과민성</label>${sel('sens', [['', '해당없음'], ['1', '구분1 (H317)']], k.sens ? '1' : '')}</div>
      <div class="c2"><label>수생 급성 구분1 M 인자</label>${inp('acute', k.acute, '해당 없으면 비움 (보통 1)')}</div>
      <div class="c2"><label>수생 만성</label>${sel('chronic', [['', '해당없음'], ['1', '구분1 (H410)'], ['2', '구분2 (H411)'], ['3', '구분3 (H412)']], k.chronic)}</div>
      <div class="c2"><label>만성 구분1 M 인자</label>${inp('chronicM', k.chronicM, '보통 1')}</div>
      <div class="c2"><label>발암성 구분2</label>${sel('carc', [['', '해당없음'], ['1', '해당 (H351)']], k.carc ? '1' : '')}</div>
      <div class="c2"><label>산화성</label>${sel('ox', [['', '해당없음'], ['1', '산화성 있음(확인 표시)']], k.ox ? '1' : '')}</div>
      <div class="c2"><label>노출기준 (8번)</label>${inp('twa', d.twa, '예: TWA 1 mg/m³')}</div>
      <div class="c2"><label>인화점 °C (액체)</label>${inp('fp', d.fp)}</div><div class="c2"><label>끓는점 °C</label>${inp('bp', d.bp)}</div><div class="c2"><label>녹는점 °C</label>${inp('mp', d.mp)}</div>
      <div class="c2"><label>UN 번호 (단독일 때)</label>${inp('un', d.un)}</div><div class="c2"><label>운송 등급</label>${inp('unClass', d.unClass)}</div><div class="c2"><label>용기등급</label>${inp('pg', d.pg)}</div>
      <div class="c2"><label>산안법 (15번)</label>${inp('l산안법', L.산안법, '예: 해당없음')}</div><div class="c2"><label>화관법 (15번)</label>${inp('l화관법', L.화관법, '예: 해당없음')}</div><div class="c2"><label>화평법 (15번)</label>${inp('l화평법', L.화평법 || '기존화학물질')}</div>
      <div class="c6"><label>기타 주의(2번 기타·확인 표시)</label>${inp('note', d.note)}</div></div>`;
  $('dictMsg').textContent = ''; $('dictDel').style.visibility = r.id ? '' : 'hidden'; openModal('dictBox');
};
window.dictSave = () => busy(async () => {
  const g = n => ($('dc_' + n).value || '').trim(), num = n => g(n) === '' ? undefined : +g(n);
  const r = Object.assign({}, rows('성분사전').find(x => x.id === S.dictCtx.id) || {}, { 이름: g('이름'), 국문명: g('국문명'), 이명: g('이명'), CAS: g('CAS'), 출처: g('출처') });
  if (!r['이름'] || !r['CAS']) { flash('dictMsg', '이름과 CAS는 꼭 넣어 주세요.', false); return; }
  // 화면에 없는 값(마취작용·흡인·증기압 등)은 원래 자료 그대로 두고, 화면의 칸만 바꿈
  const base = JSON.parse(JSON.stringify(S.dictCtx.base || {})), fc = { ate: num('ate'), ateDerm: num('ateDerm'), skin: num('skin'), eye: num('eye'), sens: g('sens') === '1' || undefined, acute: num('acute'), chronic: num('chronic'), chronicM: num('chronicM'), carc: g('carc') === '1' || undefined, ox: g('ox') === '1' || undefined };
  const cls = Object.assign({}, base.cls || {}); Object.keys(fc).forEach(k => { if (fc[k] === undefined) delete cls[k]; else cls[k] = fc[k]; });
  const fd = { liquid: g('liquid') === '1', ld50: g('ld50'), twa: g('twa'), fp: num('fp'), bp: num('bp'), mp: num('mp'), un: g('un'), unClass: g('unClass'), pg: g('pg'), note: g('note') };
  const d = Object.assign(base, { cls, law: Object.assign({}, base.law || {}, { 산안법: g('l산안법'), 화관법: g('l화관법'), 화평법: g('l화평법') }) });
  Object.keys(fd).forEach(k => { if (fd[k] === undefined || fd[k] === '') delete d[k]; else d[k] = fd[k]; });
  r['자료'] = JSON.stringify(d);
  try { await save('성분사전', r); Docs.setDict(rows('성분사전')); closeModal('dictBox'); toast('저장됨');
    const c = S.dictCtx; if (c.ctId && CT[c.ctId]) { ctDraw(c.ctId); if (CT[c.ctId].onChange) CT[c.ctId].onChange(); }
    if (S.view === 'settings') renderSettings(); }
  catch (e) { flash('dictMsg', '저장하지 못했습니다: ' + errMsg(e), false); }
}, '저장 중…');
window.dictDel = () => busy(async () => { if (!confirm('이 성분을 사전에서 지울까요?')) return; await remove('성분사전', S.dictCtx.id); Docs.setDict(rows('성분사전')); closeModal('dictBox'); toast('삭제됨'); renderSettings(); }, '삭제 중…');
window.dictCopyBase = cas => { S.dictCopy = cas; dictOpen(); };
function renderDict() {
  Docs.setDict(rows('성분사전'));
  const mine = rows('성분사전'), mineCas = new Set(mine.map(r => String(r['CAS'] || '').trim())), base = [...Docs.BASE_COMPS, ...Docs.SOLV_ORDER.map(k => Docs.SOLV[k])], baseCas = new Set(base.map(b => b.cas));
  const hTxt = d => { const h = Docs.hOf(d); return h.length ? h.join(' · ') : '분류 해당없음'; };
  const L = [...mine.map(r => { let d = {}; try { d = JSON.parse(r['자료'] || '{}'); } catch (e) {} return { kind: baseCas.has(String(r['CAS'] || '').trim()) ? '기본 → 고침' : '직접 추가', name: r['이름'], syn: r['이명'], cas: r['CAS'], src: r['출처'], d: Object.assign({ name: r['이름'] }, d), btn: `dictOpen('${r.id}')` }; }),
    ...base.filter(b => !mineCas.has(b.cas)).map(b => ({ kind: b.key ? '기본 (용매)' : '기본', name: b.name, syn: b.syn, cas: b.cas, src: b.src || (b.key ? '용매 (공급사 MSDS·EU CLP)' : ''), d: b, btn: `dictCopyBase('${b.cas}')` }))]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  $('setBody').innerHTML = `<div class="box"><h3>성분 사전 <span class="hint" style="font-weight:400">${L.length}개</span><span class="sp"></span><input class="in" id="dictQ" placeholder="이름·CAS·H 코드 검색" style="width:240px" value="${esc(S.dictQ || '')}" oninput="S.dictQ=this.value;dictFilter()"><button class="primary sm" onclick="dictOpen()">+ 성분 추가</button></h3>
    <p class="hint" style="margin:0 0 10px">MSDS 성분 표에 CAS를 넣으면 여기 자료로 유해성을 계산합니다. 기본으로 들어 있는 것도 [수정]하면 고친 내용을 씁니다.</p>
    <table class="tbl" id="dictTbl"><tr><th>이름</th><th>CAS</th><th>분류 (H 코드)</th><th>출처</th><th>구분</th><th></th></tr>` +
    L.map(x => { const h = hTxt(x.d); return `<tr data-q="${esc([x.name, x.syn, x.cas, h, x.kind].join(' ').toLowerCase())}"><td><b>${esc(x.name)}</b> <span class="hint">${esc(x.syn || '')}</span></td><td>${esc(x.cas)}</td><td>${esc(h)}</td><td class="hint">${esc(x.src || '')}</td><td><span class="b ${x.kind === '직접 추가' ? 'info' : x.kind.startsWith('기본 →') ? 'wait' : 'etc'}">${esc(x.kind)}</span></td><td style="text-align:right"><button class="sm" onclick="${x.btn}">수정</button></td></tr>`; }).join('') +
    `</table><p class="empty" id="dictNone" style="display:none">검색 결과 없음</p></div>`;
  dictFilter();
}
window.dictFilter = () => {
  const q = String(S.dictQ || '').trim().toLowerCase(); let n = 0;
  document.querySelectorAll('#dictTbl tr[data-q]').forEach(r => { const on = !q || r.dataset.q.includes(q); r.style.display = on ? '' : 'none'; if (on) n++; });
  if ($('dictNone')) $('dictNone').style.display = q && !n ? '' : 'none';
};

// ---------- 설정 ----------
const SET_TABS = ['기타', '성분 사전', '단량체 사전', '여러 개 등록', '업데이트'];
const ETC_FIELDS = [['자진확인서수량', '자진확인서 취급최대수량(톤)', 'c2'], ['처리업체', '사후처리 처리업체', 'c2'], ['운반업체', '운반·운송업체', 'c2'], ['이송방법', '이동·이송 방법', 'c2'],
  ['주의_취급', '취급 시 주의사항 (연구개발용 확인서)', 'c6', 1], ['주의_저장', '저장·보관 방법', 'c6', 1], ['주의_화재', '폭발·화재·누출 시 대처방법', 'c6', 1]];
window.setSetTab = t => { S.setTab = t; renderSettings(); };
function renderSettings() {
  $('setTabs').innerHTML = SET_TABS.map(t => `<button class="tab ${S.setTab === t ? 'on' : ''}" onclick="setSetTab('${t}')">${t}</button>`).join('');
  const body = $('setBody');
  if (S.setTab === '업데이트') { renderUpdate(); return; }
  if (S.setTab === '여러 개 등록') { renderBulk(); return; }
  if (S.setTab === '성분 사전') { renderDict(); return; }
  if (S.setTab === '기타') {
    body.innerHTML = `<div class="box" style="max-width:900px"><h3>서류 공통 값<span class="sp"></span><span class="msg" id="setMsg"></span><button class="primary" onclick="saveEtc()">저장</button></h3>
      <div class="f">${ETC_FIELDS.map(([id, lab, cl, area]) => `<div class="${cl}"><label>${lab}</label>${area ? `<textarea class="plain" id="set_${id}">${esc(setting(id, ''))}</textarea>` : `<input id="set_${id}" value="${esc(setting(id, ''))}">`}</div>`).join('')}</div></div>`;
    body.insertAdjacentHTML('beforeend', `<div class="box" style="max-width:900px"><h3>구조 배치 정리<span class="sp"></span><span class="msg" id="tidyMsg"></span><button onclick="tidyAll()">모든 구조 정리</button></h3>
      <p class="hint" style="margin:0">구조가 찌그러져 보이는 샘플·단량체의 원자 배치를 켐드로우처럼 다시 잡습니다. 구조(연결)는 바뀌지 않고 그림 배치만 바뀝니다.</p></div>`);
  } else {
    const cols = ['약어', '물질명', 'CAS'], L = [...rows('단량체')].sort((a, b) => String(a['약어'] || '').localeCompare(String(b['약어'] || '')));
    const noStr = L.filter(r => !r.idcode && r['CAS']).length;
    const tr = r => { const mol = r.idcode && S.OCL ? molFrom(r.idcode, r['좌표']) : null; return `<tr data-id="${r.id || ''}" ${r.id ? `data-q="${esc([r['약어'], r['물질명'], r['CAS']].join(' ').toLowerCase())}"` : 'class="newrow"'}><td style="width:90px">${r.id ? `<div class="mrow" style="display:block;margin:0"><div class="thumb" onclick="openMono('dict','${r.id}')">${mol ? svgOf(mol, 86, 58) : '구조 그리기'}</div></div>` : '<span class="b info">새로 추가</span>'}</td>${cols.map(c => `<td><input data-c="${c}" value="${esc(r[c] || '')}" placeholder="${r.id ? '' : c}"></td>`).join('')}
      <td style="white-space:nowrap;text-align:right"><button class="sm ${r.id ? '' : 'primary'}" onclick="setSave('단량체',this)">${r.id ? '저장' : '추가'}</button>${r.id ? ` <button class="sm danger" onclick="setDel('단량체','${r.id}')">삭제</button>` : ''}</td></tr>`; };
    body.innerHTML = `<div class="box"><h3>단량체 사전 <span class="hint" style="font-weight:400">${L.length}개</span><span class="sp"></span><input class="in" id="monoQ" placeholder="약어·물질명·CAS 검색" style="width:240px" value="${esc(S.monoQ || '')}" oninput="S.monoQ=this.value;monoFilter()"><button onclick="casFill()" title="구조가 빈 단량체를 CAS로 PubChem에서 찾아 채웁니다">CAS로 구조 채우기${noStr ? ` (${noStr})` : ''}</button></h3>
      <table class="tbl" id="monoTbl"><tr><th>구조</th>${cols.map(c => `<th>${c}</th>`).join('')}<th></th></tr>${tr({})}${L.map(tr).join('')}</table><p class="empty" id="monoNone" style="display:none">검색 결과 없음</p></div>`;
    monoFilter();
  }
}
window.tidyAll = async () => {
  if (!confirm('모든 샘플과 단량체의 구조 배치를 다시 잡을까요? (구조 자체는 그대로)')) return;
  const jobs = [...S.samples.filter(s => s.idcode).map(s => ['샘플', s]), ...rows('단량체').filter(r => r.idcode).map(r => ['단량체', r])], out = { 샘플: [], 단량체: [] };
  let n = 0;
  for (const [t, r] of jobs) {
    n++; if (n % 10 === 0) { flash('tidyMsg', `정리 중… ${n}/${jobs.length}`); await new Promise(ok => setTimeout(ok)); }
    try { const m0 = molFrom(r.idcode, r['좌표']); if (!m0) continue; const m = await tidyMol(m0), ic = m.getIDCodeAndCoordinates();
      if (ic.idCode === r.idcode && ic.coordinates !== r['좌표']) out[t].push({ id: r.id, 좌표: ic.coordinates }); } catch (e) { console.warn(r.id, e); }
  }
  try {
    // 샘플: 원래 있던 '여러 개 등록' 통로로 50개씩, 단량체: 한 줄씩
    const sm = out['샘플'].map(x => ({ x, s: S.samples.find(y => y.id === x.id) })).filter(o => o.s && o.s['관리번호']);
    for (let i = 0; i < sm.length; i += 50) {
      flash('tidyMsg', `저장 중… ${Math.min(i + 50, sm.length)}/${sm.length}`);
      await call('runBatchUi', S.pw, sm.slice(i, i + 50).map(o => ({ type: 'updateSample', 관리번호: o.s['관리번호'], data: { 좌표: o.x.좌표 } })), true);
      sm.slice(i, i + 50).forEach(o => { o.s['좌표'] = o.x.좌표; });
    }
    for (const x of out['단량체']) { const r = rows('단량체').find(y => y.id === x.id); if (r) await save('단량체', Object.assign({}, r, { 좌표: x.좌표 })); }
    S.mols = {}; S.dmols = {}; flash('tidyMsg', `✓ ${sm.length + out['단량체'].length}개 정리함`); render();
  } catch (e) { flash('tidyMsg', '저장하지 못했습니다: ' + errMsg(e), false); }
};
window.monoFilter = () => {
  const q = String(S.monoQ || '').trim().toLowerCase(); let n = 0;
  document.querySelectorAll('#monoTbl tr[data-q]').forEach(r => { const on = !q || r.dataset.q.includes(q); r.style.display = on ? '' : 'none'; if (on) n++; });
  if ($('monoNone')) $('monoNone').style.display = q && !n ? '' : 'none';
};
const abbrKey = t => String(t || '').toLowerCase().replace(/[\s\-_]/g, '');
window.setSave = (t, btn) => busy(async () => {
  const tr = btn.closest('tr'), o = Object.assign({}, rows(t).find(r => r.id === tr.dataset.id) || {});
  tr.querySelectorAll('input[data-c]').forEach(i => o[i.dataset.c] = i.value.trim());
  if (!o['약어']) { alert('약어를 입력하세요.'); return; }
  if (t === '단량체') {
    const others = rows('단량체').filter(r => r.id !== o.id), same = others.find(r => abbrKey(r['약어']) === abbrKey(o['약어']));
    if (same) { alert(`${same['약어']}는 이미 있습니다${same['물질명'] ? ` (${same['물질명']})` : ''}. 같은 단량체면 그 줄을 고쳐 주세요.`); return; }
    const sc = o['CAS'] && others.find(r => r['CAS'] && r['CAS'].trim() === o['CAS']);
    if (sc && !confirm(`같은 CAS ${o['CAS']}가 ${sc['약어']}로 이미 있습니다. 그래도 저장할까요?`)) return;
  }
  try { await save(t, o); toast('저장됨'); renderSettings(); } catch (e) { alert('저장하지 못했습니다: ' + ((e && e.message) || e)); }
}, '저장 중…');
// 단량체 사전: 구조가 빈 것을 CAS로 PubChem에서 찾아 채우기 (미리보기 후 저장)
window.casFill = () => busy(async () => {
  const L = rows('단량체').filter(r => !r.idcode && /^\d{2,7}-\d{2}-\d$/.test(String(r['CAS'] || '').trim()));
  if (!L.length) { toast('CAS가 있고 구조가 빈 단량체가 없습니다.'); return; }
  await loadOCL(); const found = [], miss = [];
  for (let i = 0; i < L.length; i += 10) {
    toast(`PubChem에서 찾는 중… ${Math.min(i + 10, L.length)}/${L.length}`);
    const part = L.slice(i, i + 10), res = await call('pubchemByCas', part.map(r => r['CAS'].trim()));
    for (let k = 0; k < part.length; k++) {
      const r = part[k], x = res[k] || {};
      if (!x.smiles) { miss.push(r); continue; }
      try { let m = S.OCL.Molecule.fromSmiles(x.smiles); try { m = await tidyMol(m); } catch (e) {} const ic = m.getIDCodeAndCoordinates(); found.push({ r, m, idcode: ic.idCode, coords: ic.coordinates, name: x.name || '' }); } catch (e) { miss.push(r); }
    }
  }
  S.casFound = found;
  $('cfBody').innerHTML = (found.length ? `<p class="hint" style="margin:0 0 10px">찾은 구조를 확인하고, 맞는 것만 체크된 채로 [저장]하세요.</p><table class="tbl"><tr><th></th><th>구조</th><th>약어</th><th>물질명 / PubChem 이름</th><th>CAS</th></tr>` +
    found.map((f, i) => `<tr><td><input type="checkbox" data-cf="${i}" checked></td><td style="width:110px">${svgOf(f.m, 104, 70)}</td><td><b>${esc(f.r['약어'])}</b></td><td>${esc(f.r['물질명'] || '')}${f.name && f.name.toLowerCase() !== String(f.r['물질명'] || '').toLowerCase() ? `<br><span class="hint">${esc(f.name)}</span>` : ''}</td><td>${esc(f.r['CAS'])}</td></tr>`).join('') + '</table>' : '<p class="empty">찾은 구조가 없습니다.</p>') +
    (miss.length ? `<div class="warn" style="margin-top:12px">못 찾음 ${miss.length}개: ${miss.map(r => `${esc(r['약어'])} (${esc(r['CAS'])})`).join(', ')}<br>구조를 직접 그려 주세요.</div>` : '');
  $('cfSave').style.display = found.length ? '' : 'none'; openModal('casBox');
}, '찾는 중…');
window.casFillSave = () => busy(async () => {
  const pick = [...document.querySelectorAll('#cfBody input[data-cf]:checked')].map(i => S.casFound[+i.dataset.cf]);
  try { for (const f of pick) { const r = await save('단량체', Object.assign({}, f.r, { idcode: f.idcode, 좌표: f.coords })); delete S.dmols[r.id]; }
    closeModal('casBox'); toast(`${pick.length}개 구조 저장됨`); renderSettings(); }
  catch (e) { toast('저장하지 못했습니다: ' + errMsg(e), false); }
});
window.setDel = (t, id) => busy(async () => { if (!confirm('지울까요?')) return; await remove(t, id); toast('삭제됨'); renderSettings(); }, '삭제 중…');
window.saveEtc = () => busy(async () => {
  try { for (const [id] of ETC_FIELDS) { const v = $('set_' + id).value.trim(); if (v !== setting(id, '')) await save('설정', { id, 값: v }); } flash('setMsg', ''); toast('저장됨'); }
  catch (e) { flash('setMsg', '저장하지 못했습니다: ' + errMsg(e), false); }
}, '저장 중…');

// ---------- 여러 개 한 번에 등록 (Claude 입력과 같은 기능) ----------
const BULK_COLS = ['제품명', 'SMILES', '물질명', '성상', '용도', '고객사', '고객사담당자', '관리회사', '비고'];
function renderBulk() {
  $('setBody').innerHTML = `<div class="box bulk" style="max-width:1000px"><h3>여러 개 한 번에 등록<span class="sp"></span><span class="msg" id="bkMsg"></span></h3>
      <textarea id="bkIn" placeholder="한 줄에 한 개 · 칸은 | 로 나눔 (엑셀에서 복사하면 탭도 됨)&#10;제품명 | SMILES | 물질명 | 성상 | 용도 | 고객사 | 담당자 | 관리회사 | 비고&#10;DA-02 | O=Cc1ccccc1Oc1... | 2,2'-... | 흰색 파우더 | ... | 동우화인켐 | 남궁진웅 | 한인 |&#10;제품명 자리에 관리번호(예: 한인-218)를 쓰면 그 샘플의 채운 칸만 고침">${esc(S.bulkText || '')}</textarea>
      <div class="row" style="margin:10px 0 0;gap:8px"><button onclick="bulkRun(false)">미리보기</button><button class="primary" id="bkGo" onclick="bulkRun(true)" ${S.bulkReady ? '' : 'disabled'}>등록</button></div>
      <div id="bkOut"></div></div>
    <div class="box" style="max-width:1000px"><h3>Claude 입력 접속코드<span class="sp"></span><span class="msg" id="ccMsg"></span></h3>
      <div class="row" style="margin:0;gap:8px"><input id="ccIn" type="text" placeholder="새 접속코드 (4자 이상)" style="height:34px;border:1px solid #cfd6de;border-radius:8px;padding:0 10px;width:240px"><button onclick="saveCC()">저장</button><span class="muted" id="ccState"></span></div></div>`;
  call('hasClaudeCode', S.pw).then(v => { const e = $('ccState'); if (e) e.textContent = v ? '정해져 있음' : '아직 없음'; }).catch(() => {});
}
window.saveCC = async () => { try { flash('ccMsg', await call('setClaudeCode', S.pw, $('ccIn').value)); $('ccIn').value = ''; renderBulk(); } catch (e) { flash('ccMsg', errMsg(e), false); } };
function bulkOps(text) {
  const ops = [], bad = [];
  text.split(/\r?\n/).forEach((ln, i) => {
    if (!ln.trim()) return;
    const c = (ln.includes('\t') ? ln.split('\t') : ln.split('|')).map(x => x.trim()), o = {};
    BULK_COLS.forEach((k, j) => { if (c[j]) o[k] = c[j]; });
    const exist = o['제품명'] && S.samples.find(x => x['관리번호'] === o['제품명']);
    const nm = (o['제품명'] || '').match(/^(.+)-\d+$/);
    if (!exist && nm && [...coNames(), '기타'].includes(nm[1])) { bad.push(`${i + 1}줄: 관리번호 ${o['제품명']}인 샘플이 없음`); return; }
    let mol = null;
    if (o.SMILES) { try { mol = S.OCL.Molecule.fromSmiles(o.SMILES); if (!mol.getAllAtoms()) throw 0; } catch (e) { bad.push(`${i + 1}줄: SMILES를 읽지 못함`); return; } }
    const d = Object.assign({}, o); delete d.SMILES;
    if (mol) { const info = chemInfo(mol); Object.assign(d, { idcode: info.idcode, 좌표: info.coords, 검색값: info.index, 분자식: info.formula, 분자량: info.mw });
      if (!exist) d['종류'] = mol.getFragments().length > 1 && /[+-]/.test(o.SMILES) ? '이온성물질' : '단분자'; }
    if (exist) { delete d['제품명']; ops.push({ type: 'updateSample', 관리번호: exist['관리번호'], data: d, _mol: mol }); }
    else ops.push({ type: 'addSample', data: d, _mol: mol });
  });
  return { ops, bad };
}
window.bulkRun = async apply => {
  S.bulkText = $('bkIn').value;
  if (!S.OCL) { flash('bkMsg', '구조 라이브러리를 불러오는 중입니다. 잠시 뒤 다시 누르세요.', false); return; }
  const { ops, bad } = bulkOps(S.bulkText);
  if (bad.length) { $('bkOut').innerHTML = `<div class="warn">${bad.map(esc).join('<br>')}</div>`; S.bulkReady = false; $('bkGo').disabled = true; return; }
  if (!ops.length) { flash('bkMsg', '입력한 줄이 없습니다.', false); return; }
  if (apply && !confirm(`${ops.length}건을 저장할까요?`)) return;
  const btn = apply ? $('bkGo') : null; if (btn) { btn.disabled = true; btn.textContent = '저장 중…'; }
  try {
    const res = await call('runBatchUi', S.pw, ops.map(o => { const c = Object.assign({}, o); delete c._mol; return c; }), apply);
    $('bkOut').innerHTML = `<table><tr><th></th><th>관리번호</th><th>제품명</th><th>구조</th><th>내용</th></tr>` + res.results.map((r, i) => {
      const o = ops[i], m = o._mol, ch = r['바뀜'] ? Object.keys(r['바뀜']).filter(k => !['idcode', '좌표', '검색값'].includes(k)).map(k => `${k}: ${esc(String(r['바뀜'][k]['후']).slice(0, 60))}`).join('<br>') || (Object.keys(r['바뀜']).length ? '구조' : '바뀐 것 없음') : '';
      return `<tr><td>${r.ok ? (o.type === 'addSample' ? '새로' : '수정') : '<span class="b bad">오류</span>'}</td><td>${esc(r['관리번호'] || '')}</td><td>${esc(r['제품명'] || '')}</td>
        <td class="svg">${m ? svgOf(m, 150, 90) : ''}</td><td>${r.ok ? [o.data['분자식'] ? esc(o.data['분자식'] + ' · ' + o.data['분자량']) : '', ch, r.warn ? '<span class="wmini">' + esc(r.warn) + '</span>' : ''].filter(Boolean).join('<br>') : esc(r.error)}</td></tr>`;
    }).join('') + '</table>';
    if (apply) {
      S.data['샘플'] = res.samples; S.data['출고'] = res.ships; S.samples = rows('샘플'); S.mols = {}; S.bulkReady = false; S.bulkText = '';
      flash('bkMsg', `✓ ${res.results.filter(r => r.ok).length}건 저장됨`); $('bkIn').value = ''; render();
    } else { S.bulkReady = res.results.every(r => r.ok); $('bkGo').disabled = !S.bulkReady; flash('bkMsg', S.bulkReady ? '확인 후 등록을 누르세요' : '오류가 있는 줄을 고쳐 주세요', S.bulkReady); }
  } catch (e) { flash('bkMsg', errMsg(e), false); }
  finally { if (btn) btn.textContent = '등록'; }
};
$('setBody') && document.addEventListener('input', e => { if (e.target && e.target.id === 'bkIn') { S.bulkReady = false; const b = $('bkGo'); if (b) b.disabled = true; } });

// ---------- 업데이트 ----------
function renderUpdate() {
  const u = S.upd || {};
  $('setBody').innerHTML = `<div class="box" style="max-width:720px"><h3>업데이트</h3>
    <div class="upkv">
      <div class="k">현재 버전</div><div><b>${esc(u.current || $('foot').textContent.split(' ·')[0])}</b></div>
      <div class="k">저장소</div><div class="row" style="margin:0;gap:6px"><input id="upRepo" style="flex:1" placeholder="jichan-family/hanin-sample" value="${esc(u.repo || '')}"><button class="sm" onclick="saveUpRepo()">저장</button></div>
      ${u.latest ? `<div class="k">최신 버전</div><div><b>${esc(u.latest)}</b>${u.date ? ` · ${esc(u.date)}` : ''}</div>${u.notes ? `<div class="k">바뀐 점</div><div>${esc(u.notes)}</div>` : ''}` : ''}
    </div>
    <div class="row" style="margin:14px 0 0;gap:8px"><button onclick="checkUpd(true)">새 버전 확인</button>
      ${u.newer ? `<button class="primary" id="upGo" onclick="runUpd()">${esc(u.latest)}(으)로 업데이트</button>` : (u.latest ? '<span class="muted">최신 버전입니다</span>' : '')}
      <span class="msg" id="upMsg"></span></div></div>`;
}
window.saveUpRepo = async () => {
  try { const r = await call('setUpdateRepo', S.pw, $('upRepo').value); S.upd = Object.assign(S.upd || {}, { repo: r }); await checkUpd(true); }
  catch (e) { flash('upMsg', errMsg(e), false); }
};
window.checkUpd = async (show) => {
  try {
    S.upd = await call('checkUpdate', S.pw);
    const nav = document.querySelector('.nav[data-v="settings"]'); if (nav) nav.classList.toggle('hasnew', !!S.upd.newer);
    if (show && S.view === 'settings' && S.setTab === '업데이트') renderUpdate();
  } catch (e) { if (show) { renderUpdate(); flash('upMsg', errMsg(e), false); } }
};
window.runUpd = async () => {
  if (!confirm(`${S.upd.latest}(으)로 업데이트할까요?\n코드를 바꾸고 배포까지 새 버전으로 합니다.`)) return;
  const b = $('upGo'); b.disabled = true; b.textContent = '업데이트 중… (1분쯤)';
  try {
    const r = await call('applyUpdate', S.pw);
    $('setBody').innerHTML = `<div class="box" style="max-width:720px"><h3>업데이트 완료</h3><p>${esc(r.version)}(으)로 바꿨습니다. (${esc(r.files.join(', '))})</p>
      <div class="row" style="margin:12px 0 0"><a class="abtn" href="${esc(r.url)}" target="_top">새로 열기</a></div></div>`;
  } catch (e) { b.disabled = false; b.textContent = '다시 시도'; flash('upMsg', errMsg(e), false); }
};

// ---------- 거래처 (고객사 · 출고사) ----------
const CUST_F = [['회사명', 'c3'], ['영문명', 'c3', '자진확인서 To.'], ['주소', 'c6', '연구개발용 확인서 수령업체 주소'], ['담당자', 'c6', '쉼표로 여러 명 · 출고 등록 때 목록으로 나옴'],
  ['안전관리자', 'c2', '연구개발용 확인서'], ['안전관리자직위', 'c2', '직위'], ['안전관리자연락처', 'c2', '연락처'], ['보관창고', 'c6', '연구개발용 확인서 보관창고(장소)'], ['메모', 'c6']];
const CO_F = [['이름', 'c2', '목록 탭·딱지에 쓰는 짧은 이름'], ['회사명', 'c2', '서류에 들어가는 정식 이름'], ['대표', 'c2', '서명 줄'], ['사업자번호', 'c2', 'CAS 미부여 확인서'], ['전화', 'c2', 'MSDS 긴급전화'], ['팩스', 'c2'],
  ['주소', 'c6', 'CAS 미부여 확인서·MSDS'], ['부서', 'c2', 'CAS 미부여 확인서 담당'], ['담당자', 'c2'], ['이메일', 'c2'], ['안전관리자', 'c2', '연구개발용 확인서'], ['안전관리자직위', 'c2', '직위'], ['안전관리자연락처', 'c2', '연락처']];
window.setPtTab = t => { S.ptTab = t; renderPartners(); };
function custStats(n) { const sh = rows('출고').filter(x => x['고객사'] === n); return { n: sh.length, last: sh.map(x => x['요청일'] || '').sort().pop() || '', ex: rows('신고면제').filter(e => (e['기관'] || '동우화인켐') === n).length }; }
function renderPartners() {
  $('ptTabs').innerHTML = ['고객사', '출고사'].map(t => `<button class="tab ${S.ptTab === t ? 'on' : ''}" onclick="setPtTab('${t}')">${t}</button>`).join('');
  $('ptAdd').textContent = S.ptTab === '고객사' ? '+ 고객사 추가' : '+ 출고사 추가';
  if (S.ptTab === '고객사') {
    
    const known = rows('고객사'), extra = [...new Set(rows('출고').map(x => x['고객사']).filter(n => n && !custOf(n)))];
    $('ptBody').innerHTML = '<div class="pgrid">' + known.map(c => { const st = custStats(c['회사명']), miss = ['주소', '안전관리자', '보관창고'].filter(k => !c[k]);
      return `<div class="pcard" onclick="openPartner('고객사','${c.id}')"><h4>${esc(c['회사명'])}</h4><div class="sub">${esc(c['영문명'] || '')}</div>
        <div class="badges">${list(c['필요서류']).map(d => `<span class="b info">${DOC_LABEL[d] || d}</span>`).join('') || '<span class="b etc">필요 서류 미지정</span>'}</div>
        <div class="sub">출고 ${st.n}건${st.last ? ' · 최근 ' + esc(st.last) : ''} · 신고면제 ${st.ex}건</div>
        <div class="badges">${miss.map(k => `<span class="miss">${k} 없음</span>`).join('')}</div></div>`; }).join('') +
      extra.map(n => `<div class="pcard" style="border-style:dashed"><h4>${esc(n)}</h4><div class="sub">출고 기록에만 있는 이름 (일회성)</div><div class="sub">출고 ${custStats(n).n}건</div>
        <div><button class="sm edit-only" onclick="event.stopPropagation();addCustFrom('${esc(n)}')">고객사로 추가</button></div></div>`).join('') + '</div>';
  } else {
    
    const etc = etcNames();
    $('ptBody').innerHTML = '<div class="pgrid">' + coRows().map(c => { const n = S.samples.filter(s => s['관리회사'] === c['이름']).length, sh = rows('출고').filter(x => x['명의'] === c['이름']).length, d = list(c['작성서류']);
      const miss = ['회사명', '주소'].concat(d.includes('CAS미부여확인서') ? ['사업자번호'] : []).concat(d.includes('연구개발용확인서') ? ['대표', '안전관리자'] : []).filter(k => !c[k]);
      return `<div class="pcard" onclick="openPartner('출고사','${c.id}')"><h4>${coBadge(c['이름'])} ${esc(c['회사명'] || '')}</h4>
        <div class="sub">관리 샘플 ${n}건 · 출고 ${sh}건 · MSDS ${esc(c['MSDS양식'] || '한인')} 양식</div>
        <div class="badges">${d.map(x => `<span class="b info">${DOC_LABEL[x] || x}</span>`).join('') || '<span class="b etc">작성 서류 없음 (기록만)</span>'}</div>
        <div class="badges">${miss.map(k => `<span class="miss">${k} 없음</span>`).join('')}</div></div>`; }).join('') + '</div>' +
      (etc.length ? `<h3 style="margin:22px 0 10px;font-size:16px">기타 출고사</h3><div class="pgrid">` + etc.map(nm => { const n = S.samples.filter(s => s['관리회사'] === '기타' && s['기타회사'] === nm).length, sh = rows('출고').filter(x => x['명의'] === nm).length;
        return `<div class="pcard" style="border-style:dashed;cursor:default"><h4>${esc(nm)}</h4><div class="sub">기타로 관리 중 · 샘플 ${n}건 · 출고 ${sh}건</div>
          <div><button class="sm edit-only" onclick="promote('${esc(nm)}')">정식 출고사로 등록</button></div></div>`; }).join('') + '</div>' : '');
  }
}
window.addCustFrom = async n => { try { await save('고객사', { 회사명: n, 필요서류: 'MSDS' }); renderPartners(); } catch (e) { alert('저장하지 못했습니다: ' + ((e && e.message) || e)); } };
window.promote = async n => {
  if (!confirm(`"${n}"을(를) 정식 출고사로 등록할까요?\n기존 샘플의 관리번호(기타-n)는 그대로 두고, 앞으로 새 샘플은 "${n}-1"부터 번호가 붙습니다.`)) return;
  try { const r = await call('promoteCompany', S.pw, n); upsert('출고사', r.company); r.samples.forEach(s => upsert('샘플', s)); renderPartners(); render(); } catch (e) { alert('등록하지 못했습니다: ' + ((e && e.message) || e)); }
};
window.openPartner = (kind, id) => {
  kind = kind || S.ptTab; const tbl = kind === '고객사' ? '고객사' : '출고사';
  const r = id ? rows(tbl).find(x => x.id === id) : (kind === '출고사' ? { 정식: 'Y', 색: '#8250df', MSDS양식: '한인', 작성서류: 'MSDS' } : { 필요서류: 'MSDS' });
  S.pt = { kind, tbl, r: Object.assign({}, r) }; const ro = S.pw ? '' : 'disabled';
  $('ptTitle').textContent = id ? `${kind} — ${r['회사명'] || r['이름']}` : `${kind} 추가`;
  const F = kind === '고객사' ? CUST_F : CO_F;
  let html = `<div class="f">${F.map(([k, cl, use]) => `<div class="${cl}"><label title="${esc(use || '')}">${k === '안전관리자직위' ? '직위' : k === '안전관리자연락처' ? '연락처' : k}</label><input data-k="${k}" value="${esc(r[k] || '')}" ${ro} ${kind === '출고사' && k === '이름' && id ? 'readonly' : ''}></div>`).join('')}</div>`;
  if (kind === '고객사') {
    html += `<div class="box" style="margin-top:14px"><h3>기본 필요 서류</h3><div class="chk">${SUB_DOCS.map(d => `<label><input type="checkbox" data-need="${d}" ${list(r['필요서류']).includes(d) ? 'checked' : ''} ${ro}>${DOC_LABEL[d]}</label>`).join('')}</div></div>`;
    if (id) { const n = r['회사명'], sh = rows('출고').filter(x => x['고객사'] === n), ex = rows('신고면제').filter(e => (e['기관'] || '동우화인켐') === n);
      html += `<div class="box"><h3>거래 이력</h3>${sh.length || ex.length ? `<table class="tbl"><tr><th>구분</th><th>샘플</th><th>날짜</th><th>내용</th></tr>` +
        sh.map(x => { const s = S.samples.find(y => y.id === x['샘플id']) || {}; return `<tr style="cursor:pointer" onclick="closeAllModals();showDetail('${x['샘플id']}',false,'info')"><td>출고</td><td>${esc(s['관리번호'] || '')} ${esc(s['제품명'] || x['제품명'])}</td><td>${esc(x['요청일'] || '')}</td><td>${coBadge(x['명의'])} ${esc(formText(parseForm(x['제출형태'])))}</td></tr>`; }).join('') +
        ex.map(e => { const s = S.samples.find(y => y.id === e['샘플id']) || {}, st = exState(e); return `<tr style="cursor:pointer" onclick="closeAllModals();showDetail('${e['샘플id']}',false,'ex')"><td>신고면제</td><td>${esc(s['관리번호'] || '')} ${esc(s['제품명'] || e['제품명'])}</td><td>${esc(e['신청일'] || '')}</td><td><span class="b ${st.cls}">${st.txt}</span></td></tr>`; }).join('') + '</table>' : '<p class="empty">아직 없음</p>'}</div>`; }
  } else {
    const d = list(r['작성서류']);
    html += `<div class="box" style="margin-top:14px"><h3 title="체크한 서류만 버튼이 나옵니다">작성 서류</h3>
      <div class="chk" style="margin-bottom:8px"><b style="font-size:13px;min-width:64px">신고면제</b>${EX_DOCS.map(x => `<label><input type="checkbox" data-doc="${x}" ${d.includes(x) ? 'checked' : ''} ${ro}>${DOC_LABEL[x]}</label>`).join('')}</div>
      <div class="chk"><b style="font-size:13px;min-width:64px">제출</b>${SUB_DOCS.map(x => `<label><input type="checkbox" data-doc="${x}" ${d.includes(x) ? 'checked' : ''} ${ro}>${DOC_LABEL[x]}</label>`).join('')}
        <label>MSDS 양식 <select id="pt_msds" ${ro}>${['한인', '엘에스켐'].map(x => `<option value="${x}" ${x === (r['MSDS양식'] || '한인') ? 'selected' : ''}>${coFull(x)}</option>`).join('')}</select></label></div></div>
      <div class="box"><h3>표시·직인</h3><div class="row" style="margin:0;gap:16px;align-items:flex-start">
        <label>딱지 색 <input type="color" id="pt_color" value="${esc(r['색'] || '#8250df')}" ${ro}></label>
        <div><div class="stampbox" id="pt_stamp">${r['직인'] ? `<img src="data:image/png;base64,${r['직인']}">` : (r['이름'] === '한인' ? '<span class="hint" style="text-align:center">기본 직인<br>사용</span>' : '<span class="hint">없음</span>')}</div>
          <div class="row edit-only" style="margin-top:6px"><label class="sm" style="cursor:pointer"><input type="file" accept="image/*" style="display:none" onchange="stampUpload(this)"><span class="b info">직인 그림 올리기</span></label><button class="sm" onclick="S.pt.r['직인']='';$('pt_stamp').innerHTML='<span class=hint>없음</span>'">지우기</button></div></div>
</div></div>`;
  }
  $('ptForm').innerHTML = html; $('ptMsg').textContent = ''; $('ptDel').style.visibility = id ? '' : 'hidden';
  openModal('ptBox');
};
window.stampUpload = inp => {
  // 직인 그림은 원본 그대로(크기·색 그대로). 흰 종이 부분만 투명하게. 너무 크면(약 33만 자 넘으면) 정수배로만 줄임(점 무늬 유지)
  const f = inp.files[0]; if (!f) return; const img = new Image();
  img.onload = () => { let k = 1, b64 = '';
    do { const cv = document.createElement('canvas'); cv.width = Math.round(img.width / k); cv.height = Math.round(img.height / k);
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = k > 1 ? false : true; g.drawImage(img, 0, 0, cv.width, cv.height); const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) { const w = Math.min(p[i], p[i + 1], p[i + 2]); if (w >= 245) p[i + 3] = 0; else if (w >= 215) p[i + 3] = Math.round(p[i + 3] * (245 - w) / 30); }
      g.putImageData(d, 0, 0); b64 = cv.toDataURL('image/png').split(',')[1]; k++; } while (b64.length > 440000 && k < 8);
    S.pt.r['직인'] = b64; $('pt_stamp').innerHTML = `<img src="data:image/png;base64,${b64}">`; URL.revokeObjectURL(img.src); };
  img.src = URL.createObjectURL(f);
};
window.savePartner = () => busy(async () => {
  const { tbl, r } = S.pt; document.querySelectorAll('#ptForm input[data-k]').forEach(i => r[i.dataset.k] = i.value.trim());
  if (tbl === '고객사') { if (!r['회사명']) { flash('ptMsg', '회사명을 입력하세요.', false); return; } r['필요서류'] = [...document.querySelectorAll('#ptForm input[data-need]:checked')].map(i => i.dataset.need).join(','); }
  else { if (!r['이름']) { flash('ptMsg', '이름을 입력하세요.', false); return; }
    if (!r.id && coOf(r['이름'])) { flash('ptMsg', '같은 이름의 출고사가 있습니다.', false); return; }
    r['작성서류'] = [...document.querySelectorAll('#ptForm input[data-doc]:checked')].map(i => i.dataset.doc).join(','); r['MSDS양식'] = $('pt_msds').value; r['색'] = $('pt_color').value; r['정식'] = 'Y';
    if (!r['순서']) r['순서'] = String(coRows().length + 1); }
  try { await save(tbl, r); closeModal('ptBox'); toast('저장됨'); renderPartners(); render(); } catch (e) { flash('ptMsg', '저장하지 못했습니다: ' + errMsg(e), false); }
}, '저장 중…');
window.delPartner = () => busy(async () => {
  const { tbl, r } = S.pt; if (!r.id || !confirm(`${r['회사명'] || r['이름']}을(를) 지울까요? 출고·샘플 기록은 그대로 남습니다.`)) return;
  try { await remove(tbl, r.id); closeModal('ptBox'); toast('삭제됨'); renderPartners(); render(); } catch (e) { flash('ptMsg', '지우지 못했습니다: ' + errMsg(e), false); }
}, '삭제 중…');

// ---------- 시작 ----------
window.render = render; window.renderDetail = renderDetail;
(async function init() {
  restorePw();
  try {
    const d = await call('getAll');
    S.data = d.data; S.samples = rows('샘플'); S.today = d.today;
    $('foot').textContent = `${d.version} · ${d.updated}`; $('foot').title = `최종 수정 ${d.updated} · 최초 제작 ${d.created}`;
    const warn = [];
    if (d.hasTemplates === false) warn.push('서류 양식(Templates)을 찾지 못했습니다. Apps Script에서 <b>Templates를 HTML이 아닌 "스크립트" 파일</b>로 만들고 Templates.gs.txt 내용을 붙여넣은 뒤 새 버전으로 배포하세요.');
    if (!rows('출고사').length) warn.push('출고사 정보가 없습니다. Apps Script에서 <b>setup</b>을 한 번 실행해 주세요.');
    if (warn.length) { const w = $('tplWarn'); w.style.display = ''; w.innerHTML = warn.map(x => '⚠ ' + x).join('<br>'); }
    render();
  } catch (e) { $('status').textContent = '데이터를 불러오지 못했습니다: ' + ((e && e.message) || e); return; }
  try { await loadOCL(); drawCards(); }
  catch (e) { $('status').textContent += ' · 구조 라이브러리를 불러오지 못해 구조 그림과 구조 검색을 쓸 수 없습니다.'; }
})();
