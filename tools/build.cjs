const fs=require('fs'), v='/home/claude/v6/';
eval(fs.readFileSync(v+'Templates.gs','utf8')+';global.T=TEMPLATES');
eval(fs.readFileSync(v+'Forms.gs','utf8')+';Object.assign(T,FORMS)'); fs.writeFileSync('templates.json',JSON.stringify(T));
const rows=JSON.parse(fs.readFileSync('/home/claude/mig/rows3.json','utf8'));
const today='2026-11-26';
const a=rows[0], b=rows[1];
const stampB64=T.stamp;
const data={'샘플':rows,'출고':[],'신고면제':[],
 '고객사':[{id:'c1',회사명:'동우화인켐',영문명:'DONGWOO FINE-CHEM CO., LTD',주소:'경기도 평택시 포승읍 포승공단로117번길 35',담당자:'남궁진웅',안전관리자:'정경문',안전관리자직위:'수석',안전관리자연락처:'01050676778',보관창고:'동우화인켐 연구소 시약실',필요서류:'자진확인서,MSDS'}],
 '출고사':[{id:'k1',이름:'한인',회사명:'한인정밀화학(주)',주소:'경기도 수원시 권선구 오목천로152번길 40, 첨단벤처밸리 1010호',사업자번호:'134-86-56887',대표:'최한영',전화:'070-4821-4797',부서:'기업부설연구소',담당자:'유현아',안전관리자:'최한영',안전관리자직위:'대표이사',안전관리자연락처:'01032265100',색:'#1f6feb',작성서류:'연구개발용확인서,CAS미부여확인서,물질식별정보,단량체정보,자진확인서,MSDS',MSDS양식:'한인',정식:'Y',순서:'1'},
  {id:'k2',이름:'엘에스켐',회사명:'(주)엘에스켐',주소:'충북 괴산군 청안면 첨단산단1로 24',전화:'043-760-7630',색:'#1a7f37',작성서류:'CAS미부여확인서,물질식별정보,단량체정보,MSDS',MSDS양식:'엘에스켐',정식:'Y',순서:'2'},
  {id:'k3',이름:'제이와이트리켐',회사명:'제이와이트리켐',색:'#c4520a',작성서류:'',MSDS양식:'한인',정식:'Y',순서:'3'},
  {id:'k4',이름:'케미웍스',회사명:'케미웍스',색:'#6e7781',작성서류:'',MSDS양식:'한인',정식:'Y',순서:'4'}],
 '단량체':[['EHA','2-Ethylhexyl acrylate','103-11-7'],['HEA','2-Hydroxyethyl acrylate','818-61-1'],['AA','Acrylic acid','79-10-7']].map((m,i)=>({id:'m'+i,약어:m[0],물질명:m[1],CAS:m[2]})),
 'MSDS이력':[], '설정':[{id:'자진확인서수량',값:'0.01'},{id:'처리업체',값:'㈜화성에너텍'},{id:'운반업체',값:'자체운반'},{id:'이송방법',값:'자차로 이송'},
  {id:'주의_취급',값:'-몇분간 물로 조심히 씻으시오\n-콘택트렌즈를 제거할 수 있으면 제거하고 씻으시오.'},{id:'주의_저장',값:'-건조하고 시원하며 통풍이 잘 되는 곳에 밀폐된 상태로 보관하십시오.'},{id:'주의_화재',값:'-물 포말 이산화탄소분말 소화제\n-모든 점화원을 탈거하십시오.'}]};
