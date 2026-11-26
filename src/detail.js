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
  $('dTabs').innerHTML = [['info', '샘플 정보', ''], ['ex', '신고면제', exDot(s.id)], ['ship', '출고', '']].map(([k, l, d]) => `<button class="tab ${S.dTab === k ? 'on' : ''}" onclick="setDTab('${k}')">${l}${d}</button>`).join('');
  $('dInfo').style.display = S.dTab === 'info' ? '' : 'none'; $('dExTab').style.display = S.dTab === 'ex' ? '' : 'none'; $('dShipTab').style.display = S.dTab === 'ship' ? '' : 'none';
  const m = S.OCL && molOf(s), mv = !m && S.OCL ? monoView(s, 500, 240) : '';
  $('dStruct').classList.toggle('small', !m && !mv);
  $('dStruct').innerHTML = m ? svgOf(m, 520, 290, S.hits && S.hits.get(s.id) && S.hits.get(s.id).match) : (mv || noStruct(s));
  const poly = kindsOf(s).includes('고분자'), md = parseMod(s['개질']);
  const items = [['물질명', s['물질명']], ['CAS', s.CAS], ['종류', kindsOf(s).join(', ')]];
  if (poly) items.push(['단량체', parseMono(s['단량체']).map(x => `${x.abbr}${x.name !== x.abbr ? ' (' + x.name + ')' : ''}${x.cas ? ' ' + x.cas : ''}`).join(' · ')]);
  else items.push(['분자식', s['분자식']], ['분자량', s['분자량']]);
  items.push(['성상', s['성상']], ['용도', s['용도']], ['고객사', s['고객사']], ['관리회사', companyOf(s)]);
  if (md.방식 && md.방식 !== '없음') items.push(['개질', `${md.방식}${md.기반 ? ' · 기반: ' + ((S.samples.find(x => x.id === md.기반) || {})['제품명'] || '') : ''} · ${md.물질.map(x => x.name || x.abbr).join(', ')}`]);
  if (s['비고']) items.push(['비고', s['비고']]);
  if (s['용매농도']) items.push(['이전 형태', s['용매농도']]);
  $('dKv').innerHTML = items.map(([k, v]) => `<div class="k">${k}</div><div>${dash(v)}</div>`).join('');
  $('dFoot').textContent = [s['등록일'] && '등록 ' + s['등록일'], s['수정일'] && '수정 ' + s['수정일']].filter(Boolean).join(' · ');
  renderExTab(s); renderShipCards(s);
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
  $('dEx').innerHTML = L.length ? L.map(e => { const st = exState(e); return `<div class="exrow"><b>${esc(e['기관'] || '동우화인켐')}</b><span class="b ${st.cls}">${st.txt}</span>
      <span>${esc(e['면제번호'] || '')}</span><span class="hint" title="신청일 · 연구개발기간 · 신청 회사">${e['신청일'] ? '신청 ' + esc(e['신청일']) : ''}${e['기간시작'] ? ' · ' + esc(e['기간시작']) + ' ~ ' + esc(e['기간종료']) : ''}${(e['신청회사'] || '한인') !== '한인' ? ' · ' + esc(e['신청회사']) : ''}</span>
      <span style="flex:1"></span><button class="sm edit-only" onclick="openEx('${e.id}')">수정</button></div>`; }).join('')
    : '<div class="exrow"><span class="dash">기록 없음</span></div>';
  const cos = coNames().filter(n => coDocs(n).some(d => EX_DOCS.includes(d)));
  if (!S.exCo || !cos.includes(S.exCo)) S.exCo = (L[0] && L[0]['신청회사']) || (cos.includes(companyOf(s)) ? companyOf(s) : '한인');
  const insts = rows('고객사').map(x => x['회사명']); const inst0 = (L[0] && L[0]['기관']) || '동우화인켐';
  $('xd_co').innerHTML = cos.map(c => `<option ${c === S.exCo ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('xd_inst').innerHTML = (insts.length ? insts : ['동우화인켐']).map(c => `<option ${c === inst0 ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('xd_date').value = (L[0] && L[0]['신청일']) || S.today; $('xd_name').value = s['물질명'] || '';
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
  const s = S.cur, co = S.exCo || '한인', c = coOf(co) || { 이름: co, 회사명: co }, inst = $('xd_inst').value, nm = $('xd_name').value.trim(), msg = 'xm_' + k;
  flash(msg, fk === 'pdf' ? 'PDF 변환 중…' : '만드는 중…');
  try {
    if (k === '연구개발용확인서') {
      const cu = custOf(inst) || { 회사명: inst }, T = await Docs.templates();
      const v = { 제조자: c['안전관리자'] || '', 제조직위: c['안전관리자직위'] || '', 제조연락처: c['안전관리자연락처'] || '', 기관안전: cu['안전관리자'] || '', 기관직위: cu['안전관리자직위'] || '', 기관연락처: cu['안전관리자연락처'] || '',
        주의_취급: setting('주의_취급', ''), 주의_저장: setting('주의_저장', ''), 주의_화재: setting('주의_화재', ''), 사후1: c['회사명'] || co, 사후2: cu['회사명'], 처리업체: setting('처리업체', ''), 운반업체: setting('운반업체', ''),
        이송방법: setting('이송방법', '자차로 이송'), 수령주소: cu['주소'] || '', 보관창고: cu['보관창고'] || '', 운송업체: setting('운반업체', ''), 날짜: pointDate($('xd_date').value), 회사명: c['회사명'] || co, 대표: c['대표'] || '' };
      await Docs.deliver(await Docs.buildRnd(v, c['직인'] || (co === '한인' ? T.stamp : null)), `${baseName(s)}_연구개발용화학물질확인서${inst !== '동우화인켐' ? '(' + Docs.safeName(inst) + ')' : ''}`, 'docx', fk);
    } else if (k === 'CAS미부여확인서') {
      if (!nm) throw new Error('물질명을 입력하세요.');
      const v = { 물질명: nm, 회사명: c['회사명'] || co, 주소: c['주소'] || '', 사업자번호: c['사업자번호'] || '', 담당자: [c['부서'], c['담당자']].filter(Boolean).join(' '), 확인일: korDate($('xd_date').value || S.today) };
      await Docs.deliver(await Docs.buildCasCert(v, molOf(s)), `${baseName(s)}_CAS미부여확인서${co !== '한인' ? '(' + Docs.safeName(co) + ')' : ''}`, 'docx', fk);
    } else if (k === '물질식별정보') {
      if (!nm) throw new Error('물질명을 입력하세요.');
      const m = molOf(s); Docs.download(await Docs.buildIdPng(m, chemInfo(m).mw, nm), `${baseName(s)}_물질식별정보.png`);
    } else if (k === '단량체정보') {
      await Docs.deliver(await Docs.buildMonomerXlsx(s, parseMono(s['단량체']).map(x => ({ 물질명: x.name, CAS: x.cas }))), `${baseName(s)}_단량체정보`, 'xlsx', fk);
    }
    flash(msg, '✓');
  } catch (e) { flash(msg, errMsg(e), false); }
};
// ----- 출고 탭 -----
function neededDocs(x) {
  const co = x['명의'], can = coDocs(co), need = x['필요서류'] != null && x['필요서류'] !== '' ? list(x['필요서류']) : defaultNeed(co, x['고객사']);
  return need.filter(d => can.includes(d));
}
function defaultNeed(co, cust) { const c = custOf(cust); const base = c && c['필요서류'] ? list(c['필요서류']) : ['MSDS']; return base.filter(d => coDocs(co).includes(d)); }
function renderShipCards(s) {
  const L = shipsOf(s.id);
  $('dShips').innerHTML = (S.detailNote ? `<div class="warn" style="margin:0 0 10px">${esc(S.detailNote)}</div>` : '') + (L.length ? L.map(x => {
    const need = neededDocs(x), ex = x['고객사'] ? sampleEx(s.id, x['고객사']) : null, f = parseForm(x['제출형태']), co = coOf(x['명의']), valid = ex && ex.st.k === '유효';
    const lsForm = (co && co['MSDS양식'] === '엘에스켐') || (!co && x['명의'] === '엘에스켐'), cust = custOf(x['고객사']) || {};
    const self = need.includes('자진확인서') ? `<div class="docrow"><b>자진확인서</b>${valid ? '' : '<span class="wmini">유효한 면제번호 없음</span>'}<span class="sp"></span><span class="msg" id="sm_${x.id}"></span>
        <button class="sm" onclick="toggleSelf('${x.id}')">편집</button>${FMTB.docx.map(([k, l]) => `<button class="sm ${k === 'orig' ? 'primary' : ''}" ${valid ? '' : 'disabled'} onclick="selfRun('${x.id}','${k}')">${l}</button>`).join('')}</div>
      <div class="f selfed" id="se_${x.id}" style="display:none">
        <div class="c3"><label>To.</label><input id="se_${x.id}_TO" value="${esc(cust['영문명'] || cust['회사명'] || x['고객사'] || '')}"></div>
        <div class="c3"><label>물질명</label><input id="se_${x.id}_물질명" value="${esc((ex && ex.e['통지물질명']) || s['물질명'] || '')}"></div>
        <div class="c2"><label>면제번호</label><input id="se_${x.id}_면제번호" value="${esc(valid ? ex.e['면제번호'] : '')}"></div>
        <div class="c2"><label>취급최대수량(톤)</label><input id="se_${x.id}_수량" value="${esc(setting('자진확인서수량', '0.01'))}"></div>
        <div class="c2"><label>함량(%)</label><input id="se_${x.id}_함량" value="${f && f.t === 'sol' ? f.p : 100}"></div></div>` : '';
    const msds = need.includes('MSDS') ? `<div class="docrow"><b>MSDS${lsForm ? ' (엘에스켐 양식)' : ''}</b><span class="sp"></span><button class="sm primary" onclick="goMsdsShip('${x.id}')">작성</button></div>` : '';
    const sub = need.length ? `<div class="docrow"><b>서류 제출</b>${x['서류제출일'] ? `<span class="b ok">${esc(x['서류제출일'])}</span>` : ''}<span class="sp"></span><span class="msg" id="sd_${x.id}"></span><input type="date" id="sdd_${x.id}" value="${esc(x['서류제출일'] || S.today)}" class="dsm"><button class="sm" onclick="saveSubmit('${x.id}')">저장</button></div>` : '';
    return `<div class="scard"><div class="shead">${coBadge(x['명의'] || '?')}<b>${esc(x['고객사'] || '고객사 미입력')}</b>${x['고객사담당자'] ? `<span class="hint">${esc(x['고객사담당자'])}</span>` : ''}
        <span class="hint">요청 ${dash(x['요청일'])}</span><span class="hint">${x['출고일'] ? '출고 ' + esc(x['출고일']) : '미출고'}</span><span class="hint">${esc(formText(f))}${x['수량'] ? ' · ' + esc(x['수량']) : ''}</span>
        ${x['고객사'] ? (ex ? `<span class="b ${ex.st.cls}" title="${esc(x['고객사'])} 신고면제">${ex.st.txt}</span>` : '<span class="b etc">신고면제 없음</span>') : ''}<span class="sp"></span><button class="sm" onclick="openShip('${x.id}')">수정</button></div>
      <div class="edit-only scdocs">${self}${msds}${sub}</div></div>`;
  }).join('') : '<p class="empty">출고 기록 없음</p>');
}
window.toggleSelf = id => { const el = $('se_' + id); el.style.display = el.style.display === 'none' ? '' : 'none'; };
window.selfRun = async (id, fk) => {
  const s = S.cur, x = rows('출고').find(r => r.id === id), f = parseForm(x['제출형태']), g = k => $(`se_${id}_${k}`).value.trim(), msg = 'sm_' + id;
  const v = { TO: g('TO'), 제품명: s['제품명'], 물질명: g('물질명'), 면제번호: g('면제번호'), 수량: g('수량'), 함량: g('함량'), 확인일: dotDate(S.today) };
  if (!v.면제번호) { flash(msg, '면제번호 없음', false); return; }
  flash(msg, fk === 'pdf' ? 'PDF 변환 중…' : '만드는 중…');
  try { await Docs.deliver(await Docs.buildSelfCheck(v), `${baseName(s)}_자진확인서${formSuffix(f)}`, 'docx', fk); flash(msg, '✓'); } catch (e) { flash(msg, errMsg(e), false); }
};
window.saveSubmit = async id => {
  const x = rows('출고').find(r => r.id === id), d = $('sdd_' + id).value;
  try { const r = await call('saveShipment', Object.assign({}, x, { 서류제출일: d })); upsert('출고', r.ship); renderDetail(); render(); } catch (e) { flash('sd_' + id, errMsg(e), false); }
};
