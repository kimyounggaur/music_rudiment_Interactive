"""테스트한 엔진과 Bravura 글리프를 모바일 페이지에 넣어 게시용 파일과 미리보기 파일을 만든다."""
import json, re, sys
from pathlib import Path

here = Path(__file__).parent
engine = (here / "engine.js").read_text(encoding="utf-8")
engine = re.sub(r"\nif \(typeof module !== 'undefined'\) \{.*?\n\}\n?", "\n", engine, flags=re.S)
glyphs = json.loads((here / "glyphs.json").read_text(encoding="utf-8"))
gl = {k: {"d": glyphs[k]["d"], "bbox": glyphs[k]["bbox"]} for k in ("gClef", "noteheadBlack", "noteEighthUp")}

tpl_name = sys.argv[1] if len(sys.argv) > 1 else "page.template.html"
out_name = sys.argv[2] if len(sys.argv) > 2 else "oseon-001-mobile"
preview_name = "preview.html" if len(sys.argv) <= 2 else f"preview-{out_name}.html"
tpl = (here / tpl_name).read_text(encoding="utf-8")
assert "/*__ENGINE__*/" in tpl and "/*__GLYPHS__*/null" in tpl
page = tpl.replace("/*__ENGINE__*/", engine.strip()).replace("/*__GLYPHS__*/null", json.dumps(gl, separators=(",", ":")))
(here / f"{out_name}.html").write_text(page, encoding="utf-8")

# 미리보기: 샌드박스에서는 Google Fonts에 닿지 않으므로 같은 글꼴(Jua, Gowun Dodum)을 로컬 파일로 불러온다
skeleton = (
    '<!doctype html><html lang="ko"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    '<link rel="stylesheet" href="fonts/jua.css"><link rel="stylesheet" href="fonts/gowun-dodum.css">'
    '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}'
    'body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>'
    '</head><body>'
)
(here / preview_name).write_text(skeleton + page + "</body></html>", encoding="utf-8")
script = re.search(r"<script>(.*)</script>", page, flags=re.S).group(1)
(here / "inline-check.js").write_text(script, encoding="utf-8")
print("built", out_name, len(page.encode("utf-8")), "bytes ->", preview_name)
