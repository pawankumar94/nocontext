#!/usr/bin/env python3
"""nocontext brand assets.

The mark is a citation that has a source. The empty brackets were the
ungrounded claim — a citation pointing nowhere. The product's job is to
tell you whether the map actually points at a document, so the aperture
now holds a file.

Proportions stay citation-shaped, not checkbox-shaped: taller than wide,
short arms, wide enough aperture that the file survives a 32px favicon.
The CLI still prints routing misses as [ ]; the logo is the hit.
"""
import shutil
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent

INK, AMBER, PAPER, MUTE, RULE = "#16181D", "#E07B39", "#FBFAF8", "#9AA0A6", "#2C3038"

# stroke, half-height, arm, aperture. Aperture widened from the empty mark
# so a file reads in the gap without colliding with the stroke.
SW, HH, ARM, GAP = 32, 140, 52, 188


def brackets(cx=256, cy=256, scale=1.0, color=AMBER):
    sw, hh, arm, gap = (v * scale for v in (SW, HH, ARM, GAP))
    l, r = cx - gap / 2, cx + gap / 2
    return (
        f'<g stroke="{color}" stroke-width="{sw:.1f}" fill="none" '
        f'stroke-linecap="square">'
        f'<path d="M{l:.1f} {cy-hh:.1f} H{l-arm:.1f} V{cy+hh:.1f} H{l:.1f}"/>'
        f'<path d="M{r:.1f} {cy-hh:.1f} H{r+arm:.1f} V{cy+hh:.1f} H{r:.1f}"/></g>'
    )


def source_file(cx=256, cy=256, scale=1.0, color=AMBER):
    """Document silhouette with a folded corner. One fill, no interior lines."""
    w, h, dog, rad = (v * scale for v in (96, 120, 22, 8))
    x, y = cx - w / 2, cy - h / 2
    outer = (
        f"M{x+rad:.1f} {y:.1f} "
        f"H{x+w-dog:.1f} "
        f"L{x+w:.1f} {y+dog:.1f} "
        f"V{y+h-rad:.1f} "
        f"Q{x+w:.1f} {y+h:.1f} {x+w-rad:.1f} {y+h:.1f} "
        f"H{x+rad:.1f} "
        f"Q{x:.1f} {y+h:.1f} {x:.1f} {y+h-rad:.1f} "
        f"V{y+rad:.1f} "
        f"Q{x:.1f} {y:.1f} {x+rad:.1f} {y:.1f} Z"
    )
    fold = (
        f"M{x+w-dog:.1f} {y:.1f} "
        f"L{x+w-dog:.1f} {y+dog:.1f} "
        f"L{x+w:.1f} {y+dog:.1f} Z"
    )
    return (
        f'<path fill="{color}" fill-rule="evenodd" '
        f'd="{outer} {fold}"/>'
    )


def mark(cx=256, cy=256, scale=1.0, color=AMBER):
    return brackets(cx, cy, scale, color) + source_file(cx, cy, scale, color)


def write(name, svg):
    (OUT / name).write_text(svg, encoding="utf-8")


def raster(svg_name, png_name, width):
    src = OUT / svg_name
    dst = OUT / png_name
    rsvg = shutil.which("rsvg-convert")
    if rsvg:
        subprocess.run([rsvg, "-w", str(width), str(src), "-o", str(dst)], check=True)
        return
    try:
        from cairosvg import svg2png
        svg2png(url=str(src), write_to=str(dst), output_width=width)
        return
    except ImportError:
        pass
    convert = shutil.which("convert") or shutil.which("magick")
    if not convert:
        raise SystemExit("need rsvg-convert, cairosvg, or ImageMagick convert to write PNGs")
    cmd = [convert]
    if Path(convert).name == "magick":
        cmd.append("convert")
    subprocess.run(
        cmd + ["-background", "none", "-density", "384", "-resize", f"{width}x", str(src), str(dst)],
        check=True,
    )


write("logo.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" \
role="img" aria-label="nocontext">
{mark()}
</svg>
''')

write("icon.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" \
role="img" aria-label="nocontext">
  <rect width="512" height="512" rx="112" fill="{INK}"/>
{mark()}
</svg>
''')

LINE = f'<rect x="96" y="{{y}}" width="{{w}}" height="15" rx="7.5" fill="{MUTE}" opacity=".55"/>'
lines = "\n  ".join(LINE.format(y=y, w=w) for y, w in
                    [(150, 430), (186, 372), (222, 366), (258, 376)])
CITE = mark(cx=528, cy=266, scale=0.22)

write("social.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640" \
font-family="Inter, system-ui, -apple-system, sans-serif">
  <rect width="1280" height="640" fill="{INK}"/>

  <!-- an assertion, and a citation that has a source -->
  {lines}
  {CITE}

  <text x="96" y="392" fill="{PAPER}" font-size="78" font-weight="680" \
letter-spacing="-2.6">nocontext</text>
  <text x="96" y="444" fill="{MUTE}" font-size="24" font-weight="420">\
A retrieval-quality linter for AGENTS.md, CLAUDE.md, and your docs/.</text>
  <text x="96" y="486" fill="{AMBER}" font-size="19" font-weight="500" \
font-family="ui-monospace, SFMono-Regular, Menlo, monospace">\
github.com/pawankumar94/nocontext</text>

  <g transform="translate(830 172)" \
font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
    <text x="0" y="0" fill="{MUTE}" font-size="20">top-1 routing miss</text>
    <text x="300" y="0" fill="{AMBER}" font-size="20" text-anchor="end" \
font-weight="600">43%</text>
    <line x1="0" y1="24" x2="300" y2="24" stroke="{RULE}"/>
    <text x="0" y="62" fill="{MUTE}" font-size="18">floor</text>
    <text x="300" y="62" fill="{MUTE}" font-size="18" text-anchor="end">8%</text>
    <text x="0" y="96" fill="{MUTE}" font-size="18">observed</text>
    <text x="300" y="96" fill="{PAPER}" font-size="18" text-anchor="end">57%</text>
    <text x="0" y="130" fill="{MUTE}" font-size="18">full-text reference</text>
    <text x="300" y="130" fill="{PAPER}" font-size="18" text-anchor="end">92%</text>
  </g>
</svg>
''')

if __name__ == "__main__":
    for name, w in [("logo", 512), ("icon", 512), ("social", 1280)]:
        raster(f"{name}.svg", f"{name}.png", w)
    for px in (16, 32, 64):
        raster("icon.svg", f"favicon-{px}.png", px)
    for f in sorted(OUT.glob("*.png")):
        print(f"  {f.name:<18} {f.stat().st_size/1024:6.1f} KB")
