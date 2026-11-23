"""Rasterise the CatPad cat sticker to public/brand/cat-logo.png.

The navbar logo path expects an image file at public/brand/cat-logo.png.
This script draws the same geometry as src/components/Cat.tsx at 1024px so the
file always exists; drop the original artwork over it to use the exact export.
"""

from PIL import Image, ImageDraw

SIZE = 1024
SS = 2  # supersample factor

# Artwork space: x 28..180, y 6..166 (matches the SVG viewBox of Cat.tsx)
VB_X, VB_Y, VB_W, VB_H = 28, 6, 152, 160
scale = (SIZE * SS) / VB_H
off_x = ((SIZE * SS) - VB_W * scale) / 2 - VB_X * scale
off_y = -VB_Y * scale

INK = (10, 10, 10, 255)
WHITE = (255, 255, 255, 255)
GOLD = (245, 197, 66, 255)


def pt(x, y):
    return (x * scale + off_x, y * scale + off_y)


def cubic(p0, p1, p2, p3, steps=48):
    out = []
    for i in range(1, steps + 1):
        t = i / steps
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        out.append((x, y))
    return out


def head_outline():
    start = (46, 76)
    curves = [
        ((40, 92), (38, 104), (42, 116)),
        ((48, 140), (72, 154), (100, 154)),
        ((130, 154), (160, 138), (166, 116)),
        ((170, 100), (166, 86), (158, 76)),
        ((146, 62), (128, 58), (110, 62)),
        ((96, 66), (82, 62), (68, 66)),
        ((58, 68), (50, 70), (46, 76)),
    ]
    points = [start]
    current = start
    for c1, c2, end in curves:
        points.extend(cubic(current, c1, c2, end))
        current = end
    return [pt(x, y) for x, y in points]


def ear_left():
    p = [(57, 94), (53, 27)]
    p.extend(cubic((53, 27), (52.6, 20), (60, 17), (64.5, 22.5)))
    p.append((93, 63))
    return [pt(x, y) for x, y in p]


def ear_right():
    p = [(109, 61), (137, 21)]
    p.extend(cubic((137, 21), (140.5, 14.5), (148, 17.5), (148, 25)))
    p.append((151, 86))
    return [pt(x, y) for x, y in p]


def whiskers(draw):
    strokes = [
        ((40, 122), (62, 116)),
        ((42, 134), (64, 129)),
        ((144, 103), (166, 99)),
        ((142, 115), (164, 111)),
    ]
    width = int(4.6 * scale)
    for (x1, y1), (x2, y2) in strokes:
        a, b = pt(x1, y1), pt(x2, y2)
        draw.line([a, b], fill=INK, width=width)
        r = width / 2
        for cx, cy in (a, b):
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=INK)


def circle(draw, cx, cy, r, fill):
    x, y = pt(cx, cy)
    rr = r * scale
    draw.ellipse([x - rr, y - rr, x + rr, y + rr], fill=fill)


def main():
    canvas = Image.new("RGBA", (SIZE * SS, SIZE * SS), INK)
    draw = ImageDraw.Draw(canvas)

    draw.polygon(ear_left(), fill=WHITE)
    draw.polygon(ear_right(), fill=WHITE)
    draw.polygon(head_outline(), fill=WHITE)

    circle(draw, 80, 101, 20.25, INK)
    circle(draw, 124, 94, 20.25, INK)
    circle(draw, 80, 101, 13.75, GOLD)
    circle(draw, 124, 94, 13.75, GOLD)
    circle(draw, 80, 101, 8.6, INK)
    circle(draw, 124, 94, 8.6, INK)

    whiskers(draw)

    canvas = canvas.resize((SIZE, SIZE), Image.LANCZOS).convert("RGB")
    canvas.save("public/brand/cat-logo.png", "PNG", optimize=True)
    print("wrote public/brand/cat-logo.png", canvas.size)


if __name__ == "__main__":
    main()
