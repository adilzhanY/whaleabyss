#!/usr/bin/env python3
"""Turn raw site screenshots into the README's artwork. From the repo root:

    ./scripts/readme/build-shots.py

Reads every docs/shots/<name>.png captured by scripts/readme/snap.mjs and writes:

  docs/shots/framed/<name>.png   desktop shots become a browser window
                                 (chrome bar, traffic lights, URL pill);
                                 *-mobile shots become a bezelled phone
  docs/shots/hero.png            the 2600x1400 banner at the top of the README

Re-run it after refreshing any screenshot; it is deterministic and safe to run
repeatedly. Needs ImageMagick 7 (`magick`), `rsvg-convert`, and `curl` the
first time (it downloads Onest, the site's own font, into docs/shots/.fonts).

WHY FRAME THEM: a raw 2880px browser grab pasted into a README reads as a bug
report. Wrapping the desktop shots in a minimal browser window and the mobile
shot in a phone bezel is the difference between "here is a screenshot" and
"here is a product". The hero is set in Onest on the brand's deep-sea palette,
so the artwork looks like the site it is selling.
"""
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
SHOTS = REPO / "docs" / "shots"
FRAMED = SHOTS / "framed"
FONTS = SHOTS / ".fonts"
LOCKUP = REPO / "public" / "images" / "whaleabyss-lockup-white.svg"
MARK = REPO / "public" / "images" / "whaleabyss-mark-white.svg"

# The site's own tokens. Brand blue #0B5191; the hero canvas is the abyss the
# brand is named after, so the palette runs darker than any page on the site.
DEEP_TOP, DEEP_BOT = "#0A1E3C", "#040D1B"
BRAND = "#0B5191"
KICK = "#6FB5F5"          # kicker + accents: brand blue lifted for dark ground
INK = "#F4F8FD"           # near-white text
SOFT = "#A8BBD3"          # secondary text
BAR, PILL, EDGE = "#E9EFF7", "#FFFFFF", "#CBD8E8"   # browser chrome
URLTXT = "#64748B"
PHONE_BEZEL = "#0E1F38"

KICKER = "THE ABYSS, CLEARED."
LEAD = [
    "A production e-commerce platform where",
    "Genshin Impact players hire pros",
    "to clear what they can't.",
]
CLAIMS = [
    "Real customers, real money: Freekassa checkout",
    "Admin dashboard, booster portal, Telegram ops bot",
    "Next.js 16 · TypeScript · PostgreSQL · one Yandex Cloud VM",
]

# Shot -> the address shown in its window's URL pill.
URLS = {
    "home": "whaleabyss.ru",
    "services": "whaleabyss.ru/services",
    "service": "whaleabyss.ru/service/natlan-100-19",
    "cart": "whaleabyss.ru/cart",
    "reviews": "whaleabyss.ru/reviews",
}

FONT_URL = ("https://gwfh.mranftl.com/api/fonts/onest"
            "?download=zip&subsets=latin,cyrillic&variants=500,600,700,800&formats=ttf")


def font(weight: int) -> Path:
    return FONTS / f"onest-v9-cyrillic_latin-{weight}.ttf"


def ensure_fonts():
    if font(700).exists():
        return
    FONTS.mkdir(parents=True, exist_ok=True)
    zip_path = FONTS / "onest.zip"
    run("curl", "-sL", FONT_URL, "-o", zip_path)
    run("unzip", "-o", "-q", zip_path, "-d", FONTS)
    zip_path.unlink()


def run(*args):
    subprocess.run([str(a) for a in args], check=True)


def size(path):
    out = subprocess.run(
        ["magick", str(path), "-format", "%w %h", "info:"],
        capture_output=True, text=True, check=True,
    ).stdout
    return tuple(int(v) for v in out.split())


