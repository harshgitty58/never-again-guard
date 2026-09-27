"""
Render the "midnight" starfield used behind the slides (matches the dashboard's
Starfield.tsx palette: white stars, a few blue/teal ones, faint nebula glows).

Output: docs/submission/img/sky.png  (3200x1800, i.e. 2.5x of a 1280x720 slide,
wide enough that each slide can show a different part of the sky).

Run: py docs/brand/make_sky.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/submission/img/sky.png"
W, H = 3200, 1800
rng = np.random.default_rng(20260927)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
img = np.zeros((H, W, 3), np.float32)
img[:] = (8, 9, 10)  # --bg #08090a


def glow(cx, cy, radius, color, strength):
    d2 = ((xx - cx) ** 2 + (yy - cy) ** 2) / (radius ** 2)
    img[:] += np.exp(-d2)[..., None] * np.array(color, np.float32) * strength


# Nebula haze, spread so every slide crop catches some
glow(0.80 * W, 0.15 * H, 0.32 * W, (69, 137, 255), 0.10)
glow(0.15 * W, 0.75 * H, 0.30 * W, (43, 217, 159), 0.07)
glow(0.50 * W, 1.05 * H, 0.35 * W, (69, 137, 255), 0.07)
glow(0.35 * W, 0.20 * H, 0.22 * W, (120, 90, 255), 0.035)

# Stars
count = int(W * H / 2600)
xs = rng.uniform(0, W, count)
ys = rng.uniform(0, H, count)
size = rng.uniform(0, 1, count)
alpha = rng.uniform(0.18, 0.85, count)
tint = rng.uniform(0, 1, count)
colors = np.where(
    (tint < 0.10)[:, None], np.array([120, 165, 255]),
    np.where((tint < 0.13)[:, None], np.array([120, 240, 200]), np.array([235, 238, 245])),
).astype(np.float32)

for x, y, s, a, c in zip(xs, ys, size, alpha, colors):
    r = 0.55 + s * 0.9 if s < 0.88 else 1.4 + (s - 0.88) * 14  # px at this resolution
    halo = r > 1.9
    reach = int(np.ceil(r * (6 if halo else 2))) + 1
    x0, x1 = max(int(x) - reach, 0), min(int(x) + reach + 1, W)
    y0, y1 = max(int(y) - reach, 0), min(int(y) + reach + 1, H)
    if x0 >= x1 or y0 >= y1:
        continue
    px, py = np.meshgrid(np.arange(x0, x1), np.arange(y0, y1))
    d = np.sqrt((px - x) ** 2 + (py - y) ** 2)
    core = np.clip(r + 0.5 - d, 0, 1)  # anti-aliased disc
    k = core * a
    if halo:
        k = np.maximum(k, np.exp(-(d / (r * 2.2)) ** 2) * a * 0.35)
    patch = img[y0:y1, x0:x1]
    patch[:] = patch * (1 - k[..., None]) + c * k[..., None]

OUT.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(OUT, optimize=True)
print("wrote", OUT.relative_to(ROOT), f"{W}x{H}", count, "stars")
