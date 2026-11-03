"""모바일 렌더 점검: 여러 폰 크기 × 라이트/다크, 마우스·터치 드래그, 이벤트 수, 레이아웃 흔들림, 넘침, 스크린샷."""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:8765/" + (sys.argv[2] if len(sys.argv) > 2 else "preview.html")
errors, report = [], []

LISTEN = """
window.__ev = [];
document.addEventListener('notemove', e => window.__ev.push(['move', e.detail.via, e.detail.to.p, e.detail.direction, e.detail.from.p]));
document.addEventListener('notedrop', e => window.__ev.push(['drop', e.detail.via, e.detail.at.p]));
"""

JS_STATE = """() => {
  const q = s => document.querySelector(s);
  const r = el => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(v => Math.round(v * 10) / 10); };
  const note = q('#note');
  const yOf = p => q('.lab[data-p="' + p + '"]').getBoundingClientRect();
  return {
    p: +note.getAttribute('aria-valuenow'),
    name: q('#ro-name').textContent.trim(),
    card: r(q('#stage-card')), panel: r(q('.panel')), read: r(q('.read')), explain: r(q('#ro-exp')),
    scrollH: document.documentElement.scrollHeight, clientH: document.documentElement.clientHeight,
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
    step: Math.round(((yOf(10).top + yOf(10).height / 2) - (yOf(9).top + yOf(9).height / 2)) * 100) / 100,
    fonts: [document.fonts.check('16px Jua'), document.fonts.check('16px "Gowun Dodum"')]
  };
}"""

JS_OVERFLOW = """() => {
  const bad = [];
  for (const sel of ['.name', '.chips', '.dir', '.eyebrow', 'h1', '.btn', '.chip', '.solf', '.explain', '.sub']) {
    document.querySelectorAll(sel).forEach(el => { if (el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1) bad.push([sel, el.scrollWidth, el.clientWidth, el.textContent.trim().slice(0, 20)]); });
  }
  const W = innerWidth;
  document.querySelectorAll('.app > *, .app .read > *, .app .top > *, .app .btns > *, .app .chips > *').forEach(el => {
    const b = el.getBoundingClientRect();
    if (b.width && (b.left < -0.5 || b.right > W + 0.5)) bad.push(['out-of-viewport', el.className, Math.round(b.left), Math.round(b.right)]);
  });
  const svg = document.querySelector('#stage'), sb = svg.getBoundingClientRect();
  svg.querySelectorAll('.lab, .tag').forEach(g => {
    const t = g.querySelector('text'), rc = g.querySelector('rect');
    const tb = t.getBBox(), rb = rc.getBBox();
    if (tb.width > rb.width - 4) bad.push(['pill-text', g.getAttribute('data-p') || t.textContent, Math.round(tb.width), Math.round(rb.width)]);
    const b = rc.getBoundingClientRect();
    if (b.left < sb.left - 0.5 || b.right > sb.right + 0.5) bad.push(['pill-out', g.getAttribute('data-p') || t.textContent, Math.round(b.left), Math.round(b.right)]);
  });
  return bad;
}"""

JS_BUBBLE = """() => {
  const b = document.querySelector('#bubble'), c = document.querySelector('#stage-card').getBoundingClientRect();
  const r = b.getBoundingClientRect();
  return { show: b.classList.contains('show'), text: b.textContent, inside: r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5, r: [r.left, r.top, r.right, r.bottom].map(Math.round), c: [c.left, c.top, c.right, c.bottom].map(Math.round) };
}"""

def note_center(pg):
    b = pg.locator("#note .head").bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2

def mouse_drag(pg, steps, h, wait=90):
    x, y = note_center(pg)
    pg.mouse.move(x, y); pg.mouse.down()
    pg.mouse.move(x, y - steps * h, steps=max(4, abs(steps) * 3))
    pg.wait_for_timeout(60)
    pg.mouse.up()
    pg.wait_for_timeout(wait)

def touch_drag(cdp, x, y, dy, n=24):
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "id": 1}]})
    for i in range(1, n + 1):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y + dy * i / n, "id": 1}]})
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})

def go(pg):
    pg.goto(URL)
    pg.wait_for_function("document.fonts.status === 'loaded'")
    pg.wait_for_timeout(700)

