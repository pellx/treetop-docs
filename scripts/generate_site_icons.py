#!/usr/bin/env python3
"""Generate the site's PNG icons from the selected square brand artwork.

Requires Pillow. Keep the master image at assets/img/site/brand-source.webp so
all favicon, navigation, Apple touch, and Toy icons stay consistent.
"""

from pathlib import Path

from PIL import Image

OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "img" / "site"
SOURCE = OUTPUT / "brand-source.webp"
SIZES = {
    "favicon-32.png": 32,
    "icon-96.png": 96,
    "apple-touch-icon.png": 180,
    "icon-512.png": 512,
}


def main() -> None:
    with Image.open(SOURCE) as source:
        if source.width != source.height:
            raise ValueError(f"Brand artwork must be square; found {source.size}")
        master = source.convert("RGB")
        for filename, size in SIZES.items():
            icon = master.resize((size, size), Image.Resampling.LANCZOS)
            icon.save(OUTPUT / filename, format="PNG", optimize=True)
            print(f"Generated {filename}: {size}x{size}")


if __name__ == "__main__":
    main()
