#!/usr/bin/env python3
"""
Derive the app icon set (favicon, PWA icons, maskable, apple-touch) from the
founder-supplied brand artwork, "Cgpa icon.jpeg" at the repo root.

Why the JPEG and not "Cgpa svg.txt" / "Cgpa svg 2.txt": both SVG files render
as an unrelated shape (closer to an axe than the graduation-cap-and-tassel
mark in the artwork), so the JPEG's large hero tile is the authoritative
source. It is 1254x1254 with the hero tile at roughly x 99-613, y 402-923.

Requires: Pillow, numpy.   Usage: python3 scripts/build-icons.py [path/to/Cgpa icon.jpeg]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "Cgpa icon.jpeg"
OUT = REPO / "static"

# Hero tile bounds measured from the artwork, and its corner radius (~25%).
TILE_CENTER = (356.0, 662.5)
SIDE = 497          # square crop, inset >= 8px so JPEG edge fringe is excluded
RADIUS = 120        # corner radius (measured 128px, minus the inset)


def rounded_mask(size: int, radius: int, scale: int = 4) -> Image.Image:
    """Anti-aliased rounded-rect mask, drawn supersampled then reduced."""
    big = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        (0, 0, size * scale - 1, size * scale - 1), radius=radius * scale, fill=255
    )
    return big.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    art = Image.open(SRC).convert("RGB")
    cx, cy = TILE_CENTER
    left, top = round(cx - SIDE / 2), round(cy - SIDE / 2)
    tile = art.crop((left, top, left + SIDE, top + SIDE))

    mask = rounded_mask(SIDE, RADIUS)

    # Brand navy: median of dark pixels well inside the tile (JPEG noise-safe).
    arr = np.array(tile).astype(int)
    dark = (arr[:, :, 0] < 45) & (arr[:, :, 1] < 50) & (arr[:, :, 2] < 85)
    inner = np.zeros(dark.shape, bool)
    inner[40:-40, 40:-40] = True
    navy = tuple(int(v) for v in np.median(arr[dark & inner], axis=0))
    print("brand navy", "#%02x%02x%02x" % navy)

    # "any" icon: rounded tile with transparent corners.
    rounded = tile.convert("RGBA")
    rounded.putalpha(mask)

    # full-bleed icon (maskable / apple-touch): corners filled with brand navy
    # so the OS applies its own mask. The symbol sits within ~34% of the
    # centre, inside the maskable safe zone (40%).
    bleed = Image.new("RGB", (SIDE, SIDE), navy)
    bleed.paste(tile, (0, 0), mask)

    def save(img: Image.Image, name: str, px: int) -> None:
        img.resize((px, px), Image.LANCZOS).save(OUT / name, optimize=True)
        print("wrote", name, px)

    save(rounded, "favicon.png", 64)
    save(rounded, "icon-192.png", 192)
    save(rounded, "icon-512.png", 512)
    save(bleed, "icon-maskable-512.png", 512)
    save(bleed, "apple-touch-icon.png", 180)


if __name__ == "__main__":
    main()
