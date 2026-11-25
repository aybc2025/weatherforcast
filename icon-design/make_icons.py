#!/usr/bin/env python3
"""Generates the app icon set into ../icons.

Concept: a warm sun peeking out from behind a cloud, on a night-blue tile --
the same sun/cloud language as the app's weather hero card.
Draws at 8x the target size and downsamples with LANCZOS for crisp edges.
"""
import math
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
SS = 8
TOP, BOTTOM = (0x2B, 0x6F, 0xD6), (0x0C, 0x15, 0x30)
SUN, CLOUD = (0xFF, 0xB5, 0x47), (0xF2, 0xF6, 0xFD)


def gradient(n):
    img = Image.new("RGB", (n, n))
    px = ImageDraw.Draw(img)
    for y in range(n):
        t = y / (n - 1)
        px.line([(0, y), (n, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM)))
    return img


def draw_art(n, k=1.0, rays=True):
    """Transparent RGBA layer with the sun + cloud, scaled by k around the centre."""
    layer = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = n / 2

    def P(x, y):
        return (c + (x - 0.5) * n * k, c + (y - 0.5) * n * k)

    def R(r):
        return r * n * k

    sx, sy = 0.40, 0.38
    d.ellipse([*(P(sx, sy)[i] - R(0.17) for i in (0, 1)), *(P(sx, sy)[i] + R(0.17) for i in (0, 1))], fill=SUN)
    if rays:
        w = max(2, round(R(0.045)))
        for a in range(0, 360, 45):
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            p1, p2 = P(sx + 0.215 * ca, sy + 0.215 * sa), P(sx + 0.26 * ca, sy + 0.26 * sa)
            d.line([p1, p2], fill=SUN, width=w)
            for q in (p1, p2):
                d.ellipse([q[0] - w / 2, q[1] - w / 2, q[0] + w / 2, q[1] + w / 2], fill=SUN)
    # cloud: outline in tile colour first (separates it from the sun), then fill
    def cloud(fill, grow):
        g = grow
        x0, y0 = P(0.22 - g, 0.56 - g)
        x1, y1 = P(0.80 + g, 0.75 + g)
        d.rounded_rectangle([x0, y0, x1, y1], radius=R(0.095 + g), fill=fill)
        for cx, cy, r in ((0.37, 0.585, 0.125), (0.54, 0.53, 0.16), (0.68, 0.62, 0.105)):
            px, py = P(cx, cy)
            rr = R(r + g)
            d.ellipse([px - rr, py - rr, px + rr, py + rr], fill=fill)
    cloud((0x14, 0x2A, 0x5C, 255), 0.022)
    cloud(CLOUD + (255,), 0.0)
    return layer


def make(size, k=1.0, rays=True, shape="tile"):
    n = size * SS
    base = gradient(n).convert("RGBA")
    base.alpha_composite(draw_art(n, k, rays))
    if shape == "tile":  # rounded square with transparent corners
        mask = Image.new("L", (n, n), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, n - 1, n - 1], radius=n * 0.22, fill=255)
        base.putalpha(mask)
    return base.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    make(192).save(f"{OUT}/icon-192.png")
    make(512).save(f"{OUT}/icon-512.png")
    make(512, k=0.84, shape="full").save(f"{OUT}/icon-512-maskable.png")
    make(180, k=0.94, shape="full").convert("RGB").save(f"{OUT}/apple-touch-icon.png")
    make(32, k=1.12, rays=False).save(f"{OUT}/favicon-32.png")
    print("icons written to", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