def ev_counts(pg):
    ev = pg.evaluate("window.__ev")
    return sum(1 for e in ev if e[0] == "move"), sum(1 for e in ev if e[0] == "drop"), ev

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    configs = [
        ("390x844-light", (390, 844), "light", 2), ("390x844-dark", (390, 844), "dark", 2),
        ("375x667-light", (375, 667), "light", 2), ("375x667-dark", (375, 667), "dark", 2),
        ("360x740-light", (360, 740), "light", 2), ("360x740-dark", (360, 740), "dark", 2),
        ("430x932-light", (430, 932), "light", 2), ("430x932-dark", (430, 932), "dark", 2),
        ("1280x900-light", (1280, 900), "light", 1),
    ]
    for name, vp, scheme, dpr in configs:
        mobile = vp[0] < 600
        ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, color_scheme=scheme, device_scale_factor=dpr, has_touch=mobile, is_mobile=mobile)
        pg = ctx.new_page()
        pg.on("console", lambda m, n=name: m.type in ("error", "warning") and "ERR_TUNNEL" not in m.text and "googleapis" not in m.text and "gstatic" not in m.text and "Failed to load resource" not in m.text and errors.append(f"[{n}] {m.type}: {m.text}"))
        pg.on("pageerror", lambda e, n=name: errors.append(f"[{n}] pageerror: {e}"))
        pg.add_init_script(LISTEN)
        go(pg)
        s0 = pg.evaluate(JS_STATE)
        report.append(f"[{name}] step(h)={s0['step']}px (S={s0['step'] * 2}) card={s0['card']} scrollH/clientH={s0['scrollH']}/{s0['clientH']} fonts={s0['fonts']}")
        if s0["scrollW"] > s0["clientW"]: errors.append(f"[{name}] horizontal overflow {s0['scrollW']} > {s0['clientW']}")
        ov = pg.evaluate(JS_OVERFLOW)
        if ov: errors.append(f"[{name}] overflow items: {ov}")
        bub = pg.evaluate(JS_BUBBLE)
        report.append(f"[{name}] hint bubble: {bub['show']} inside={bub['inside']} '{bub['text']}'")
        if not bub["inside"]: errors.append(f"[{name}] hint bubble outside card {bub}")
        pg.screenshot(path=str(out / f"{name}-rest.png"))

        # 전 구간 흔들림: Home → ArrowUp ×20, 카드·패널·설명 위치가 변하지 않아야 함
        pg.locator("#note").focus()
        pg.keyboard.press("Home"); pg.wait_for_timeout(120)
        states = [pg.evaluate(JS_STATE)]
        for i in range(20):
            pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(40)
            states.append(pg.evaluate(JS_STATE))
        keys = ["card", "panel", "read", "explain"]
        base = states[0]
        drift = [(s["p"], k) for s in states for k in keys if any(abs(a - c) > 0.6 for a, c in zip(s[k], base[k]))]
        sh = {s["scrollH"] for s in states}
        report.append(f"[{name}] sweep 21 positions: drift={drift[:6]} scrollH set={sorted(sh)} last={states[-1]['p']} {states[-1]['name']}")
        if drift or len(sh) > 1: errors.append(f"[{name}] layout shift while moving: {drift[:6]} {sorted(sh)}")
        ov2 = []
        for pos in (20, 0):
            pg.keyboard.press("End" if pos == 20 else "Home"); pg.wait_for_timeout(100)
            o = pg.evaluate(JS_OVERFLOW)
            if o: ov2.append((pos, o))
        if ov2: errors.append(f"[{name}] overflow at extremes: {ov2}")

        # 새로 시작: 마우스 드래그(위 9칸 → p18), 아래로 범위 밖까지(→ p0)
        if mobile is False or name.startswith("390x844"):
            go(pg)
            h = abs(pg.evaluate(JS_STATE)["step"])
            mouse_drag(pg, 9, h)
            mv, dr, ev = ev_counts(pg)
            st = pg.evaluate(JS_STATE)
            report.append(f"[{name}] mouse drag up 9: moves={mv} drops={dr} final p={st['p']} ({st['name']}) via={sorted({e[1] for e in ev})}")
            if mv != 9 or dr != 1 or st["p"] != 18: errors.append(f"[{name}] mouse drag mismatch {mv} {dr} {st['p']}")
            bub = pg.evaluate(JS_BUBBLE)
            report.append(f"[{name}] bubble after drag: {bub['show']} inside={bub['inside']} '{bub['text']}'")
            if bub["show"] and not bub["inside"]: errors.append(f"[{name}] bubble outside card after drag {bub}")
            pg.screenshot(path=str(out / f"{name}-p18.png"))
            pg.evaluate("window.__ev.length = 0")
            mouse_drag(pg, -30, h)
            mv, dr, ev = ev_counts(pg)
            st = pg.evaluate(JS_STATE)
            report.append(f"[{name}] mouse drag down past bottom: moves={mv} drops={dr} final p={st['p']} ({st['name']})")
            if st["p"] != 0 or mv != 18: errors.append(f"[{name}] clamp drag mismatch {mv} {st['p']}")
            pg.wait_for_timeout(200)
            pg.screenshot(path=str(out / f"{name}-p0.png"))

        # 터치 드래그(CDP 실제 터치 이벤트) + 탭 점프
        if name.startswith("390x844"):
            go(pg)
            cdp = ctx.new_cdp_session(pg)
            h = abs(pg.evaluate(JS_STATE)["step"])
            x, y = note_center(pg)
            touch_drag(cdp, x, y, -6 * h)          # 위로 6칸 → p15
            pg.wait_for_timeout(120)
            mv, dr, ev = ev_counts(pg)
            st = pg.evaluate(JS_STATE)
            report.append(f"[{name}] touch drag up 6: moves={mv} drops={dr} final p={st['p']} via={sorted({e[1] for e in ev})} scrollY={pg.evaluate('scrollY')}")
            if st["p"] != 15 or mv != 6: errors.append(f"[{name}] touch drag mismatch {mv} {st['p']}")
            pg.screenshot(path=str(out / f"{name}-touch-p15.png"))
            # 탭 점프: 빈 곳(위쪽 덧줄 구역)을 탭하면 그 자리로
            pg.evaluate("window.__ev.length = 0")
            card = pg.evaluate(JS_STATE)["card"]
            lab = pg.locator('.lab[data-p="19"]').bounding_box()
            ty = lab["y"] + lab["height"] / 2
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": card[0] + 140, "y": ty, "id": 1}]})
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
            pg.wait_for_timeout(150)
            mv, dr, ev = ev_counts(pg)
            st = pg.evaluate(JS_STATE)
            report.append(f"[{name}] tap-jump to p19: final p={st['p']} moves={mv} drops={dr} via={sorted({e[1] for e in ev})}")
            if st["p"] != 19: errors.append(f"[{name}] tap-jump mismatch {st['p']}")
            # 버튼 3개
            pg.evaluate("window.__ev.length = 0")
            pg.click("#up"); pg.wait_for_timeout(120)
            pg.click("#down"); pg.wait_for_timeout(120); pg.click("#down"); pg.wait_for_timeout(120)
            pg.click("#listen"); pg.wait_for_timeout(250)
            mv, dr, ev = ev_counts(pg)
            st = pg.evaluate(JS_STATE)
            report.append(f"[{name}] buttons up,down,down,listen: final p={st['p']} moves={mv} drops={dr} via={[e[1] for e in ev]}")
            if st["p"] != 18 or mv != 3 or dr != 4: errors.append(f"[{name}] button flow mismatch {st['p']} {mv} {dr}")
            pg.screenshot(path=str(out / f"{name}-listen.png"))
            # 소리 끄기 토글이 저장되는지
            pg.click("#snd"); pg.wait_for_timeout(100)
            snd = pg.evaluate("[document.querySelector('#snd').getAttribute('aria-pressed'), localStorage.getItem('oseon001m:sound')]")
            report.append(f"[{name}] sound toggle: {snd}")
            pg.click("#snd")

        # 대표 자리 스크린샷(키보드로 이동)
        if name in ("390x844-light", "390x844-dark", "375x667-light", "360x740-dark", "430x932-light"):
            go(pg)
            pg.locator("#note").focus()
            for tag, key, n in (("p20", "End", 0), ("p15", "End", 5), ("p1", "Home", 1), ("p6", "Home", 6)):
                pg.keyboard.press(key)
                if n:
                    for _ in range(n): pg.keyboard.press("ArrowDown" if key == "End" else "ArrowUp")
                pg.wait_for_timeout(350)
                pg.screenshot(path=str(out / f"{name}-{tag}.png"))
        ctx.close()

    # 마스코트 확대 (DPR 3): 평상시 · 잡았을 때 · 오선 밖 · 드롭 직후
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, color_scheme="light")
    pg = ctx.new_page(); pg.add_init_script(LISTEN); go(pg)
    def face_shot(tag):
        bb = pg.locator("#note .hit").bounding_box()
        pg.screenshot(path=str(out / f"face-{tag}.png"), clip={"x": bb["x"] - 6, "y": bb["y"] - 6, "width": bb["width"] + 12, "height": bb["height"] + 12})
    pg.evaluate("document.querySelector('#bubble').style.display='none'")
    face_shot("rest")
    x, y = note_center(pg)
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x, y - 15, steps=3); pg.wait_for_timeout(300)
    face_shot("grab-up")
    pg.mouse.move(x, y - 15 * 8, steps=8); pg.wait_for_timeout(300)
    face_shot("grab-out")
    pg.mouse.up(); pg.wait_for_timeout(120)
    face_shot("happy")
    pg.wait_for_timeout(1200)
    face_shot("out-open")
    ctx.close()
    b.close()

print("\n".join(report))
print("\n--- 문제 ---")
print("\n".join(errors) if errors else "콘솔 오류·넘침·흔들림 없음")
