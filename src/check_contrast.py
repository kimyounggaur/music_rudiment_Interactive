"""디자인 토큰 쌍의 WCAG 대비 계산 (라이트 · 다크). 글자는 4.5, 큰 글자·그래픽은 3 기준."""
import re, sys
from pathlib import Path

src = (Path(__file__).parent / (sys.argv[1] if len(sys.argv) > 1 else "page.template.html")).read_text(encoding="utf-8")

def block(start_pat):
    m = re.search(start_pat + r"\{(.*?)\n\s*\}|" + start_pat + r"\{(.*?)\}", src, flags=re.S)
    return m.group(1) or m.group(2)

def parse(css):
    return dict(re.findall(r"--([\w-]+):\s*([^;]+);", css))

light = parse(re.search(r":root\{(.*?)\n\}", src, flags=re.S).group(1))
dark = parse(re.search(r':root\[data-theme="dark"\]\{(.*?)\n\}', src, flags=re.S).group(1))

def rgb(c):
    c = c.strip()
    if c.startswith("#"):
        c = c[1:]
        if len(c) == 3: c = "".join(ch * 2 for ch in c)
        return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)), 1.0
    m = re.match(r"rgba?\(([^)]*)\)", c)
    p = [float(v) for v in m.group(1).split(",")]
    return (p[0], p[1], p[2]), (p[3] if len(p) > 3 else 1.0)

def over(fg, bg):
    (f, a), (b, _) = rgb(fg), rgb(bg)
    return tuple(f[i] * a + b[i] * (1 - a) for i in range(3))

def lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])

def ratio(fg, bg, base):
    b = over(bg, base)
    f = over(fg, "#%02x%02x%02x" % tuple(round(v) for v in b))
    l1, l2 = sorted((lum(f), lum(b)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)

SOLF = dict(re.findall(r"'(.)': \['(#[0-9A-Fa-f]{6})'", src))

# (설명, 전경, 배경, 기준 이상, 종류)
PAIRS = [
    ("본문 ink / card", "ink", "card", 4.5), ("본문 ink / bg", "ink", "bg", 4.5),
    ("보조 ink-2 / card", "ink-2", "card", 4.5), ("보조 ink-2 / bg", "ink-2", "bg", 4.5),
    ("연한 ink-3 / bg (eyebrow·대기 문구)", "ink-3", "bg", 4.5),
    ("이름 primary-ink / bg", "primary-ink", "bg", 4.5),
    ("이름(오선 밖) pink-ink / bg", "pink-ink", "bg", 4.5),
    ("칩 primary-ink / primary-soft", "primary-ink", "primary-soft", 4.5),
    ("칩(밖) pink-ink / pink-soft", "pink-ink", "pink-soft", 4.5),
    ("피치 칩 peach-ink / peach-soft", "peach-ink", "peach-soft", 4.5),
    ("보조(피치) 버튼 sec-ink / sec-bg", "sec-ink", "sec-bg", 4.5),
    ("연한 ink-3 / card", "ink-3", "card", 4.5),
    ("버튼 primary-ink / primary-soft", "primary-ink", "primary-soft", 4.5),
    ("주 버튼 on-primary / primary", "on-primary", "primary", 4.5),
    ("번호 배지 on-primary / primary", "on-primary", "primary", 4.5),
    ("꼬리표 on-pink / pink-strong", "on-pink", "pink-strong", 4.5),
    ("라벨 pill-in-ink / pill-in(card 위)", "pill-in-ink", "pill-in", 4.5),
    ("라벨(밖) pill-out-ink / pill-out(card 위)", "pill-out-ink", "pill-out", 4.5),
    ("활성 라벨 on-primary / primary", "on-primary", "primary", 4.5),
    ("활성 라벨(밖) on-pink / pink-strong", "on-pink", "pink-strong", 4.5),
    ("말풍선 primary-ink / card", "primary-ink", "card", 4.5),
    ("말풍선(밖) pink-ink / card", "pink-ink", "card", 4.5),
    ("음표 note-in / floor (그래픽 3)", "note-in", "floor", 3.0),
    ("음표 note-in / band-in (그래픽 3)", "note-in", "band-in", 3.0),
    ("음표 note-out / zone (그래픽 3)", "note-out", "zone", 3.0),
    ("음표 note-out / band-out (그래픽 3)", "note-out", "band-out", 3.0),
    ("오선 staff-line / floor (그래픽 3)", "staff-line", "floor", 3.0),
    ("덧줄 pink-strong / zone (그래픽 3)", "pink-strong", "zone", 3.0),
    ("덧줄 pink-strong / band-out (그래픽 3)", "pink-strong", "band-out", 3.0),
    ("눈동자 pupil / 흰자 #FFFFFF", "pupil", "#FFFFFF", 4.5),
]

bad = 0
for name, t in (("라이트", light), ("다크", dark)):
    print(f"\n== {name} ==")
    for desc, fg, bg, need in PAIRS:
        f = t.get(fg, fg); b = t.get(bg, bg)
        base = t["card"] if bg.startswith("pill") else t["bg"]
        r = ratio(f, b, base)
        flag = "" if r >= need else "  ← 부족"
        if r < need: bad += 1
        print(f"{r:5.2f} (≥{need})  {desc}{flag}")
    # 계이름 배지: badge-ink 위 파스텔
    worst = min((ratio(t["badge-ink"], c, t["bg"]), k) for k, c in SOLF.items())
    print(f"{worst[0]:5.2f} (≥4.5)  계이름 배지 badge-ink / 파스텔 중 최저 ({worst[1]})" + ("" if worst[0] >= 4.5 else "  ← 부족"))
    if worst[0] < 4.5: bad += 1
print("\n부족한 쌍:", bad)
sys.exit(1 if bad else 0)
