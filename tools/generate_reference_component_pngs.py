#!/usr/bin/env python3
"""Generate deterministic PNG plan/elevation components from the shop reference.

The source images are perspective references, so these assets are redrawn as
clean orthographic pieces instead of cropped from the screenshots.
"""

from __future__ import annotations

import json
import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "art" / "component_png_plan"


Color = tuple[int, int, int, int]


BLUE: Color = (28, 132, 226, 255)
DARK_BLUE: Color = (8, 67, 143, 255)
MID_BLUE: Color = (47, 153, 238, 255)
LIGHT_BLUE: Color = (119, 197, 255, 255)
CYAN: Color = (0, 225, 255, 255)
GREEN: Color = (91, 170, 28, 255)
WHITE: Color = (248, 252, 255, 255)
PURPLE: Color = (118, 46, 213, 255)
YELLOW: Color = (243, 181, 22, 255)
BLACK: Color = (1, 18, 45, 255)
TRANSPARENT: Color = (0, 0, 0, 0)


def clamp(v: int) -> int:
    return max(0, min(255, int(v)))


def shade(c: Color, factor: float) -> Color:
    return (clamp(c[0] * factor), clamp(c[1] * factor), clamp(c[2] * factor), c[3])


class Canvas:
    def __init__(self, w: int, h: int, bg: Color = TRANSPARENT) -> None:
        self.w = w
        self.h = h
        self.px = bytearray(bg * (w * h))

    def set(self, x: int, y: int, c: Color) -> None:
        if 0 <= x < self.w and 0 <= y < self.h:
            i = (y * self.w + x) * 4
            a = c[3] / 255
            ia = 1 - a
            self.px[i] = clamp(c[0] * a + self.px[i] * ia)
            self.px[i + 1] = clamp(c[1] * a + self.px[i + 1] * ia)
            self.px[i + 2] = clamp(c[2] * a + self.px[i + 2] * ia)
            self.px[i + 3] = clamp(c[3] + self.px[i + 3] * ia)

    def rect(self, x: int, y: int, w: int, h: int, c: Color) -> None:
        for yy in range(max(0, y), min(self.h, y + h)):
            base = yy * self.w
            for xx in range(max(0, x), min(self.w, x + w)):
                i = (base + xx) * 4
                self.px[i : i + 4] = bytes(c)

    def outline(self, x: int, y: int, w: int, h: int, c: Color, t: int = 2) -> None:
        self.rect(x, y, w, t, c)
        self.rect(x, y + h - t, w, t, c)
        self.rect(x, y, t, h, c)
        self.rect(x + w - t, y, t, h, c)

    def circle(self, cx: int, cy: int, r: int, c: Color) -> None:
        rr = r * r
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if (x - cx) * (x - cx) + (y - cy) * (y - cy) <= rr:
                    self.set(x, y, c)

    def rounded_rect(self, x: int, y: int, w: int, h: int, r: int, c: Color) -> None:
        self.rect(x + r, y, w - 2 * r, h, c)
        self.rect(x, y + r, w, h - 2 * r, c)
        self.circle(x + r, y + r, r, c)
        self.circle(x + w - r - 1, y + r, r, c)
        self.circle(x + r, y + h - r - 1, r, c)
        self.circle(x + w - r - 1, y + h - r - 1, r, c)

    def line(self, x1: int, y1: int, x2: int, y2: int, c: Color, t: int = 1) -> None:
        dx = abs(x2 - x1)
        dy = -abs(y2 - y1)
        sx = 1 if x1 < x2 else -1
        sy = 1 if y1 < y2 else -1
        err = dx + dy
        x, y = x1, y1
        while True:
            self.rect(x - t // 2, y - t // 2, t, t, c)
            if x == x2 and y == y2:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x += sx
            if e2 <= dx:
                err += dx
                y += sy

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        rows = []
        stride = self.w * 4
        for y in range(self.h):
            rows.append(b"\x00" + bytes(self.px[y * stride : (y + 1) * stride]))
        raw = b"".join(rows)

        def chunk(kind: bytes, data: bytes) -> bytes:
            return (
                struct.pack(">I", len(data))
                + kind
                + data
                + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
            )

        data = b"\x89PNG\r\n\x1a\n"
        data += chunk(b"IHDR", struct.pack(">IIBBBBB", self.w, self.h, 8, 6, 0, 0, 0))
        data += chunk(b"IDAT", zlib.compress(raw, 9))
        data += chunk(b"IEND", b"")
        path.write_bytes(data)


def stud_grid(c: Canvas, x: int, y: int, w: int, h: int, step: int, radius: int = 4) -> None:
    for yy in range(y + step // 2, y + h - step // 2 + 1, step):
        for xx in range(x + step // 2, x + w - step // 2 + 1, step):
            c.circle(xx, yy, radius, shade(DARK_BLUE, 1.15))
            c.circle(xx - 1, yy - 1, max(1, radius - 2), shade(LIGHT_BLUE, 0.88))


def perforations(c: Canvas, x: int, y: int, w: int, h: int, horizontal: bool) -> None:
    if horizontal:
        for xx in range(x + 20, x + w - 20, 28):
            c.rect(xx, y + h // 2 - 4, 8, 8, DARK_BLUE)
    else:
        for yy in range(y + 18, y + h - 18, 28):
            c.rect(x + w // 2 - 4, yy, 8, 8, DARK_BLUE)


def save_floor() -> None:
    c = Canvas(960, 600)
    c.rect(20, 20, 920, 560, MID_BLUE)
    stud_grid(c, 40, 40, 880, 520, 28, 5)
    c.outline(20, 20, 920, 560, DARK_BLUE, 8)
    c.save(OUT / "01_floor_panel_top.png")


def save_wall_panel() -> None:
    c = Canvas(960, 420)
    c.rect(20, 20, 920, 380, LIGHT_BLUE)
    stud_grid(c, 45, 45, 870, 330, 30, 5)
    c.outline(20, 20, 920, 380, DARK_BLUE, 8)
    c.rect(20, 360, 920, 40, shade(DARK_BLUE, 1.1))
    c.save(OUT / "02_back_wall_panel_front.png")


def save_side_wall() -> None:
    c = Canvas(620, 420)
    c.rect(20, 20, 580, 380, LIGHT_BLUE)
    stud_grid(c, 45, 45, 530, 330, 28, 4)
    c.outline(20, 20, 580, 380, DARK_BLUE, 8)
    c.save(OUT / "03_side_wall_panel_side.png")


def save_ceiling() -> None:
    c = Canvas(960, 600)
    c.rect(20, 20, 920, 560, shade(LIGHT_BLUE, 1.05))
    stud_grid(c, 45, 45, 870, 510, 26, 3)
    c.outline(20, 20, 920, 560, DARK_BLUE, 8)
    c.save(OUT / "04_ceiling_panel_top.png")


def save_frame_long() -> None:
    c = Canvas(1000, 130)
    c.rounded_rect(20, 25, 960, 80, 8, BLUE)
    c.outline(20, 25, 960, 80, DARK_BLUE, 5)
    perforations(c, 30, 35, 940, 60, True)
    c.save(OUT / "05_outer_frame_long_beam.png")


def save_frame_short() -> None:
    c = Canvas(150, 640)
    c.rounded_rect(25, 20, 90, 600, 8, BLUE)
    c.outline(25, 20, 90, 600, DARK_BLUE, 5)
    perforations(c, 35, 30, 70, 580, False)
    c.save(OUT / "06_outer_frame_side_column.png")


def save_corner_block() -> None:
    c = Canvas(180, 180)
    c.rounded_rect(25, 25, 130, 130, 10, BLUE)
    c.outline(25, 25, 130, 130, DARK_BLUE, 6)
    c.rect(42, 42, 96, 96, shade(BLUE, 1.1))
    c.save(OUT / "07_corner_cube.png")


def save_cross_beam() -> None:
    c = Canvas(880, 120)
    c.rect(20, 38, 840, 44, DARK_BLUE)
    c.rect(20, 38, 840, 8, shade(BLUE, 0.95))
    c.outline(20, 38, 840, 44, BLACK, 2)
    c.save(OUT / "08_ceiling_cross_beam.png")


def save_center_spine() -> None:
    c = Canvas(140, 520)
    c.rect(48, 20, 44, 480, DARK_BLUE)
    c.rect(48, 20, 8, 480, shade(BLUE, 0.85))
    c.outline(48, 20, 44, 480, BLACK, 2)
    c.rect(36, 235, 68, 50, BLUE)
    c.outline(36, 235, 68, 50, DARK_BLUE, 3)
    c.save(OUT / "09_ceiling_center_spine.png")


def save_light_strip() -> None:
    c = Canvas(640, 110)
    c.rounded_rect(40, 35, 560, 36, 12, WHITE)
    c.outline(40, 35, 560, 36, shade(DARK_BLUE, 1.2), 2)
    for i in range(12):
        alpha = 42 - i * 3
        c.rounded_rect(40 - i * 2, 35 - i, 560 + i * 4, 36 + i * 2, 14, (210, 245, 255, max(0, alpha)))
    c.save(OUT / "10_white_ceiling_light_panel.png")


def save_cyan_strip() -> None:
    c = Canvas(130, 520)
    c.rounded_rect(42, 20, 46, 480, 8, CYAN)
    c.outline(42, 20, 46, 480, shade(DARK_BLUE, 1.15), 3)
    for i in range(8):
        c.rounded_rect(42 - i, 20 - i, 46 + i * 2, 480 + i * 2, 9, (0, 220, 255, max(0, 45 - i * 5)))
    c.save(OUT / "11_cyan_vertical_light_strip.png")


def save_shelf() -> None:
    c = Canvas(700, 160)
    c.rect(30, 70, 640, 28, GREEN)
    c.outline(30, 70, 640, 28, shade(DARK_BLUE, 1.05), 2)
    c.rect(30, 104, 640, 28, GREEN)
    c.outline(30, 104, 640, 28, shade(DARK_BLUE, 1.05), 2)
    c.save(OUT / "12_green_double_shelf_front.png")


def save_items() -> None:
    c = Canvas(700, 160)
    palette = [YELLOW, (100, 190, 22, 255), (0, 165, 220, 255), (34, 83, 210, 255), PURPLE, (210, 48, 190, 255)]
    x = 35
    for i in range(24):
        w = 15 + (i % 3) * 4
        h = 54 if i % 4 else 66
        c.rect(x, 45 + (66 - h), w, h, palette[i % len(palette)])
        c.outline(x, 45 + (66 - h), w, h, shade(DARK_BLUE, 0.9), 1)
        x += w + 7
    x = 40
    for i in range(19):
        w = 18 + (i % 2) * 5
        h = 42
        c.rect(x, 108 - h // 2, w, h, palette[(i + 2) % len(palette)])
        c.outline(x, 108 - h // 2, w, h, shade(DARK_BLUE, 0.9), 1)
        x += w + 10
    c.save(OUT / "13_shelf_goods_blocks.png")


def save_sign(name: str, fill: Color, file: str) -> None:
    c = Canvas(420, 180)
    c.rect(25, 25, 370, 130, WHITE)
    c.rect(52, 48, 316, 84, fill)
    c.outline(25, 25, 370, 130, (220, 238, 255, 255), 6)
    c.outline(52, 48, 316, 84, shade(fill, 0.75), 3)
    # Three simple white strokes mark the text area without depending on fonts.
    for i, w in enumerate((85, 115, 75)):
        c.rect(115 + i * 55, 84, w // 3, 12, WHITE)
    c.save(OUT / file)


def save_full_top_layout() -> None:
    c = Canvas(1100, 760)
    c.rect(105, 85, 890, 590, MID_BLUE)
    stud_grid(c, 130, 110, 840, 540, 34, 4)
    c.outline(105, 85, 890, 590, DARK_BLUE, 10)
    c.rect(82, 62, 936, 38, BLUE)
    c.rect(82, 660, 936, 38, BLUE)
    c.rect(82, 62, 38, 636, BLUE)
    c.rect(980, 62, 38, 636, BLUE)
    for x, y in ((45, 25), (975, 25), (45, 665), (975, 665)):
        c.rounded_rect(x, y, 80, 70, 8, BLUE)
        c.outline(x, y, 80, 70, DARK_BLUE, 4)
    c.rect(535, 95, 30, 560, DARK_BLUE)
    c.rect(120, 365, 860, 28, DARK_BLUE)
    c.rect(130, 110, 58, 38, CYAN)
    c.rect(910, 110, 58, 38, CYAN)
    c.rect(130, 615, 58, 38, CYAN)
    c.rect(910, 615, 58, 38, CYAN)
    c.save(OUT / "20_reference_full_top_plan.png")


def make_contact_sheet(files: list[Path]) -> None:
    cell_w, cell_h = 260, 210
    cols = 4
    rows = math.ceil(len(files) / cols)
    c = Canvas(cols * cell_w, rows * cell_h, (255, 255, 255, 255))
    for idx, path in enumerate(files):
        # Simple proxy tile: filename marker plus imported asset bounding box is
        # omitted to keep the generator dependency-free.
        x = (idx % cols) * cell_w
        y = (idx // cols) * cell_h
        c.rect(x + 15, y + 15, cell_w - 30, cell_h - 30, (236, 244, 252, 255))
        c.outline(x + 15, y + 15, cell_w - 30, cell_h - 30, DARK_BLUE, 2)
        # Draw a small numbered badge.
        c.circle(x + 38, y + 38, 18, BLUE)
        c.outline(x + 20, y + 20, 36, 36, DARK_BLUE, 2)
    c.save(OUT / "00_component_contact_sheet.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    generators = [
        save_floor,
        save_wall_panel,
        save_side_wall,
        save_ceiling,
        save_frame_long,
        save_frame_short,
        save_corner_block,
        save_cross_beam,
        save_center_spine,
        save_light_strip,
        save_cyan_strip,
        save_shelf,
        save_items,
        lambda: save_sign("运动鞋", (0, 137, 212, 255), "14_blue_shoes_sign_plate.png"),
        lambda: save_sign("轨迹", PURPLE, "15_purple_track_sign_plate.png"),
        lambda: save_sign("钱包", GREEN, "16_green_wallet_sign_plate.png"),
        save_full_top_layout,
    ]
    for gen in generators:
        gen()

    files = sorted(p for p in OUT.glob("*.png") if p.name != "00_component_contact_sheet.png")
    make_contact_sheet(files)
    manifest = {
        "source_reference": [
            "/tmp/codex-web-uploads/f-9KNC2Y/image.png",
            "/tmp/codex-web-uploads/f-djhKtJ/image.png",
        ],
        "note": "参考图为透视渲染图；本批 PNG 是按三视图结构意图重绘的正投影/平面构件，透明背景。",
        "components": [
            {"file": p.name, "description": desc}
            for p, desc in [
                (OUT / "01_floor_panel_top.png", "蓝色带圆点地板平面"),
                (OUT / "02_back_wall_panel_front.png", "背墙正投影墙板"),
                (OUT / "03_side_wall_panel_side.png", "侧墙正投影墙板"),
                (OUT / "04_ceiling_panel_top.png", "顶板平面"),
                (OUT / "05_outer_frame_long_beam.png", "长向外框梁/上下边框"),
                (OUT / "06_outer_frame_side_column.png", "侧向外框柱"),
                (OUT / "07_corner_cube.png", "四角方块节点"),
                (OUT / "08_ceiling_cross_beam.png", "顶面横梁"),
                (OUT / "09_ceiling_center_spine.png", "顶面中脊梁"),
                (OUT / "10_white_ceiling_light_panel.png", "白色吊顶灯"),
                (OUT / "11_cyan_vertical_light_strip.png", "青色竖向灯带"),
                (OUT / "12_green_double_shelf_front.png", "绿色双层货架"),
                (OUT / "13_shelf_goods_blocks.png", "货架彩色物品块"),
                (OUT / "14_blue_shoes_sign_plate.png", "蓝色运动鞋标牌平面"),
                (OUT / "15_purple_track_sign_plate.png", "紫色轨迹标牌平面"),
                (OUT / "16_green_wallet_sign_plate.png", "绿色钱包标牌平面"),
                (OUT / "20_reference_full_top_plan.png", "完整结构顶视平面参考"),
            ]
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
