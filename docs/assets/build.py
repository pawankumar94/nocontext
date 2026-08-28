#!/usr/bin/env python3
"""nocontext brand assets.

The mark is an empty citation. "Ungrounded" has a precise meaning: a claim with
no source behind it, which in every technical tradition is a citation pointing
nowhere. Two brackets, nothing between them.

Proportions are deliberate. A checkbox is square, closed and centred, so the
mark is taller than wide with a wide aperture and short arms, which is what
keeps it reading as a citation at small sizes.

It is also notation, not decoration: the CLI marks ungrounded results [ ] in its
own output, so the logo is a symbol the product uses.
"""
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent
RSVG = "/opt/homebrew/bin/rsvg-convert"

INK, AMBER, PAPER, MUTE, RULE = "#16181D", "#E07B39", "#FBFAF8", "#9AA0A6", "#2C3038"

# stroke, half-height, arm, aperture. Tuned in a weight study: tall enough to
# never read as a checkbox, heavy enough to survive a 16px favicon.
SW, HH, ARM, GAP = 36, 138, 54, 100


def brackets(cx=256, cy=256, scale=1.0, color=AMBER):
    sw, hh, arm, gap = (v * scale for v in (SW, HH, ARM, GAP))
    l, r = cx - gap / 2, cx + gap / 2
    return (f'<g stroke="{color}" stroke-width="{sw:.1f}" fill="none" '
            f'stroke-linecap="square">'
            f'<path d="M{l:.1f} {cy-hh:.1f} H{l-arm:.1f} V{cy+hh:.1f} H{l:.1f}"/>'
            f'<path d="M{r:.1f} {cy-hh:.1f} H{r+arm:.1f} V{cy+hh:.1f} H{r:.1f}"/></g>')


def write(name, svg):
    (OUT / name).write_text(svg, encoding="utf-8")


write("logo.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" \
role="img" aria-label="nocontext">
{brackets()}
</svg>
''')

write("icon.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" \
role="img" aria-label="nocontext">
  <rect width="512" height="512" rx="112" fill="{INK}"/>
{brackets()}
</svg>
''')

# Social card. The hero is the fuller idea the icon cannot carry at 16px:
# a sentence of prose whose citation points at nothing.
# The hero the icon cannot carry at 16px: a sentence of prose whose citation
# points at nothing. Line widths are held clear of the bracket so the mark reads
# as following the text rather than sitting on top of it.
LINE = f'<rect x="96" y="{{y}}" width="{{w}}" height="15" rx="7.5" fill="{MUTE}" opacity=".55"/>'
lines = "\n  ".join(LINE.format(y=y, w=w) for y, w in
                    [(150, 430), (186, 372), (222, 366), (258, 376)])
CITE = brackets(cx=516, cy=266, scale=0.22)

write("social.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640" \
font-family="Inter, system-ui, -apple-system, sans-serif">
  <rect width="1280" height="640" fill="{INK}"/>

  <!-- an assertion, and a citation with nothing behind it -->
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
    <text x="0" y="0" fill="{MUTE}" font-size="20">ungrounded rate</text>
    <text x="300" y="0" fill="{AMBER}" font-size="20" text-anchor="end" \
font-weight="600">43%</text>
    <line x1="0" y1="24" x2="300" y2="24" stroke="{RULE}"/>
    <text x="0" y="62" fill="{MUTE}" font-size="18">floor</text>
    <text x="300" y="62" fill="{MUTE}" font-size="18" text-anchor="end">8%</text>
    <text x="0" y="96" fill="{MUTE}" font-size="18">observed</text>
    <text x="300" y="96" fill="{PAPER}" font-size="18" text-anchor="end">57%</text>
    <text x="0" y="130" fill="{MUTE}" font-size="18">ceiling</text>
    <text x="300" y="130" fill="{PAPER}" font-size="18" text-anchor="end">92%</text>
  </g>
</svg>
''')

for name, w in [("logo", 512), ("icon", 512), ("social", 1280)]:
    subprocess.run([RSVG, "-w", str(w), str(OUT / f"{name}.svg"),
                    "-o", str(OUT / f"{name}.png")], check=True)
for px in (16, 32, 64):
    subprocess.run([RSVG, "-w", str(px), str(OUT / "icon.svg"),
                    "-o", str(OUT / f"favicon-{px}.png")], check=True)

for f in sorted(OUT.glob("*.png")):
    print(f"  {f.name:<18} {f.stat().st_size/1024:6.1f} KB")
