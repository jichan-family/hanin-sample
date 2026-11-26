// 사용: node tools/claude_ops.js ops.json  → doPost에 보낼 ops(JSON)를 출력
// ops.json: [{type:'addSample', smiles:'...', data:{제품명,...}}, {type:'updateSample', 관리번호:'한인-218', data:{...}}, ...]
// smiles가 있으면 앱과 같은 방식(chemInfo)으로 idcode·좌표·검색값·분자식·분자량을 채움. ocl.js는 openchemlib@9.26.0
const fs = require('fs'), path = require('path');
const OCL = require(process.env.OCL_JS || path.join(__dirname, 'ocl.js'));
const ops = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const op of ops) {
  if (!op.smiles) continue;
  const m = OCL.Molecule.fromSmiles(op.smiles), f = m.getMolecularFormula(), ic = m.getIDCodeAndCoordinates();
  op.data = Object.assign({ 종류: m.getFragments().length > 1 && /[+-]/.test(op.smiles) ? '이온성물질' : '단분자' }, op.data || {},
    { idcode: ic.idCode, 좌표: ic.coordinates, 검색값: m.getIndex().join(','), 분자식: f.formula, 분자량: String(op.data && /고분자/.test(op.data['종류'] || '') ? '' : f.relativeWeight.toFixed(2)) });
  delete op.smiles;
}
process.stdout.write(JSON.stringify(ops));
