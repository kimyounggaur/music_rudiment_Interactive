import sys
from pathlib import Path
from PIL import Image, ImageDraw

d = Path(sys.argv[1])

def load(n, scale):
    im = Image.open(d / n).convert("RGB")
    return im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)

def sheet(items, cols, scale, name, bg=(120, 120, 130), pad=10):
    ims = [(t, load(f, scale)) for t, f in items if (d / f).exists()]
    if not ims: return
    w = max(i.width for _, i in ims); h = max(i.height for _, i in ims)
    rows = (len(ims) + cols - 1) // cols
    S = Image.new("RGB", (cols * (w + pad) + pad, rows * (h + pad + 16) + pad), bg)
    dr = ImageDraw.Draw(S)
    for k, (t, im) in enumerate(ims):
        x = pad + (k % cols) * (w + pad); y = pad + (k // cols) * (h + pad + 16)
        dr.text((x, y), t, fill=(255, 255, 255))
        S.paste(im, (x, y + 14))
    S.save(d / name)
    print(name, S.size)

sheet([("L rest", "390x844-light-rest.png"), ("L p20", "390x844-light-p20.png"), ("L p15", "390x844-light-p15.png"), ("L p1", "390x844-light-p1.png"),
       ("D rest", "390x844-dark-rest.png"), ("D p20", "390x844-dark-p20.png"), ("D p15", "390x844-dark-p15.png"), ("D p1", "390x844-dark-p1.png")], 4, 0.4, "sheetA.png")
sheet([("375x667 L rest", "375x667-light-rest.png"), ("375x667 L p20", "375x667-light-p20.png"), ("375x667 L p6", "375x667-light-p6.png"),
       ("360x740 D p20", "360x740-dark-p20.png"), ("360x740 D p1", "360x740-dark-p1.png"),
       ("430x932 L p15", "430x932-light-p15.png"), ("430x932 L p1", "430x932-light-p1.png")], 4, 0.4, "sheetB.png")
faces = [("rest", "face-rest.png"), ("grab-up", "face-grab-up.png"), ("grab-out", "face-grab-out.png"), ("happy", "face-happy.png"), ("out-open", "face-out-open.png")]
sheet(faces, 5, 1.6, "sheetC.png", bg=(200, 200, 205))
