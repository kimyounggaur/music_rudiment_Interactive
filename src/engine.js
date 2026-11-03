/* ===== 오선 자리 엔진 (순수 함수) =====
   자리 번호 p: 0 = 아래쪽 셋째 덧줄(F3) … 20 = 위쪽 셋째 덧줄(E6), 높은음자리표 기준.
   짝수 p = 줄, 홀수 p = 간. 오선은 p 6(첫째 줄, E4) ~ p 14(다섯째 줄, F5).
   덧간은 교재 정의대로 '덧줄과 덧줄 사이, 또는 오선과 가장 가까운 덧줄 사이'. */
const P_MIN = 0, P_MAX = 20, MID_P = 10;
const STAFF_LO = 6, STAFF_HI = 14;
const DIA0 = 24; /* F3의 온음계 번호 (C0 = 0) */
const ORD = ['', '첫째', '둘째', '셋째', '넷째', '다섯째'];
const SOLF = ['도', '레', '미', '파', '솔', '라', '시'];
const LETTER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NAT_PC = [0, 2, 4, 5, 7, 9, 11];
const CAT_LABEL = {
  staff: '오선 안의 음', upLine: '위쪽 덧줄 음', upSpace: '위쪽 덧간 음',
  loLine: '아래쪽 덧줄 음', loSpace: '아래쪽 덧간 음'
};

function clampP(p) { return Math.max(P_MIN, Math.min(P_MAX, Math.round(p))); }

function posInfo(p) {
  const dia = DIA0 + p, li = dia % 7, oct = Math.floor(dia / 7);
  const isLine = p % 2 === 0;
  let zone, k, name, short, cat, kind;
  if (p >= STAFF_LO && p <= STAFF_HI) {
    zone = 'staff';
    k = isLine ? (p - STAFF_LO) / 2 + 1 : (p - STAFF_LO + 1) / 2;
    short = name = ORD[k] + (isLine ? ' 줄' : ' 간');
    kind = isLine ? '줄' : '간';
    cat = 'staff';
  } else if (p > STAFF_HI) {
    zone = 'up';
    k = isLine ? (p - STAFF_HI) / 2 : (p - STAFF_HI + 1) / 2;
    kind = isLine ? '덧줄' : '덧간';
    short = ORD[k] + ' ' + kind;
    name = '위쪽 ' + short;
    cat = isLine ? 'upLine' : 'upSpace';
  } else {
    zone = 'down';
    k = isLine ? (STAFF_LO - p) / 2 : (STAFF_LO - p + 1) / 2;
    kind = isLine ? '덧줄' : '덧간';
    short = ORD[k] + ' ' + kind;
    name = '아래쪽 ' + short;
    cat = isLine ? 'loLine' : 'loSpace';
  }
  /* 이 음을 적을 때 그어야 하는 덧줄(자리 번호) — 오선에 가까운 것부터 */
  const ledgers = [];
  if (p >= STAFF_HI + 2) for (let q = STAFF_HI + 2; q <= p; q += 2) ledgers.push(q);
  if (p <= STAFF_LO - 2) for (let q = STAFF_LO - 2; q >= p; q -= 2) ledgers.push(q);
  const stemUp = p < MID_P;
  /* 기둥 길이(반 칸 단위): 기본 7(=3.5칸), 오선 밖으로 멀면 가운데 줄까지 */
  const stemHalf = Math.max(7, Math.abs(p - MID_P));
  return {
    p, dia, isLine, zone, k, kind, name, short, cat, ledgers, stemUp, stemHalf,
    solf: SOLF[li], letter: LETTER[li] + oct, midi: 12 * (oct + 1) + NAT_PC[li]
  };
}

/* 연습 판정 */
function matchesCat(p, cat) { return posInfo(p).cat === cat; }

/* 오답 힌트: 지금 자리와 목표 범주를 비교해 무엇을 고칠지 알려 준다 */
function catHint(p, cat) {
  const x = posInfo(p);
  const wantZone = cat === 'staff' ? 'staff' : (cat.indexOf('up') === 0 ? 'up' : 'down');
  const wantLine = cat === 'upLine' || cat === 'loLine';
  if (wantZone === 'staff') {
    return x.zone === 'up' ? '지금은 오선 위쪽이에요. 다섯째 줄 아래로 내려 보세요.'
                           : '지금은 오선 아래쪽이에요. 첫째 줄 위로 올려 보세요.';
  }
  if (x.zone !== wantZone) {
    if (wantZone === 'up') return x.zone === 'staff' ? '아직 오선 안이에요. 다섯째 줄보다 위로 올려 보세요.' : '반대쪽이에요. 오선 위쪽으로 올려 보세요.';
    return x.zone === 'staff' ? '아직 오선 안이에요. 첫째 줄보다 아래로 내려 보세요.' : '반대쪽이에요. 오선 아래쪽으로 내려 보세요.';
  }
  return wantLine ? '지금은 덧간이에요. 덧줄이 음표 머리를 가로지르는 자리로 한 자리 옮겨 보세요.'
                  : '지금은 덧줄 위예요. 줄과 줄 사이 공간으로 한 자리 옮겨 보세요.';
}

function nameHint(p, target) {
  const x = posInfo(p), t = posInfo(target), d = target - p;
  const n = Math.abs(d);
  return `지금은 ${x.name}이에요. ${t.name}은 여기서 ${n}자리 ${d > 0 ? '위' : '아래'}예요.`;
}

if (typeof module !== 'undefined') {
  module.exports = { P_MIN, P_MAX, MID_P, STAFF_LO, STAFF_HI, ORD, CAT_LABEL, clampP, posInfo, matchesCat, catHint, nameHint };
}
