"""
Build the Never Again logo assets from the generated source render.

  docs/brand/logo-source.png  (white background, from an image model)
    -> docs/brand/logo-1024.png           transparent master, tight crop
    -> dashboard/public/logo.png          UI mark (256 px, shown at ~28 px)
    -> dashboard/public/icon-512.png      PWA / large icon
    -> dashboard/public/apple-touch-icon.png  180 px on a dark tile
    -> dashboard/public/favicon.ico       16/32/48 on a dark tile
    -> dashboard/public/favicon-32.png

Background removal: only near-white pixels connected to the image border are
removed (flood fill), so white highlights inside the glass stay opaque. A thin
ring at the boundary is un-blended from white ("color to alpha") for clean
edges on dark UIs.

Run: py docs/brand/make_logo.py
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs/brand/logo-source.png"
PUB = ROOT / "dashboard/public"
TILE = (11, 12, 14, 255)  # --bg-raised

rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
h, w, _ = rgb.shape

# 1. Background = near-white, low-saturation pixels reachable from the border.
lo = rgb.min(axis=2)
hi = rgb.max(axis=2)
candidate = (lo > 222) & (hi - lo < 22)
bg = np.zeros((h, w), bool)
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if candidate[y, x] and not bg[y, x]:
            bg[y, x] = True
            q.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        if candidate[y, x] and not bg[y, x]:
            bg[y, x] = True
            q.append((y, x))
while q:
    y, x = q.popleft()
    for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
        if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not bg[ny, nx]:
            bg[ny, nx] = True
            q.append((ny, nx))

# 2. Alpha: 0 on background, 1 inside; un-blend a 3 px ring from white.
fg_img = Image.fromarray((~bg * 255).astype(np.uint8))
inner = np.asarray(fg_img.filter(ImageFilter.MinFilter(7))) > 0  # eroded foreground
ring = ~bg & ~inner
alpha = np.where(bg, 0.0, 1.0)
# color-to-alpha against white: the least-white channel sets opacity
ring_alpha = np.clip((255.0 - lo) / 255.0 * 1.6, 0, 1)
alpha[ring] = ring_alpha[ring]
out_rgb = rgb.copy()
a3 = np.maximum(alpha, 1e-3)[..., None]
unblended = (rgb - (1 - a3) * 255.0) / a3
out_rgb[ring] = np.clip(unblended[ring], 0, 255)
# tiny blur on alpha only, to kill stair-stepping
alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
rgba = Image.fromarray(out_rgb.astype(np.uint8)).convert("RGBA")
rgba.putalpha(alpha_img)

# 3. Tight square crop with even padding.
bbox = rgba.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
crop = rgba.crop(bbox)
side = int(max(crop.size) * 1.04)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2), crop)
master = square.resize((1024, 1024), Image.LANCZOS)
master.save(ROOT / "docs/brand/logo-1024.png")


def sized(img, px, sharpen=False):
    out = img.resize((px, px), Image.LANCZOS)
    return out.filter(ImageFilter.UnsharpMask(radius=0.6, percent=80, threshold=1)) if sharpen else out


def on_tile(px, inset=0.1, radius=0.22):
    tile = Image.new("RGBA", (px * 4, px * 4), (0, 0, 0, 0))
    mask = Image.new("L", tile.size, 0)
    from PIL import ImageDraw

    ImageDraw.Draw(mask).rounded_rectangle((0, 0, tile.width - 1, tile.height - 1), radius=int(tile.width * radius), fill=255)
    tile.paste(Image.new("RGBA", tile.size, TILE), (0, 0), mask)
    mark_px = int(tile.width * (1 - 2 * inset))
    mark = sized(master, mark_px)
    off = (tile.width - mark_px) // 2
    tile.alpha_composite(mark, (off, off))
    return tile.resize((px, px), Image.LANCZOS)


sized(master, 256).save(PUB / "logo.png")
sized(master, 512).save(PUB / "icon-512.png")
on_tile(180, inset=0.12, radius=0.0).convert("RGB").save(PUB / "apple-touch-icon.png")  # iOS rounds corners itself
on_tile(32, inset=0.06).save(PUB / "favicon-32.png")
fav = on_tile(256, inset=0.06)
fav.save(PUB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("ok", bbox, "->", side, "px square")
