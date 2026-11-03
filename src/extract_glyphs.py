"""Bravura(OFL)에서 높은음자리표와 검은 음표머리 윤곽을 SVG path로 꺼낸다.
좌표: 1 staff space = 1 단위, 원점 = 글리프 기준점(높은음자리표는 G줄), y는 아래로 +."""
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

font_path, out_path = sys.argv[1], sys.argv[2]
f = TTFont(font_path)
upm = f["head"].unitsPerEm          # SMuFL: 1 em = 4 staff spaces
sp = upm / 4.0
cmap = f.getBestCmap()
gs = f.getGlyphSet()
out = {"upm": upm}
for key, cp in {"gClef": 0xE050, "noteheadBlack": 0xE0A4, "noteEighthUp": 0xE1D7}.items():
    name = cmap[cp]
    bp = BoundsPen(gs); gs[name].draw(bp)
    pen = SVGPathPen(gs, ntos=lambda v: ("%.3f" % v).rstrip("0").rstrip("."))
    tp = TransformPen(pen, (1 / sp, 0, 0, -1 / sp, 0, 0))   # staff-space 단위, y 뒤집기
    gs[name].draw(tp)
    xmin, ymin, xmax, ymax = [v / sp for v in bp.bounds]
    out[key] = {"d": pen.getCommands(), "bbox": [round(xmin, 3), round(-ymax, 3), round(xmax, 3), round(-ymin, 3)],
                "advance": round(gs[name].width / sp, 3)}
    print(key, name, "len", len(out[key]["d"]), "bbox(x0,yTop,x1,yBot)", out[key]["bbox"])
json.dump(out, open(out_path, "w"))
