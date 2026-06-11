#!/usr/bin/env python3
"""Split the provided front-view reference into obvious PNG components.

Only Python stdlib is used because the workspace image stack may not have PIL,
OpenCV, ImageMagick, or numpy installed.
"""

from __future__ import annotations

import json
import struct
import zlib
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/tmp/codex-web-uploads/f-VAYdfS/image.png")
OUT = ROOT / "art" / "front_reference_cutouts"


RGBA = tuple[int, int, int, int]


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def read_png_rgb(path: Path) -> tuple[int, int, bytearray]:
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError(f"not a PNG: {path}")
    offset = 8
    width = height = bit_depth = color_type = None
    compressed = bytearray()
    while offset < len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        kind = data[offset + 4 : offset + 8]
        chunk = data[offset + 8 : offset + 8 + length]
        offset += 12 + length
        if kind == b"IHDR":
            width, height, bit_depth, color_type, compression, filt, interlace = struct.unpack(">IIBBBBB", chunk)
            if bit_depth != 8 or color_type not in (2, 6) or compression != 0 or filt != 0 or interlace != 0:
                raise ValueError("only non-interlaced 8-bit RGB/RGBA PNG is supported")
        elif kind == b"IDAT":
            compressed.extend(chunk)
        elif kind == b"IEND":
            break
    if width is None or height is None or bit_depth is None or color_type is None:
        raise ValueError("missing IHDR")

    channels = 4 if color_type == 6 else 3
    stride = width * channels
    raw = zlib.decompress(bytes(compressed))
    rows: list[bytes] = []
    pos = 0
    prev = bytearray(stride)
    for _y in range(height):
        f = raw[pos]
        pos += 1
        scan = bytearray(raw[pos : pos + stride])
        pos += stride
        out = bytearray(stride)
        for i, value in enumerate(scan):
            left = out[i - channels] if i >= channels else 0
            up = prev[i]
            up_left = prev[i - channels] if i >= channels else 0
            if f == 0:
                out[i] = value
            elif f == 1:
                out[i] = (value + left) & 255
            elif f == 2:
                out[i] = (value + up) & 255
            elif f == 3:
                out[i] = (value + ((left + up) // 2)) & 255
            elif f == 4:
                out[i] = (value + paeth(left, up, up_left)) & 255
            else:
                raise ValueError(f"unsupported PNG filter: {f}")
        rows.append(bytes(out))
        prev = out

    rgba = bytearray(width * height * 4)
    for y, row in enumerate(rows):
        for x in range(width):
            si = x * channels
            di = (y * width + x) * 4
            rgba[di] = row[si]
            rgba[di + 1] = row[si + 1]
            rgba[di + 2] = row[si + 2]
            rgba[di + 3] = row[si + 3] if channels == 4 else 255
    return width, height, rgba


def write_png_rgba(path: Path, width: int, height: int, rgba: bytearray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    stride = width * 4
    raw = b"".join(b"\x00" + bytes(rgba[y * stride : (y + 1) * stride]) for y in range(height))

    def chunk(kind: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
        )

    data = b"\x89PNG\r\n\x1a\n"
    data += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    data += chunk(b"IDAT", zlib.compress(raw, 9))
    data += chunk(b"IEND", b"")
    path.write_bytes(data)


def point_in_poly(x: float, y: float, poly: list[tuple[int, int]]) -> bool:
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi):
            inside = not inside
        j = i
    return inside


def alpha_for_mask(px: int, py: int, polys: list[list[tuple[int, int]]] | None) -> int:
    if not polys:
        return 255
    # 2 px supersampling smooths the polygon edge a little.
    hits = 0
    for oy in (0.25, 0.75):
        for ox in (0.25, 0.75):
            if any(point_in_poly(px + ox, py + oy, poly) for poly in polys):
                hits += 1
    return (0, 80, 175, 230, 255)[hits]


@dataclass(frozen=True)
class Component:
    name: str
    box: tuple[int, int, int, int]
    desc: str
    polys: list[list[tuple[int, int]]] | None = None


def crop_component(
    src_w: int,
    src_h: int,
    src: bytearray,
    component: Component,
) -> tuple[int, int, bytearray]:
    x, y, w, h = component.box
    out = bytearray(w * h * 4)
    rel_polys = None
    if component.polys:
        rel_polys = [[(px - x, py - y) for px, py in poly] for poly in component.polys]
    for yy in range(h):
        sy = y + yy
        for xx in range(w):
            sx = x + xx
            di = (yy * w + xx) * 4
            if not (0 <= sx < src_w and 0 <= sy < src_h):
                continue
            alpha = alpha_for_mask(xx, yy, rel_polys)
            if alpha == 0:
                continue
            si = (sy * src_w + sx) * 4
            out[di : di + 3] = src[si : si + 3]
            out[di + 3] = alpha
    return w, h, out


def draw_rect(img: bytearray, width: int, height: int, box: tuple[int, int, int, int], color: RGBA) -> None:
    x, y, w, h = box
    for xx in range(x, x + w):
        for yy in (y, y + h - 1, y + 1, y + h - 2):
            if 0 <= xx < width and 0 <= yy < height:
                i = (yy * width + xx) * 4
                img[i : i + 4] = bytes(color)
    for yy in range(y, y + h):
        for xx in (x, x + w - 1, x + 1, x + w - 2):
            if 0 <= xx < width and 0 <= yy < height:
                i = (yy * width + xx) * 4
                img[i : i + 4] = bytes(color)


def components() -> list[Component]:
    return [
        Component("00_full_building_shell", (86, 153, 1334, 698), "完整建筑外壳，去掉上方标题和大白边"),
        Component("01_top_front_perforated_beam", (142, 158, 1216, 58), "最上方正面长梁，带一排方孔"),
        Component("02_bottom_front_base_beam", (141, 801, 1218, 51), "底部正面基座长梁"),
        Component("03_left_front_perforated_column", (89, 199, 59, 606), "左前竖向打孔立柱"),
        Component("04_right_front_perforated_column", (1358, 199, 60, 606), "右前竖向打孔立柱"),
        Component("05_top_left_corner_cube", (88, 154, 61, 51), "左上角方块节点"),
        Component("06_top_right_corner_cube", (1357, 154, 63, 51), "右上角方块节点"),
        Component("07_bottom_left_corner_cube", (88, 798, 61, 53), "左下角方块节点"),
        Component("08_bottom_right_corner_cube", (1357, 798, 63, 53), "右下角方块节点"),
        Component(
            "09_floor_panel_perspective",
            (145, 706, 1214, 100),
            "透视地板面",
            [[(145, 804), (1358, 804), (1081, 710), (440, 710)]],
        ),
        Component(
            "10_back_wall_panel",
            (439, 389, 644, 326),
            "背面蓝色圆点墙板",
            [[(440, 389), (1082, 389), (1082, 713), (440, 713)]],
        ),
        Component(
            "11_left_side_wall_panel",
            (148, 203, 304, 585),
            "左侧墙面透视墙板",
            [[(148, 203), (440, 389), (439, 713), (160, 787)]],
        ),
        Component(
            "12_right_side_wall_panel",
            (1080, 203, 281, 585),
            "右侧墙面透视墙板",
            [[(1358, 203), (1192, 389), (1081, 713), (1351, 787)]],
        ),
        Component(
            "13_ceiling_panel_perspective",
            (217, 212, 1073, 177),
            "顶部内侧天花板透视面",
            [[(218, 213), (1288, 213), (1192, 388), (440, 388)]],
        ),
        Component("14_ceiling_back_horizontal_beam", (315, 291, 879, 31), "天花后侧深蓝横梁"),
        Component("15_ceiling_front_horizontal_beam", (318, 315, 875, 32), "天花前侧深蓝横梁"),
        Component("16_ceiling_center_vertical_spine", (735, 211, 38, 198), "天花中心竖向脊梁"),
        Component(
            "17_left_ceiling_diagonal_beam",
            (148, 203, 296, 186),
            "左上斜向边梁",
            [[(148, 203), (321, 292), (444, 388), (416, 388), (145, 215)]],
        ),
        Component(
            "18_right_ceiling_diagonal_beam",
            (1081, 203, 279, 186),
            "右上斜向边梁",
            [[(1358, 203), (1191, 292), (1081, 388), (1110, 388), (1360, 215)]],
        ),
        Component("19_left_white_ceiling_light", (410, 315, 180, 23), "左侧白色吊顶灯"),
        Component("20_right_white_ceiling_light", (914, 315, 177, 23), "右侧白色吊顶灯"),
        Component("21_left_cyan_vertical_light_strip", (421, 388, 31, 326), "左侧青色竖向灯带"),
        Component("22_right_cyan_vertical_light_strip", (1055, 388, 30, 326), "右侧青色竖向灯带"),
        Component(
            "23_left_blue_shoes_sign",
            (206, 395, 151, 144),
            "左墙蓝色运动鞋标牌",
            [[(207, 399), (356, 449), (356, 538), (207, 496)]],
        ),
        Component(
            "24_center_purple_track_sign",
            (642, 484, 220, 88),
            "背墙紫色轨迹标牌",
            [[(642, 484), (862, 484), (862, 572), (642, 572)]],
        ),
        Component(
            "25_right_green_wallet_sign",
            (1151, 417, 163, 138),
            "右墙绿色钱包标牌",
            [[(1151, 464), (1314, 417), (1314, 512), (1151, 554)]],
        ),
        Component("26_left_shelf_full", (168, 586, 256, 141), "左侧货架整体，含上下层和物品"),
        Component("27_right_shelf_full", (1096, 589, 237, 137), "右侧货架整体，含上下层和物品"),
        Component("28_left_upper_goods_row", (190, 587, 211, 43), "左货架上层彩色物品"),
        Component("29_left_lower_goods_row", (191, 651, 225, 39), "左货架下层彩色物品"),
        Component("30_right_upper_goods_row", (1101, 590, 213, 43), "右货架上层彩色物品"),
        Component("31_right_lower_goods_row", (1099, 653, 226, 39), "右货架下层彩色物品"),
        Component("32_left_green_shelf_planks", (169, 619, 256, 106), "左侧两条绿色货架板"),
        Component("33_right_green_shelf_planks", (1097, 620, 236, 105), "右侧两条绿色货架板"),
    ]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    src_w, src_h, src = read_png_rgb(SRC)
    comps = components()
    manifest = {
        "source": str(SRC),
        "source_size": [src_w, src_h],
        "note": "这些 PNG 从用户提供的正视图原图裁切；多边形构件外部已置透明，保留原图透视、阴影和质感。",
        "components": [],
    }
    for index, comp in enumerate(comps):
        w, h, out = crop_component(src_w, src_h, src, comp)
        filename = f"{index:02d}_{comp.name}.png"
        write_png_rgba(OUT / filename, w, h, out)
        manifest["components"].append(
            {
                "file": filename,
                "description": comp.desc,
                "box_xywh": list(comp.box),
                "polygon_mask": comp.polys is not None,
            }
        )

    overlay = bytearray(src)
    colors: list[RGBA] = [
        (255, 40, 40, 255),
        (255, 180, 0, 255),
        (0, 210, 255, 255),
        (160, 70, 255, 255),
        (40, 240, 80, 255),
    ]
    for i, comp in enumerate(comps[1:], start=1):
        draw_rect(overlay, src_w, src_h, comp.box, colors[i % len(colors)])
    write_png_rgba(OUT / "99_component_boxes_overlay.png", src_w, src_h, overlay)
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
