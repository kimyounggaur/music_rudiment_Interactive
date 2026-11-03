export const P_MIN = 0;
export const P_MAX = 20;
export const MID_P = 10;
export const STAFF_LO = 6;
export const STAFF_HI = 14;
const DIA0 = 24;
const ORD = ['', '첫째', '둘째', '셋째', '넷째', '다섯째'];
const SOLF = ['도', '레', '미', '파', '솔', '라', '시'];
const LETTER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NAT_PC = [0, 2, 4, 5, 7, 9, 11];

export const SOLFA_COLORS = {
  도: '#f39aac', 레: '#efb28b', 미: '#eadf78', 파: '#93cfae',
  솔: '#88bedf', 라: '#a3a8e4', 시: '#c3a3dd',
};

export function clampP(p) {
  return Math.max(P_MIN, Math.min(P_MAX, Math.round(p)));
}

export function posInfo(value) {
  const p = clampP(value);
  const dia = DIA0 + p;
  const li = dia % 7;
  const oct = Math.floor(dia / 7);
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
  const ledgers = [];
  if (p >= STAFF_HI + 2) for (let q = STAFF_HI + 2; q <= p; q += 2) ledgers.push(q);
  if (p <= STAFF_LO - 2) for (let q = STAFF_LO - 2; q >= p; q -= 2) ledgers.push(q);
  return {
    p, dia, isLine, zone, k, kind, name, short, cat, ledgers,
    stemUp: p < MID_P,
    solf: SOLF[li], letter: LETTER[li] + oct,
    midi: 12 * (oct + 1) + NAT_PC[li],
  };
}

export function explanationFor(p) {
  const x = posInfo(p);
  if (x.zone === 'staff') {
    return x.isLine
      ? `오선 안 ${x.name}은 ${x.solf}(${x.letter})예요. 음표 머리를 줄이 가로지르고 있어요.`
      : `오선 안 ${x.name}은 ${x.solf}(${x.letter})예요. 음표 머리가 줄과 줄 사이에 놓여 있어요.`;
  }
  const side = x.zone === 'up' ? '다섯째 줄보다 위' : '첫째 줄보다 아래';
  return `${side}에 있는 ${x.name}은 ${x.solf}(${x.letter})예요. ${x.isLine ? '필요한 덧줄이 함께 나타나요.' : '덧줄과 덧줄 사이의 공간을 살펴 보세요.'}`;
}

export function nameHint(p, target) {
  const x = posInfo(p);
  const t = posInfo(target);
  const d = target - p;
  return `지금은 ${x.name}이에요. ${t.name}은 여기서 ${Math.abs(d)}자리 ${d > 0 ? '위' : '아래'}예요.`;
}
