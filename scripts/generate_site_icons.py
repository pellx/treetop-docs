#!/usr/bin/env python3
"""Generate Treetop Docs' original leaf-and-book site icons.

Requires Pillow. The SVG source is generated alongside the PNG assets so the
brand mark remains editable without relying on third-party artwork.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

BASE = 512
SUPERSAMPLE = 4
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "img" / "site"

COLORS = {
    "background": "#234F3D",
    "leaf_left": "#C4DFA0",
    "leaf_right": "#7BB380",
    "pages": "#FFF9E8",
    "page_line": "#D7D6BC",
}

LEFT_LEAF = [(244, 202), (182, 196), (122, 158), (104, 86), (174, 92), (228, 126), (254, 168)]
RIGHT_LEAF = [(266, 202), (330, 194), (390, 154), (408, 88), (340, 90), (284, 122), (258, 164)]
LEFT_PAGE = [(82, 236), (206, 242), (256, 278), (256, 410), (206, 382), (82, 360)]
RIGHT_PAGE = [(430, 236), (306, 242), (256, 278), (256, 410), (306, 382), (430, 360)]


def scaled(points: list[tuple[int, int]], factor: float) -> list[tuple[int, int]]:
    return [(round(x * factor), round(y * factor)) for x, y in points]


def points_attr(points: list[tuple[int, int]]) -> str:
    return " ".join(f"{x},{y}" for x, y in points)


def build_svg() -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">树梢文档</title>
  <desc id="desc">深绿色圆角方块中的两片新叶与一本翻开的书</desc>
  <rect x="16" y="16" width="480" height="480" rx="112" fill="{COLORS['background']}"/>
  <path d="M256 292V142" fill="none" stroke="{COLORS['pages']}" stroke-width="18" stroke-linecap="round"/>
  <polygon points="{points_attr(LEFT_LEAF)}" fill="{COLORS['leaf_left']}" stroke-linejoin="round"/>
  <polygon points="{points_attr(RIGHT_LEAF)}" fill="{COLORS['leaf_right']}" stroke-linejoin="round"/>
  <path d="M132 116L224 174M380 118L286 174" fill="none" stroke="{COLORS['background']}" stroke-width="8" stroke-linecap="round" opacity=".32"/>
  <polygon points="{points_attr(LEFT_PAGE)}" fill="{COLORS['pages']}" stroke-linejoin="round"/>
  <polygon points="{points_attr(RIGHT_PAGE)}" fill="{COLORS['pages']}" stroke-linejoin="round"/>
  <path d="M114 284L208 298M114 324L208 338M398 284L304 298M398 324L304 338" fill="none" stroke="{COLORS['page_line']}" stroke-width="8" stroke-linecap="round"/>
  <path d="M256 280V406" fill="none" stroke="{COLORS['page_line']}" stroke-width="8" stroke-linecap="round"/>
</svg>
'''


def build_master() -> Image.Image:
    factor = SUPERSAMPLE
    size = BASE * factor
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        (16 * factor, 16 * factor, 496 * factor, 496 * factor),
        radius=112 * factor,
        fill=COLORS["background"],
    )
    draw.line(
        scaled([(256, 292), (256, 142)], factor),
        fill=COLORS["pages"],
        width=18 * factor,
    )
    draw.ellipse((247 * factor, 133 * factor, 265 * factor, 151 * factor), fill=COLORS["pages"])
    draw.ellipse((247 * factor, 283 * factor, 265 * factor, 301 * factor), fill=COLORS["pages"])
    draw.polygon(scaled(LEFT_LEAF, factor), fill=COLORS["leaf_left"])
    draw.polygon(scaled(RIGHT_LEAF, factor), fill=COLORS["leaf_right"])
    for line in ([(132, 116), (224, 174)], [(380, 118), (286, 174)]):
        draw.line(scaled(line, factor), fill=COLORS["background"], width=8 * factor)
    draw.polygon(scaled(LEFT_PAGE, factor), fill=COLORS["pages"])
    draw.polygon(scaled(RIGHT_PAGE, factor), fill=COLORS["pages"])
    for line in (
        [(114, 284), (208, 298)],
        [(114, 324), (208, 338)],
        [(398, 284), (304, 298)],
        [(398, 324), (304, 338)],
        [(256, 280), (256, 406)],
    ):
        draw.line(scaled(line, factor), fill=COLORS["page_line"], width=8 * factor)
    return image


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "brand-mark.svg").write_text(build_svg(), encoding="utf-8", newline="\n")
    master = build_master()
    for filename, size in (
        ("favicon-32.png", 32),
        ("icon-96.png", 96),
        ("apple-touch-icon.png", 180),
        ("icon-512.png", 512),
    ):
        icon = master.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(OUTPUT / filename, format="PNG", optimize=True)
        print(f"Generated {filename}: {size}x{size}")


if __name__ == "__main__":
    main()