data['출고'].push({id:'s1',샘플id:a.id,제품명:a.제품명,명의:'한인',고객사:'동우화인켐',고객사담당자:'남궁진웅',요청일:'2026-11-01',수량:'10 g',함량:'100',제출형태:'{"t":"neat"}',필요서류:'자진확인서,MSDS'});
data['신고면제'].push({id:'e1',샘플id:a.id,제품명:a.제품명,신청일:'2026-11-03',기관:'동우화인켐',신청회사:'한인'});
data['신고면제'].push({id:'e2',샘플id:b.id,제품명:b.제품명,신청일:'2026-07-20',기간시작:'2026-07-20',기간종료:'2027-07-19',면제번호:'제07-2607-000001호',결과:'대상',기관:'동우화인켐',신청회사:'한인'});
fs.writeFileSync('data.json',JSON.stringify({version:'v0.5.0',updated:today,created:'2026-11-25',data,today,hasTemplates:true}));
let idx=fs.readFileSync(v+'Index.html','utf8');
const inc=n=>fs.readFileSync(v+n+'.html','utf8');
const mock=`<script>
const DB=fetch('data.json').then(r=>r.json());
let uid=0;
function mk(){ const h={ok:null,no:null}; const p=new Proxy({}, {get:(t,fn)=>{ if(fn==='withSuccessHandler') return f=>{h.ok=f;return p}; if(fn==='withFailureHandler') return f=>{h.no=f;return p};
 return (...a)=>{ setTimeout(async()=>{ try{ const d=await DB; let r;
  if(fn==='getAll') r=JSON.parse(JSON.stringify(d));
  else if(fn==='verifyPassword') r=a[0]==='1185';
  else if(fn==='saveRow'){ const o=Object.assign({},a[2]); if(!o.id){o.id='n'+(++uid); o['등록일']='2026-11-26 10:00';} if(a[1]==='샘플'&&!o['관리번호']&&o['관리회사']){ const pre=o['관리회사']; const mx=Math.max(0,...d.data['샘플'].map(s=>{const m=String(s['관리번호']).match(/^(.*)-(\\d+)$/);return m&&m[1]===pre?+m[2]:0;})); o['관리번호']=pre+'-'+(mx+1); d.data['샘플'].push(o);} o['수정일']='2026-11-26 10:00'; window.__saved=(window.__saved||[]).concat([[a[1],o]]); r=o; }
  else if(fn==='deleteRow') r=true;
  else if(fn==='saveField') r=a[3].length;
  else if(fn==='saveShipment'){ const o=Object.assign({},a[0]); if(!o.id) o.id='sh'+(++uid); const s=window.S.samples.find(x=>x.id===o['샘플id']); let smp=null; if(s){ const nm=(s['명의']||'').split(',').filter(Boolean); if(!nm.includes(o['명의'])){ nm.push(o['명의']); smp=Object.assign({},s,{명의:nm.join(',')}); } } window.__saved=(window.__saved||[]).concat([['출고',o]]); r={ship:o,sample:smp}; }
  else if(fn==='promoteCompany'){ const nm=a[1]; const co={id:'k'+(++uid),이름:nm,회사명:nm,색:'#8250df',작성서류:'MSDS',MSDS양식:'한인',정식:'Y',순서:'9'}; const moved=window.S.samples.filter(s=>s['관리회사']==='기타'&&s['기타회사']===nm).map(s=>Object.assign({},s,{관리회사:nm})); r={company:co,samples:moved}; }
  else if(fn==='toPdf'){ window.__pdf=(window.__pdf||0)+1; r=btoa('%PDF-1.4 fake'); }
  else if(fn==='pubchemByCas') r=a[0].map(c=>c==='110-26-9'?{smiles:'C=CC(=O)NCNC(=O)C=C',name:'N,N-Methylenebisacrylamide'}:c==='2495-35-4'?{smiles:'C=CC(=O)OCc1ccccc1',name:'Benzyl acrylate'}:{});
  else if(fn==='lookupPubChem') r=a[0].smiles&&a[0].smiles.length<12?{cas:['64-17-5'],iupac:'ethanol',found:true,names:['Ethanol','Ethyl alcohol','ethanol']}:{cas:[],iupac:'',found:false,names:[]};
  else if(fn==='checkUpdate') r={current:'v0.5.2',repo:window.__repo||'',latest:window.__repo?'v0.5.3':undefined,date:'2026-11-27',notes:'테스트 변경',newer:!!window.__repo};
  else if(fn==='setUpdateRepo'){ window.__repo=a[1]; r=a[1]; }
  else if(fn==='applyUpdate') r={version:'v0.5.3',files:['Code','Index','App'],versionNumber:12,url:'https://script.google.com/macros/s/X/exec'};
  else if(fn==='hasClaudeCode') r=!!window.__cc;
  else if(fn==='setClaudeCode'){ window.__cc=a[1]; r='저장됨'; }
  else if(fn==='runBatchUi'){ const ops=a[1], ap=a[2]; const L=d.data['샘플']; let mx=Math.max(0,...L.map(s=>{const m=String(s['관리번호']).match(/^한인-(\d+)$/);return m?+m[1]:0;}));
    const res=ops.map(o=>{ if(o.type==='addSample'){ const x=Object.assign({관리회사:'한인'},o.data); x['관리번호']='한인-'+(++mx); if(ap){x.id='b'+(++uid); L.push(x);} return {ok:true,type:o.type,관리번호:x['관리번호'],제품명:x['제품명'],warn:''}; }
      const t=L.find(s=>s['관리번호']===o['관리번호']); if(!t) return {ok:false,type:o.type,error:'없음'}; const df={}; Object.keys(o.data).forEach(k=>{ if(String(t[k]||'')!==o.data[k]) df[k]={전:t[k]||'',후:o.data[k]}; }); if(ap) Object.assign(t,o.data); return {ok:true,type:o.type,관리번호:t['관리번호'],제품명:t['제품명'],바뀜:df}; });
    r={ok:true,applied:ap,results:res,samples:ap?JSON.parse(JSON.stringify(L)):null,ships:ap?d.data['출고']:null}; }
  else if(fn==='getTemplates') r=await (await fetch('templates.json')).json();
  h.ok&&h.ok(r);}catch(e){h.no&&h.no(e)} },30); } }}); return p; }
window.google={script:{get run(){return mk()}}};
</script>`;
idx=idx.replace("<?!= include('Editor') ?>",mock+inc('Editor')).replace("<?!= include('Docs') ?>",inc('Docs')).replace("<?!= include('App') ?>",inc('App'));
idx=idx.replace('https://cdn.jsdelivr.net/npm/openchemlib@9.26.0/dist/openchemlib.js','./ocl.js')
 .replace('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js','./exceljs.min.js').replace('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','./jszip.min.js')
 .replace('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js','./pdf.min.js').replace('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js','./pdf.worker.min.js');
fs.writeFileSync('index.html',idx);
