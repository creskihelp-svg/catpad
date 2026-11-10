#!/usr/bin/env python3
"""
Generates flat, gradient-free placeholder brand assets for CatPad.
The real logo / favicon / OG image / hero poster / coin image supplied by the
owner should simply overwrite the files in public/ and public/brand/.

Usage: python3 scripts/generate-brand-assets.py
"""

import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
BRAND = os.path.join(PUBLIC, "brand")

BLACK = (0, 0, 0, 255)
NEAR_BLACK = (8, 8, 10, 255)
CARD = (11, 11, 13, 255)
LINE = (31, 31, 35, 255)
ORANGE = (255, 106, 0, 255)


def write_png(path, width, height, pixels):
    """pixels: list of rows, each row a list of (r, g, b, a) tuples."""
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for r, g, b, a in row:
            raw.extend((r, g, b, a))

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(png)


def blank(width, height, color):
    return [[color for _ in range(width)] for _ in range(height)]


def rect(pixels, x0, y0, x1, y1, color):
    height = len(pixels)
    width = len(pixels[0])
    for y in range(max(0, y0), min(height, y1)):
        row = pixels[y]
        for x in range(max(0, x0), min(width, x1)):
            row[x] = color


def blit_logo_block(pixels, x, y, size, color=ORANGE):
    """Flat orange square with two black cat ears cut out."""
    rect(pixels, x, y, x + size, y + size, color)
    ear = size // 3
    gap = size // 8
    # two triangular ears in black
    for i in range(ear):
        width = ear - i
        for j in range(width):
            px = x + gap + j
            py = y + gap + i
            if 0 <= py < len(pixels) and 0 <= px < len(pixels[0]):
                pixels[py][px] = BLACK
            px2 = x + size - gap - 1 - j
            if 0 <= py < len(pixels) and 0 <= px2 < len(pixels[0]):
                pixels[py][px2] = BLACK


def make_og():
    w, h = 1200, 630
    px = blank(w, h, BLACK)
    rect(px, 80, 80, 112, 112, ORANGE)
    rect(px, 80, 470, 520, 478, ORANGE)
    rect(px, 80, 506, 360, 512, LINE)
    rect(px, 80, 540, 260, 546, LINE)
    write_png(os.path.join(PUBLIC, "og.png"), w, h, px)


def make_hero_poster():
    w, h = 1600, 900
    px = blank(w, h, NEAR_BLACK)
    # sparse flat grid, no glows
    for x in range(0, w, 80):
        rect(px, x, 0, x + 1, h, (14, 14, 16, 255))
    for y in range(0, h, 80):
        rect(px, 0, y, w, y + 1, (14, 14, 16, 255))
    rect(px, 0, h - 6, w, h, ORANGE)
    write_png(os.path.join(BRAND, "hero-poster.png"), w, h, px)


def make_coin():
    size = 512
    ss = 3  # supersampling factor
    px = blank(size, size, (0, 0, 0, 0))
    cx = cy = size / 2
    radius = size / 2 - 8

    for y in range(size):
        for x in range(size):
            hits = 0
            total = ss * ss
            for sy in range(ss):
                for sx in range(ss):
                    fx = x + (sx + 0.5) / ss
                    fy = y + (sy + 0.5) / ss
                    dx, dy = fx - cx, fy - cy
                    if math.hypot(dx, dy) <= radius:
                        hits += 1
            if hits == 0:
                continue
            coverage = hits / total
            px[y][x] = (ORANGE[0], ORANGE[1], ORANGE[2], int(255 * coverage))

    # flat dark cat silhouette: ears + head + eyes
    head_r = size * 0.19
    for y in range(size):
        for x in range(size):
            fx, fy = x + 0.5, y + 0.5
            dx, dy = fx - cx, fy - (cy + size * 0.02)
            inside = math.hypot(dx, dy) <= head_r
            # ears: triangles above the head
            ex = abs(dx)
            if size * 0.06 < ex < size * 0.16 and -size * 0.30 < dy < -size * 0.02:
                t = (ex - size * 0.06) / (size * 0.10)
                if dy < -size * 0.30 + t * size * 0.28:
                    inside = True
            if inside:
                px[y][x] = BLACK
    # eyes
    for ex in (-0.075, 0.075):
        for y in range(size):
            for x in range(size):
                if math.hypot(x + 0.5 - (cx + size * ex), y + 0.5 - (cy + size * 0.00)) <= size * 0.022:
                    px[y][x] = ORANGE

    write_png(os.path.join(BRAND, "coin.png"), size, size, px)


def make_logo_svg():
    svg = """<svg width="220" height="48" viewBox="0 0 220 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#FF6A00"/>
  <path d="M11 17 L17 24 L11 24 Z" fill="#000000"/>
  <path d="M37 17 L31 24 L37 24 Z" fill="#000000"/>
  <circle cx="24" cy="29" r="8" fill="#000000"/>
  <circle cx="21" cy="28" r="1.6" fill="#FF6A00"/>
  <circle cx="27" cy="28" r="1.6" fill="#FF6A00"/>
  <text x="60" y="33" font-family="Space Grotesk, Helvetica, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="-0.5" fill="#FFFFFF">Cat</text>
  <text x="106" y="33" font-family="Space Grotesk, Helvetica, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="-0.5" fill="#FF6A00">Pad</text>
</svg>
"""
    with open(os.path.join(BRAND, "logo.svg"), "w", encoding="utf-8") as fh:
        fh.write(svg)


def make_favicon_svg():
    svg = """<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="14" fill="#FF6A00"/>
  <path d="M15 23 L22 32 L15 32 Z" fill="#000000"/>
  <path d="M49 23 L42 32 L49 32 Z" fill="#000000"/>
  <circle cx="32" cy="38" r="10.5" fill="#000000"/>
  <circle cx="28" cy="37" r="2.1" fill="#FF6A00"/>
  <circle cx="36" cy="37" r="2.1" fill="#FF6A00"/>
</svg>
"""
    with open(os.path.join(PUBLIC, "favicon.svg"), "w", encoding="utf-8") as fh:
        fh.write(svg)


if __name__ == "__main__":
    os.makedirs(BRAND, exist_ok=True)
    make_og()
    make_hero_poster()
    make_coin()
    make_logo_svg()
    make_favicon_svg()
    print("Brand placeholders written to public/")
