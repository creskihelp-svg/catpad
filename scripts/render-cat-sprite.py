"""Rasterise the 16-frame CatPad blink sprite to public/brand/cat-sprite.png.

4x4 sheet, square cells, transparent background: the cat sits in the navbar and
blinks on loop (ears flatten, eyes shut, then open again).

Run: python3 scripts/render-cat-sprite.py
"""

from PIL import Image, ImageDraw

COLS = 4
ROWS = 4
CELL = 256
SS = 3  # supersample factor per cell

INK = (10, 10, 10, 255)
WHITE = (255, 255, 255, 255)
GOLD = (246, 197, 60, 255)


def cubic(p0, p1, p2, p3, steps=26):
    out = []
    for i in range(1, steps + 1):
        t = i / steps
        mt = 1 - t
        out.append(
            (
                mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0],
                mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1],
            )
        )
    return out


def chain(start, segments):
    pts = [start]
    cur = start
    for c1, c2, end in segments:
        pts.extend(cubic(cur, c1, c2, end))
        cur = end
    return pts


def silhouette(flat):
    """Right half of the head, then mirrored. `flat` 0..1 flattens the ears."""
    f = flat
    ty = 6 + 18 * f  # ear tip height
    tx = 80 + 2 * f  # ear tip x
    half = chain(
        (50, 26 + 3 * f),
        [
            ((55, 26 + 3 * f), (62, 25 + 2 * f), (67, 25 + 2 * f)),
            ((70, 18 + 12 * f), (74, 8 + 20 * f), (tx, ty)),
            ((tx + 4, ty - 2), (tx + 6, ty + 2), (tx + 7, ty + 8)),
            ((tx + 8, ty + 18), (91, 34), (91, 44)),
            ((92, 58), (90, 74), (84, 82)),
            ((76, 90), (64, 92), (50, 92)),
        ],
    )
    left = [(100 - x, y) for x, y in half][::-1]
    pts = left + half[1:]
    # flattening also squashes the face a little, like the artwork
    return [(50 + (x - 50) * (1 + 0.045 * f), 92 - (92 - y) * (1 - 0.05 * f)) for x, y in pts]


def eye(draw, cx, cy, r, opening):
    """opening: 1 = wide open, ~0.35 = half shut."""
    ry = r * opening
    if ry < r * 0.4:
        # lids shut: one shallow arc, like a contented cat
        span = r * 0.86
        arc = chain(
            (cx - span, cy + r * 0.14),
            [
                (
                    (cx - span * 0.5, cy - r * 0.5),
                    (cx + span * 0.5, cy - r * 0.5),
                    (cx + span, cy + r * 0.14),
                )
            ],
        )
        draw.line(arc, fill=INK, width=int(r * 0.3), joint="curve")
        for x, y in (arc[0], arc[-1]):
            rr = r * 0.17
            draw.ellipse([x - rr, y - rr, x + rr, y + rr], fill=INK)
        return

    def ell(radius_x, radius_y, fill):
        draw.ellipse([cx - radius_x, cy - radius_y, cx + radius_x, cy + radius_y], fill=fill)

    ell(r, ry, INK)
    ell(r - r * 0.17, max(ry - r * 0.17, r * 0.2), GOLD)
    # The pupil is deliberately left out: the navbar draws it on top so it can
    # follow the pointer. See .cat-logo-pupil in src/index.css.


def whiskers(draw, width, mapfn):
    strokes = [((32, 71), (18, 68)), ((33, 79), (20, 77)), ((68, 71), (82, 68)), ((67, 79), (80, 77))]
    for (x0, y0), (x1, y1) in strokes:
        a, b = mapfn((x0, y0)), mapfn((x1, y1))
        draw.line([a, b], fill=INK, width=width)
        for x, y in (a, b):
            rr = width / 2
            draw.ellipse([x - rr, y - rr, x + rr, y + rr], fill=INK)


def draw_frame(flat, opening):
    size = CELL * SS
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    scale = (size * 0.98) / 100.0
    off = (size - 100 * scale) / 2

    def mapped(points):
        return [(x * scale + off, y * scale + off) for x, y in points]

    body = mapped(silhouette(flat))
    stroke = int(4.6 * scale)
    draw.line(body + [body[0]], fill=INK, width=stroke, joint="curve")
    draw.polygon(body, fill=WHITE)

    # eyes (drawn after the head so they sit on the face)
    for cx in (36, 64):
        ex, ey = cx * scale + off, 54 * scale + off
        eye(draw, ex, ey, 11.9 * scale, opening)

    whiskers(draw, int(3.4 * scale), lambda p: (p[0] * scale + off, p[1] * scale + off))

    return img.resize((CELL, CELL), Image.LANCZOS)


# (ear flatten, eye opening) per frame — one blink inside a calm loop.
FRAMES = [
    (0.00, 1.00),
    (0.10, 1.00),
    (0.00, 1.00),
    (0.04, 1.00),
    (0.00, 1.00),
    (0.00, 1.00),
    (0.22, 0.62),
    (0.62, 0.30),
    (0.92, 0.00),
    (1.00, 0.00),
    (0.70, 0.34),
    (0.30, 0.80),
    (0.08, 1.00),
    (0.00, 1.00),
    (0.10, 1.00),
    (0.00, 1.00),
]


def main():
    sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
    for index, (flat, opening) in enumerate(FRAMES):
        frame = draw_frame(flat, opening)
        col, row = index % COLS, index // COLS
        sheet.paste(frame, (col * CELL, row * CELL), frame)
    sheet.save("public/brand/cat-sprite.png", "PNG", optimize=True)
    print("wrote public/brand/cat-sprite.png", sheet.size, "frames:", len(FRAMES))


if __name__ == "__main__":
    main()
