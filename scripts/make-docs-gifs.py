"""Generate honest motion GIFs for FaultLine docs (logo + terminal + flow)."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "media"
LOGO = ROOT / "resources" / "faultline-logo.png"


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("consola.ttf", "cour.ttf", "segoeui.ttf", "arial.ttf"):
        path = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def make_logo_pulse(logo: Image.Image) -> None:
    w = h = 360
    frames: list[Image.Image] = []
    n = 12
    for i in range(n):
        t = i / (n - 1)
        scale = 0.90 + 0.10 * (1 - abs(2 * t - 1))
        bg = Image.new("RGBA", (w, h), (12, 12, 16, 255))
        size = max(8, int(280 * scale))
        im = logo.resize((size, size), Image.Resampling.LANCZOS)
        glow = im.filter(ImageFilter.GaussianBlur(radius=12))
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gx = (w - size) // 2
        gy = (h - size) // 2
        layer.paste(glow, (gx, gy), glow)
        bg = Image.alpha_composite(bg, layer)
        bg.paste(im, (gx, gy), im)
        frames.append(bg.convert("P", palette=Image.ADAPTIVE, colors=96))
    path = OUT / "logo-pulse.gif"
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=100,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print("logo-pulse.gif", path.stat().st_size)


def make_terminal(logo: Image.Image) -> None:
    tw, th = 920, 400
    f = font(17)
    f_sm = font(14)
    f_title = font(15)
    badge = logo.resize((32, 32), Image.Resampling.LANCZOS)

    def frame(lines: list[tuple[str, tuple[int, int, int]]]) -> Image.Image:
        img = Image.new("RGB", (tw, th), (12, 12, 16))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle(
            [10, 10, tw - 10, th - 10],
            radius=14,
            fill=(22, 22, 28),
            outline=(48, 48, 58),
            width=2,
        )
        d.ellipse([26, 24, 40, 38], fill=(255, 95, 86))
        d.ellipse([48, 24, 62, 38], fill=(255, 189, 46))
        d.ellipse([70, 24, 84, 38], fill=(39, 201, 63))
        d.text((100, 24), "build", fill=(150, 150, 160), font=f_title)
        img.paste(badge, (tw - 52, 20), badge)
        y = 58
        for text, color in lines:
            d.text((28, y), text, fill=color, font=f)
            y += 26
        d.rectangle([10, th - 34, tw - 10, th - 10], fill=(16, 16, 20))
        d.text(
            (28, th - 28),
            "FaultLine · watches terminals & tasks",
            fill=(110, 110, 120),
            font=f_sm,
        )
        return img.convert("P", palette=Image.ADAPTIVE, colors=48)

    dim = (130, 130, 140)
    fg = (210, 210, 220)
    err = (255, 110, 110)
    ok = (100, 220, 150)
    info = (100, 180, 255)

    stages: list[tuple[list[tuple[str, tuple[int, int, int]]], int]] = [
        ([("$ npm run build", fg)], 500),
        ([("$ npm run build", fg), ("", dim), ("> tsc -p .", dim)], 500),
        (
            [
                ("$ npm run build", fg),
                ("", dim),
                ("> tsc -p .", dim),
                ("src/app.ts:42: error TS2322", err),
            ],
            600,
        ),
        (
            [
                ("$ npm run build", fg),
                ("", dim),
                ("> tsc -p .", dim),
                ("src/app.ts:42: error TS2322", err),
                ('Type "string" is not assignable to type "number"', err),
                ("", dim),
                ("ERROR  Build failed · exit code 1", (255, 80, 80)),
            ],
            800,
        ),
        (
            [
                ("$ npm run build", fg),
                ("", dim),
                ("> tsc -p .", dim),
                ("src/app.ts:42: error TS2322", err),
                ('Type "string" is not assignable to type "number"', err),
                ("", dim),
                ("ERROR  Build failed · exit code 1", (255, 80, 80)),
                ("", dim),
                ("[FaultLine] failure detected  ·  source=shell", ok),
            ],
            700,
        ),
        (
            [
                ("$ npm run build", fg),
                ("", dim),
                ("> tsc -p .", dim),
                ("src/app.ts:42: error TS2322", err),
                ('Type "string" is not assignable to type "number"', err),
                ("", dim),
                ("ERROR  Build failed · exit code 1", (255, 80, 80)),
                ("", dim),
                ("[FaultLine] failure detected  ·  source=shell", ok),
                ("[FaultLine] sound + status updated  ·  history saved", ok),
                ("[FaultLine] Analyze Last Failure ready (AI opt-in)", info),
            ],
            1400,
        ),
    ]

    frames = [frame(lines) for lines, _ in stages]
    durs = [d for _, d in stages]
    path = OUT / "terminal-fail.gif"
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=durs,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print("terminal-fail.gif", path.stat().st_size)


def make_flow(logo: Image.Image) -> None:
    fw, fh = 840, 260
    ftitle = font(20)
    fbody = font(16)
    fsub = font(13)
    steps = [
        ("1", "Command fails", "Terminal or task exits non-zero"),
        ("2", "FaultLine notices", "Sound · status · history"),
        ("3", "You analyze", "AI only when you want it"),
    ]
    frames: list[Image.Image] = []
    for active in range(3):
        for p in range(5):
            img = Image.new("RGB", (fw, fh), (12, 12, 16))
            d = ImageDraw.Draw(img)
            d.rounded_rectangle(
                [10, 10, fw - 10, fh - 10],
                radius=16,
                fill=(20, 20, 26),
                outline=(42, 42, 52),
                width=2,
            )
            b = logo.resize((40, 40), Image.Resampling.LANCZOS)
            img.paste(b, (fw - 64, 22), b)
            d.text((28, 24), "How FaultLine works", fill=(235, 235, 240), font=ftitle)
            for i, (num, title, sub) in enumerate(steps):
                x = 36 + i * 265
                y = 90
                on = i <= active
                col = (70, 200, 140) if on else (55, 55, 65)
                if i == active:
                    rr = 14 + p
                    d.ellipse(
                        [x - rr + 12, y - rr + 12, x + rr + 28, y + rr + 28],
                        outline=(70, 200, 140),
                        width=2,
                    )
                d.rounded_rectangle(
                    [x, y, x + 230, y + 110],
                    radius=12,
                    fill=(28, 28, 36) if on else (24, 24, 30),
                    outline=col,
                    width=2,
                )
                d.ellipse([x + 14, y + 18, x + 38, y + 42], fill=col)
                d.text((x + 18, y + 20), num, fill=(12, 12, 16), font=fbody)
                d.text(
                    (x + 50, y + 20),
                    title,
                    fill=(235, 235, 240) if on else (120, 120, 130),
                    font=fbody,
                )
                d.text(
                    (x + 16, y + 58),
                    sub,
                    fill=(140, 140, 150) if on else (80, 80, 90),
                    font=fsub,
                )
            frames.append(img.convert("P", palette=Image.ADAPTIVE, colors=48))
    path = OUT / "how-it-works.gif"
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=110,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print("how-it-works.gif", path.stat().st_size)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    logo = Image.open(LOGO).convert("RGBA")
    make_logo_pulse(logo)
    make_terminal(logo)
    make_flow(logo)
    print("done")


if __name__ == "__main__":
    main()
