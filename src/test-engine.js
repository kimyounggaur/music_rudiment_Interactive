// 21자리 전수 검증: 이름·덧줄·기둥·음높이·판정 범주를 손으로 쓴 표와 비교
const E = require('./engine.js');
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('FAIL:', m); } };

// [p, 이름, 음이름, MIDI, 덧줄 개수, 범주]
const TABLE = [
  [0, '아래쪽 셋째 덧줄', 'F3', 53, 3, 'loLine'],
  [1, '아래쪽 셋째 덧간', 'G3', 55, 2, 'loSpace'],
  [2, '아래쪽 둘째 덧줄', 'A3', 57, 2, 'loLine'],
  [3, '아래쪽 둘째 덧간', 'B3', 59, 1, 'loSpace'],
  [4, '아래쪽 첫째 덧줄', 'C4', 60, 1, 'loLine'],
  [5, '아래쪽 첫째 덧간', 'D4', 62, 0, 'loSpace'],
  [6, '첫째 줄', 'E4', 64, 0, 'staff'],
  [7, '첫째 간', 'F4', 65, 0, 'staff'],
  [8, '둘째 줄', 'G4', 67, 0, 'staff'],
  [9, '둘째 간', 'A4', 69, 0, 'staff'],
  [10, '셋째 줄', 'B4', 71, 0, 'staff'],
  [11, '셋째 간', 'C5', 72, 0, 'staff'],
  [12, '넷째 줄', 'D5', 74, 0, 'staff'],
  [13, '넷째 간', 'E5', 76, 0, 'staff'],
  [14, '다섯째 줄', 'F5', 77, 0, 'staff'],
  [15, '위쪽 첫째 덧간', 'G5', 79, 0, 'upSpace'],
  [16, '위쪽 첫째 덧줄', 'A5', 81, 1, 'upLine'],
  [17, '위쪽 둘째 덧간', 'B5', 83, 1, 'upSpace'],
  [18, '위쪽 둘째 덧줄', 'C6', 84, 2, 'upLine'],
  [19, '위쪽 셋째 덧간', 'D6', 86, 2, 'upSpace'],
  [20, '위쪽 셋째 덧줄', 'E6', 88, 3, 'upLine']
];
const SOLF = { C: '도', D: '레', E: '미', F: '파', G: '솔', A: '라', B: '시' };

TABLE.forEach(([p, name, letter, midi, nLedger, cat]) => {
  const x = E.posInfo(p);
  ok(x.name === name, `p${p} 이름 ${x.name} ≠ ${name}`);
  ok(x.letter === letter, `p${p} 음이름 ${x.letter} ≠ ${letter}`);
  ok(x.solf === SOLF[letter[0]], `p${p} 계이름`);
  ok(x.midi === midi, `p${p} MIDI ${x.midi} ≠ ${midi}`);
  ok(x.ledgers.length === nLedger, `p${p} 덧줄 ${x.ledgers.length} ≠ ${nLedger}`);
  ok(x.cat === cat, `p${p} 범주 ${x.cat} ≠ ${cat}`);
  ok(x.isLine === (p % 2 === 0), `p${p} 줄/간`);
  // 덧줄은 모두 줄 자리이고, 오선 밖이며, 음표를 넘지 않는다
  x.ledgers.forEach(q => {
    ok(q % 2 === 0, `p${p} 덧줄 ${q}는 줄 자리여야 함`);
    ok(q > E.STAFF_HI || q < E.STAFF_LO, `p${p} 덧줄 ${q}는 오선 밖이어야 함`);
    ok(p > E.STAFF_HI ? q <= p : q >= p, `p${p} 덧줄 ${q}가 음표 바깥으로 넘침`);
  });
  // 덧줄 위의 음이면 마지막 덧줄이 음표 자리와 같아야 함 (선이 머리를 가로지름)
  if (x.kind === '덧줄') ok(x.ledgers[x.ledgers.length - 1] === p, `p${p} 마지막 덧줄이 음표를 가로질러야 함`);
  if (x.kind === '덧간') ok(!x.ledgers.includes(p), `p${p} 덧간 음표에는 자기 자리 덧줄이 없어야 함`);
  // 기둥: 셋째 줄 이상은 아래로, 기둥 끝이 가운데 줄에 닿거나 넘음
  ok(x.stemUp === (p < 10), `p${p} 기둥 방향`);
  const tipP = x.stemUp ? p + x.stemHalf : p - x.stemHalf;
  if (x.zone !== 'staff') ok(x.stemUp ? tipP >= 10 : tipP <= 10, `p${p} 오선 밖 음의 기둥은 가운데 줄까지`);
});

// 판정 범주별 정답 개수: 오선 9, 나머지 3씩
const count = c => TABLE.filter(r => E.matchesCat(r[0], c)).length;
ok(count('staff') === 9, '오선 안 9자리');
['upLine', 'upSpace', 'loLine', 'loSpace'].forEach(c => ok(count(c) === 3, `${c} 3자리`));

// 힌트가 늘 문장을 돌려주고, 맞는 범주에서는 호출되지 않는 쪽 문장이 서로 다름
for (let p = 0; p <= 20; p++) {
  ['staff', 'upLine', 'upSpace', 'loLine', 'loSpace'].forEach(c => {
    if (!E.matchesCat(p, c)) ok(typeof E.catHint(p, c) === 'string' && E.catHint(p, c).length > 10, `힌트 p${p} ${c}`);
  });
}
ok(E.nameHint(10, 16) === '지금은 셋째 줄이에요. 위쪽 첫째 덧줄은 여기서 6자리 위예요.', '이름 힌트 문장: ' + E.nameHint(10, 16));
ok(E.nameHint(9, 3) === '지금은 둘째 간이에요. 아래쪽 둘째 덧간은 여기서 6자리 아래예요.', '이름 힌트 문장 2: ' + E.nameHint(9, 3));

TABLE.forEach(([p]) => { const x = E.posInfo(p); console.log(String(p).padStart(2), x.letter.padEnd(3), x.solf, x.name.padEnd(12), '덧줄', x.ledgers.join(',') || '-', x.stemUp ? '기둥↑' : '기둥↓', x.stemHalf); });
console.log(`\n${checks}개 검사, 실패 ${fails}개`);
process.exit(fails ? 1 : 0);
