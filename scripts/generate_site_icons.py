#!/usr/bin/env python3
"""Generate site icons and the link preview from the selected brand artwork.

Requires Pillow. Keep the transparent master at assets/img/site/brand-source.webp.
Site icons use transparent canvases. The link preview includes the background
color of the sidebar brand mark.
"""

from pathlib import Path

from PIL import Image, ImageOps

OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "img" / "site"
SOURCE = OUTPUT / "brand-source.webp"
SIZES = {
    "favicon-32.png": 32,
    "icon-96.png": 96,
    "apple-touch-icon.png": 180,
    "icon-512.png": 512,
}
PADDING_RATIO = 0.02


def crop_visible_character(source: Image.Image) -> Image.Image:
    rgba = source.convert("RGBA")
    visible_alpha = rgba.getchannel("A").point(lambda alpha: 255 if alpha > 8 else 0)
    bounds = visible_alpha.getbbox()
    if bounds is None:
        raise ValueError("Brand artwork has no visible pixels")
    return rgba.crop(bounds)


def make_icon(character: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    padding = round(size * PADDING_RATIO)
    available = max(1, size - 2 * padding)
    fitted = ImageOps.contain(character, (available, available), Image.Resampling.LANCZOS)
    position = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    canvas.alpha_composite(fitted, position)
    return canvas


def main() -> None:
    with Image.open(SOURCE) as source:
        character = crop_visible_character(source)
        for filename, size in SIZES.items():
            icon = make_icon(character, size)
            icon.save(OUTPUT / filename, format="PNG", optimize=True)
            print(f"Generated {filename}: {size}x{size}, transparent RGBA")

        size = SIZES["icon-512.png"]
        # Match --brand-mark-bg in assets/css/site.css.
        share_icon = Image.new("RGBA", (size, size), "#7bb380")
        share_icon.alpha_composite(make_icon(character, size))
        share_icon.convert("RGB").save(OUTPUT / "share-icon.png", optimize=True)
        print(f"Generated share-icon.png: {size}x{size}, opaque RGB")


if __name__ == "__main__":
    main()
