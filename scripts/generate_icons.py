#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFont

ICONS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")
os.makedirs(ICONS_DIR, exist_ok=True)

def draw_app_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (9, 13, 22, 255))
    draw = ImageDraw.Draw(img)

    # Rounded border
    pad = int(size * 0.08)
    r = int(size * 0.22)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=r, fill=(15, 23, 42, 255), outline=(56, 189, 248, 180), width=max(2, int(size * 0.025)))

    # Flask representation
    cx, cy = size // 2, size // 2
    neck_w = int(size * 0.14)
    neck_h = int(size * 0.22)
    base_w = int(size * 0.52)
    base_h = int(size * 0.35)

    # Flask body
    points = [
        (cx - neck_w // 2, cy - neck_h),
        (cx + neck_w // 2, cy - neck_h),
        (cx + neck_w // 2, cy - neck_h // 3),
        (cx + base_w // 2, cy + base_h),
        (cx - base_w // 2, cy + base_h),
        (cx - neck_w // 2, cy - neck_h // 3),
    ]
    draw.polygon(points, outline=(56, 189, 248, 255), width=max(3, int(size * 0.035)))

    # Liquid fill inside flask
    liquid_points = [
        (cx - int(base_w * 0.4), cy + int(base_h * 0.3)),
        (cx + int(base_w * 0.4), cy + int(base_h * 0.3)),
        (cx + int(base_w * 0.45), cy + int(base_h * 0.9)),
        (cx - int(base_w * 0.45), cy + int(base_h * 0.9)),
    ]
    draw.polygon(liquid_points, fill=(99, 102, 241, 180))

    # Bubbles
    bubble_r1 = max(3, int(size * 0.04))
    bubble_r2 = max(2, int(size * 0.025))
    draw.ellipse([cx - bubble_r1, cy + int(base_h * 0.4) - bubble_r1, cx + bubble_r1, cy + int(base_h * 0.4) + bubble_r1], fill=(52, 211, 153, 230))
    draw.ellipse([cx + int(neck_w * 0.6) - bubble_r2, cy - bubble_r2, cx + int(neck_w * 0.6) + bubble_r2, cy + bubble_r2], fill=(56, 189, 248, 220))

    return img

def draw_og_preview() -> Image.Image:
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), (9, 13, 22, 255))
    draw = ImageDraw.Draw(img)

    # Accent grid lines
    for x in range(0, w, 40):
        draw.line([(x, 0), (x, h)], fill=(15, 23, 42, 100), width=1)
    for y in range(0, h, 40):
        draw.line([(0, y), (w, y)], fill=(15, 23, 42, 100), width=1)

    # Main icon on left
    icon = draw_app_icon(280)
    img.paste(icon, (100, 175), icon)

    # Title & Subtitle text (draw simple geometric banner)
    draw.text((430, 200), "ReactaGrid", fill=(56, 189, 248, 255), font_size=84)
    draw.text((435, 305), "2D Cellular Automata Chemistry Sandbox & Game", fill=(241, 245, 249, 255), font_size=32)
    draw.text((435, 360), "Real Physics • Empirical Reactions • Thermodynamics • PWA", fill=(148, 163, 184, 255), font_size=24)

    # Tag badges
    draw.rounded_rectangle([435, 420, 565, 465], radius=10, fill=(16, 185, 129, 40), outline=(16, 185, 129, 180), width=2)
    draw.text((455, 432), "60 FPS Worker", fill=(52, 211, 153, 255), font_size=16)

    draw.rounded_rectangle([580, 420, 715, 465], radius=10, fill=(99, 102, 241, 40), outline=(99, 102, 241, 180), width=2)
    draw.text((605, 432), "Zero-Hallucination", fill=(165, 180, 252, 255), font_size=16)

    draw.rounded_rectangle([730, 420, 850, 465], radius=10, fill=(245, 158, 11, 40), outline=(245, 158, 11, 180), width=2)
    draw.text((755, 432), "IndexedDB", fill=(251, 191, 36, 255), font_size=16)

    return img

def main():
    icon_192 = draw_app_icon(192)
    icon_192.save(os.path.join(ICONS_DIR, "icon-192x192.png"))
    print("-> Generated icon-192x192.png")

    icon_512 = draw_app_icon(512)
    icon_512.save(os.path.join(ICONS_DIR, "icon-512x512.png"))
    print("-> Generated icon-512x512.png")

    og = draw_og_preview()
    og.save(os.path.join(PUBLIC_DIR, "og-preview.png"))
    print("-> Generated og-preview.png")

if __name__ == "__main__":
    main()
