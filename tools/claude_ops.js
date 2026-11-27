// 사용: node tools/claude_ops.js ops.json  → doPost에 보낼 ops(JSON)를 출력
// ops.json: [{type:'addSample', smiles:'...', data:{제품명,...}}, {type:'updateSample', 관리번호:'한인-218', data:{...}}, ...]
// smiles가 있으면 앱과 같은 방식(chemInfo)으로 idcode·좌표·검색값·분자식·분자량을 채움. ocl.js는 openchemlib@9.26.0
// 좌표(그림 배치)는 RDKit CoordGen으로 잡음(큰 고리·스피로 구조가 찌그러지지 않게). 준비: npm i @rdkit/rdkit (RDKIT_JS로 경로 지정 가능)
const fs = require('fs'), path = require('path');
const OCL = require(process.env.OCL_JS || path.join(__dirname, 'ocl.js'));
let initRDKit = null;
try { initRDKit = require(process.env.RDKIT_JS || '@rdkit/rdkit'); } catch (e) { console.error('RDKit 없음 → OpenChemLib 배치 사용 (npm i @rdkit/rdkit 권장)'); }
(async () => {
  const R = initRDKit ? await initRDKit() : null; if (R) R.prefer_coordgen(true);
  const ops = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const op of ops) {
    if (!op.smiles) continue;
    let m = OCL.Molecule.fromSmiles(op.smiles);
    if (R) { const r = R.get_mol(m.toMolfile()); if (r && r.is_valid()) { r.set_new_coords(true); m = OCL.Molecule.fromMolfile(r.get_molblock()); } if (r) r.delete(); }
    const f = m.getMolecularFormula(), ic = m.getIDCodeAndCoordinates();
    op.data = Object.assign({ 종류: m.getFragments().length > 1 && /[+-]/.test(op.smiles) ? '이온성물질' : '단분자' }, op.data || {},
      { idcode: ic.idCode, 좌표: ic.coordinates, 검색값: m.getIndex().join(','), 분자식: f.formula, 분자량: String(op.data && /고분자/.test(op.data['종류'] || '') ? '' : f.relativeWeight.toFixed(2)) });
    delete op.smiles;
  }
  process.stdout.write(JSON.stringify(ops));
})();