def rounded(src: Path, dst: Path, radius: int, work: Path):
    """Clip src to a rounded rectangle. The mask must be xc:black -fill white:
    a mask drawn on xc:none with no -fill uses the default fill, which is
    BLACK, and CopyOpacity then blanks the whole image."""
    w, h = size(src)
    run("magick", "-size", f"{w}x{h}", "xc:black", "-fill", "white",
        "-draw", f"roundrectangle 0,0,{w - 1},{h - 1},{radius},{radius}", work / "mask.png")
    run("magick", src, work / "mask.png",
        "-alpha", "off", "-compose", "CopyOpacity", "-composite", dst)


def shadow(src: Path, dst: Path, spec: str):
    run("magick", src,
        "(", "+clone", "-background", "black", "-shadow", spec, ")",
        "+swap", "-background", "none", "-layers", "merge", "+repage", dst)


def frame_browser(src: Path, dst: Path, width: int, url: str) -> Path:
    """Resize + chrome bar with traffic lights and a URL pill + rounded window
    + hairline edge + soft shadow."""
    tmp = dst.parent / f".tmp-{dst.stem}"
    tmp.mkdir(parents=True, exist_ok=True)
    run("magick", src, "-resize", f"{width}x", tmp / "s.png")
    w, h = size(tmp / "s.png")

    hb = max(44, w // 26)
    r = hb * 4 // 25                       # traffic-light radius
    cy = hb // 2
    dots = []
    for i, c in enumerate(("#FF5F57", "#FEBC2E", "#28C840")):
        cx = hb * 6 // 10 + i * (r * 2 + hb * 3 // 10)
        dots += ["-fill", c, "-draw", f"circle {cx},{cy} {cx + r},{cy}"]
    pw, ph = max(w * 30 // 100, 260), hb * 62 // 100
    px, py = (w - pw) // 2, (hb - ph) // 2
    run("magick", "-size", f"{w}x{hb}", f"xc:{BAR}", *dots,
        "-fill", PILL,
        "-draw", f"roundrectangle {px},{py},{px + pw},{py + ph},{ph // 2},{ph // 2}",
        tmp / "bar.png")
    run("magick", tmp / "bar.png", "-font", font(500), "-pointsize", hb * 34 // 100,
        "-fill", URLTXT, "-gravity", "center", "-annotate", "+0+1", url, tmp / "bar.png")

    run("magick", tmp / "bar.png", tmp / "s.png", "-append", tmp / "win.png")
    radius = max(16, w // 55)
    rounded(tmp / "win.png", tmp / "roundwin.png", radius, tmp)
    b = 2
    run("magick", "-size", f"{w + b * 2}x{h + hb + b * 2}", "xc:none", "-fill", EDGE,
        "-draw",
        f"roundrectangle 0,0,{w + b * 2 - 1},{h + hb + b * 2 - 1},{radius + b},{radius + b}",
        tmp / "edge.png")
    run("magick", tmp / "edge.png", tmp / "roundwin.png",
        "-geometry", f"+{b}+{b}", "-compose", "over", "-composite", tmp / "dev.png")
    shadow(tmp / "dev.png", dst, "50x30+0+18")
    for f in tmp.iterdir():
        f.unlink()
    tmp.rmdir()
    return dst


def frame_phone(src: Path, dst: Path, width: int) -> Path:
    """Round, bezel and shadow a mobile screenshot into a phone."""
    tmp = dst.parent / f".tmp-{dst.stem}"
    tmp.mkdir(parents=True, exist_ok=True)
    run("magick", src, "-resize", f"{width}x", tmp / "s.png")
    w, h = size(tmp / "s.png")
    radius = w // 12
    rounded(tmp / "s.png", tmp / "roundscr.png", radius, tmp)
    b = max(6, w // 45)
    run("magick", "-size", f"{w + b * 2}x{h + b * 2}", "xc:none", "-fill", PHONE_BEZEL,
        "-draw", f"roundrectangle 0,0,{w + b * 2 - 1},{h + b * 2 - 1},{radius + b},{radius + b}",
        tmp / "bezel.png")
    run("magick", tmp / "bezel.png", tmp / "roundscr.png",
        "-geometry", f"+{b}+{b}", "-compose", "over", "-composite", tmp / "dev.png")
    shadow(tmp / "dev.png", dst, "55x28+0+16")
    for f in tmp.iterdir():
        f.unlink()
    tmp.rmdir()
    return dst


def annotate(img, x, y, text, points, color, fontfile, kerning=0):
    run("magick", img, "-font", fontfile, "-pointsize", points, "-fill", color,
        "-kerning", kerning, "-annotate", f"+{x}+{y}", text, img)


def build_hero(work: Path):
    W, H = 2600, 1400
    need = {"services": 1000, "home": 1080}
    windows = {}
    for name, width in need.items():
        src = SHOTS / f"{name}.png"
        if not src.exists():
            sys.exit(f"hero needs {src}: capture it with node scripts/readme/snap.mjs {name}")
        windows[name] = frame_browser(src, work / f"h-{name}.png", width, URLS[name])
    phone_src = SHOTS / "service-mobile.png"
    if not phone_src.exists():
        sys.exit("hero needs docs/shots/service-mobile.png: node scripts/readme/snap.mjs service-mobile")
    phone = frame_phone(phone_src, work / "h-phone.png", 330)

    hero = SHOTS / "hero.png"
    # The abyss: a vertical deep-sea gradient with a brand-blue glow behind the
    # windows so the right half is not a black slab.
    run("magick", "-size", f"{W}x{H}", f"gradient:{DEEP_TOP}-{DEEP_BOT}", work / "canvas.png")
    run("magick", "-size", "1400x1400", f"radial-gradient:{BRAND}59-none",
        "-resize", "1700x1400!", work / "glow.png")
    run("magick", work / "canvas.png", work / "glow.png",
        "-geometry", "+1100+0", "-composite", work / "base.png")
    # The whale mark, huge and dimmed, sounding through the bottom-left. Same
    # watermark idea as the brand's own hero art.
    run("rsvg-convert", "-w", "620", "-h", "903", MARK, "-o", work / "mark.png")
    run("magick", work / "mark.png", "-alpha", "set", "-channel", "A",
        "-evaluate", "multiply", "0.05", "+channel", work / "markdim.png")
    run("magick", work / "base.png", work / "markdim.png",
        "-geometry", "-140+760", "-composite", work / "base.png")

    sw, sh = size(windows["services"])
    hw, hh = size(windows["home"])
    pw, ph = size(phone)
    run("magick", work / "base.png",
        windows["services"], "-geometry", "+1340+90", "-composite",
        windows["home"], "-geometry", f"+1440+{H - hh - 60}", "-composite",
        phone, "-geometry", f"+{W - pw - 50}+{(H - ph) // 2 + 60}", "-composite",
        hero)

    # Left column: lockup, kicker, lead, rule, claims.
    run("rsvg-convert", "-w", "780", LOCKUP, "-o", work / "lockup.png")
    run("magick", hero, work / "lockup.png", "-geometry", "+150+300", "-composite", hero)
    annotate(hero, 152, 590, KICKER, 54, KICK, font(700), 6)
    for i, line in enumerate(LEAD):
        annotate(hero, 152, 692 + i * 62, line, 44, SOFT, font(500))
    run("magick", hero, "-fill", KICK, "-draw", "rectangle 152,884 332,892", hero)
    for i, line in enumerate(CLAIMS):
        annotate(hero, 152, 984 + i * 68, "-   " + line, 40, INK, font(500))
    print(f"hero.png  {size(hero)[0]}x{size(hero)[1]}")


def main():
    ensure_fonts()
    FRAMED.mkdir(parents=True, exist_ok=True)
    work = SHOTS / ".work"
    work.mkdir(exist_ok=True)

    for src in sorted(SHOTS.glob("*.png")):
        if src.name == "hero.png":
            continue
        name = src.stem
        if name.endswith("-mobile"):
            frame_phone(src, FRAMED / src.name, 620)
        else:
            frame_browser(src, FRAMED / src.name, 1600, URLS.get(name, "whaleabyss.ru"))
        print(f"framed/{src.name}")

    build_hero(work)
    for f in work.iterdir():
        f.unlink()
    work.rmdir()


if __name__ == "__main__":
    main()
