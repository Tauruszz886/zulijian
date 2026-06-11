#!/usr/bin/env python3
"""Create clear structural-only PNG crops from the front-view reference."""

from __future__ import annotations

import importlib.util
import json
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/tmp/codex-web-uploads/f-VAYdfS/image.png")
OUT = ROOT / "art" / "front_reference_structure"
LIB_PATH = ROOT / "tools" / "split_front_reference_components.py"


spec = importlib.util.spec_from_file_location("front_split_lib", LIB_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"cannot load {LIB_PATH}")
lib = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = lib
spec.loader.exec_module(lib)


@dataclass(frozen=True)
class StructuralCrop:
    file: str
    title: str
    box: tuple[int, int, int, int]
    description: str
    scale: int = 2


def crop_rgba(src_w: int, src_h: int, src: bytearray, box: tuple[int, int, int, int]) -> tuple[int, int, bytearray]:
    x, y, w, h = box
    out = bytearray(w * h * 4)
    for yy in range(h):
        sy = y + yy
        for xx in range(w):
            sx = x + xx
            di = (yy * w + xx) * 4
            if 0 <= sx < src_w and 0 <= sy < src_h:
                si = (sy * src_w + sx) * 4
                out[di : di + 4] = src[si : si + 4]
            else:
                out[di : di + 4] = bytes((255, 255, 255, 255))
    return w, h, out


def upscale_nearest(w: int, h: int, rgba: bytearray, factor: int) -> tuple[int, int, bytearray]:
    if factor <= 1:
        return w, h, rgba
    nw, nh = w * factor, h * factor
    out = bytearray(nw * nh * 4)
    for y in range(nh):
        sy = y // factor
        for x in range(nw):
            sx = x // factor
            si = (sy * w + sx) * 4
            di = (y * nw + x) * 4
            out[di : di + 4] = rgba[si : si + 4]
    return nw, nh, out


def add_border(w: int, h: int, rgba: bytearray, pad: int = 24) -> tuple[int, int, bytearray]:
    nw, nh = w + pad * 2, h + pad * 2
    out = bytearray((255, 255, 255, 255) * (nw * nh))
    for y in range(h):
        for x in range(w):
            si = (y * w + x) * 4
            di = ((y + pad) * nw + (x + pad)) * 4
            out[di : di + 4] = rgba[si : si + 4]
    # Thin blue border, useful when opened on a white page.
    border = (20, 82, 155, 255)
    for x in range(nw):
        for y in (0, 1, nh - 2, nh - 1):
            i = (y * nw + x) * 4
            out[i : i + 4] = bytes(border)
    for y in range(nh):
        for x in (0, 1, nw - 2, nw - 1):
            i = (y * nw + x) * 4
            out[i : i + 4] = bytes(border)
    return nw, nh, out


def crops() -> list[StructuralCrop]:
    return [
        StructuralCrop(
            "01_outer_top_beam_style.png",
            "顶部外框长梁",
            (137, 154, 1230, 78),
            "顶部正面长梁，包含方孔、深蓝底边和上方高光，用来看外框梁样式。",
        ),
        StructuralCrop(
            "02_outer_bottom_beam_style.png",
            "底部基座长梁",
            (135, 780, 1238, 82),
            "底部正面基座梁，包含厚蓝色横梁和两端节点衔接。",
        ),
        StructuralCrop(
            "03_left_column_style.png",
            "左前立柱",
            (82, 148, 92, 720),
            "左侧前立柱，包含上下角块、竖向打孔柱和底座。",
        ),
        StructuralCrop(
            "04_right_column_style.png",
            "右前立柱",
            (1336, 148, 94, 720),
            "右侧前立柱，包含上下角块、竖向打孔柱和底座。",
        ),
        StructuralCrop(
            "05_corner_cube_style.png",
            "角部方块节点",
            (80, 145, 82, 74),
            "外框角部方块节点局部，展示倒角、高光和描边。",
            scale=3,
        ),
        StructuralCrop(
            "06_back_wall_panel_style.png",
            "背墙墙体",
            (410, 360, 710, 380),
            "背面主墙体，保留圆点墙板、底部深蓝踢脚线和两侧边缘。",
        ),
        StructuralCrop(
            "07_left_wall_panel_style.png",
            "左侧墙体",
            (135, 205, 350, 595),
            "左侧透视墙体，展示圆点墙面、内角和墙脚。",
        ),
        StructuralCrop(
            "08_right_wall_panel_style.png",
            "右侧墙体",
            (1045, 205, 335, 595),
            "右侧透视墙体，展示圆点墙面、内角和墙脚。",
        ),
        StructuralCrop(
            "09_ceiling_panel_style.png",
            "天花板",
            (190, 205, 1130, 205),
            "顶部天花板整体局部，包含浅蓝圆点顶板、斜边和中间竖梁。",
        ),
        StructuralCrop(
            "10_ceiling_cross_beam_style.png",
            "天花横梁",
            (300, 280, 925, 86),
            "天花前后横梁局部，包含两条深蓝横梁和灯所在的结构层。",
        ),
        StructuralCrop(
            "11_ceiling_center_spine_style.png",
            "天花中脊梁",
            (710, 205, 90, 220),
            "中间竖向脊梁局部，展示梁厚度和节点。",
            scale=3,
        ),
        StructuralCrop(
            "12_floor_panel_style.png",
            "地板",
            (130, 690, 1250, 135),
            "地板透视面，展示蓝色圆点地砖、后缘和前方基座交接。",
        ),
        StructuralCrop(
            "13_floor_texture_closeup.png",
            "地板圆点纹理近景",
            (550, 715, 340, 95),
            "地板圆点纹理放大局部，只看材质和排列。",
            scale=4,
        ),
        StructuralCrop(
            "14_wall_texture_closeup.png",
            "墙体圆点纹理近景",
            (525, 410, 340, 170),
            "背墙圆点纹理放大局部，只看墙体材质和颜色层次。",
            scale=3,
        ),
        StructuralCrop(
            "15_ceiling_texture_closeup.png",
            "天花圆点纹理近景",
            (500, 220, 360, 90),
            "天花浅蓝圆点纹理放大局部。",
            scale=4,
        ),
    ]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    src_w, src_h, src = lib.read_png_rgb(SRC)
    manifest = {
        "source": str(SRC),
        "source_size": [src_w, src_h],
        "note": "只拆建筑结构相关局部：梁、柱子、墙体、天花板、地板。所有输出为白底放大 PNG，重点是看清样式。",
        "components": [],
    }
    for item in crops():
        w, h, rgba = crop_rgba(src_w, src_h, src, item.box)
        w, h, rgba = upscale_nearest(w, h, rgba, item.scale)
        w, h, rgba = add_border(w, h, rgba, pad=24)
        lib.write_png_rgba(OUT / item.file, w, h, rgba)
        manifest["components"].append(
            {
                "file": item.file,
                "title": item.title,
                "description": item.description,
                "source_box_xywh": list(item.box),
                "scale": item.scale,
                "output_size": [w, h],
            }
        )
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
