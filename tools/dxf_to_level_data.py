#!/usr/bin/env python3
"""读取 ASCII DXF，并转成项目可消费的关卡几何 JSON。

脚本不依赖 ezdxf，覆盖当前关卡图常见实体：
- LINE / LWPOLYLINE：作为可靠几何输入
- DIMENSION：保留尺寸标注，辅助人工核对
- 3DSOLID：记录句柄和引用；AutoCAD 写出的 ACIS 几何不一定在 DXF 中可读
- CIRCLE / ARC：作为通用兼容

默认坐标约定：
- CAD X -> local x
- CAD Y -> local z
- origin 取最大闭合 LWPOLYLINE 外框的 min_x/min_y；没有外框时取线段几何 bounds
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


DEFAULT_OUTPUT_DIR = "art/dxf_level_data"
SCHEMA = "zulijian.dxf_level_data.v1"
EPS = 1e-6


Pair = tuple[int, str]
Point2 = tuple[float, float]
Segment = tuple[float, float, float, float]
Bounds = tuple[float, float, float, float]


@dataclass(frozen=True)
class Transform:
    origin_x: float
    origin_y: float
    max_y: float
    z_mode: str
    round_digits: int

    def point(self, x: float, y: float) -> dict[str, float]:
        z = y - self.origin_y
        if self.z_mode == "flip-y":
            z = self.max_y - y
        return {"x": round_num(x - self.origin_x, self.round_digits), "z": round_num(z, self.round_digits)}


def round_num(value: float, digits: int) -> float:
    rounded = round(value, digits)
    if rounded == 0:
        return 0.0
    return rounded


def read_pairs(path: Path) -> list[Pair]:
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    pairs: list[Pair] = []
    for index in range(0, len(lines) - 1, 2):
        raw_code = lines[index].strip()
        if not raw_code:
            continue
        try:
            code = int(raw_code)
        except ValueError:
            continue
        pairs.append((code, lines[index + 1].strip()))
    return pairs


def split_sections(pairs: list[Pair]) -> dict[str, list[Pair]]:
    sections: dict[str, list[Pair]] = {}
    index = 0
    while index < len(pairs):
        if pairs[index] != (0, "SECTION"):
            index += 1
            continue
        name = ""
        if index + 1 < len(pairs) and pairs[index + 1][0] == 2:
            name = pairs[index + 1][1]
        index += 2
        body: list[Pair] = []
        while index < len(pairs) and pairs[index] != (0, "ENDSEC"):
            body.append(pairs[index])
            index += 1
        sections[name] = body
        index += 1
    return sections


def split_entities(section_pairs: list[Pair]) -> list[tuple[str, list[Pair]]]:
    entities: list[tuple[str, list[Pair]]] = []
    index = 0
    while index < len(section_pairs):
        code, value = section_pairs[index]
        if code != 0:
            index += 1
            continue
        entity_type = value
        index += 1
        data: list[Pair] = []
        while index < len(section_pairs) and section_pairs[index][0] != 0:
            data.append(section_pairs[index])
            index += 1
        entities.append((entity_type, data))
    return entities


def first_value(data: list[Pair], code: int, default: str = "") -> str:
    for item_code, value in data:
        if item_code == code:
            return value
    return default


def first_float(data: list[Pair], code: int, default: float = 0.0) -> float:
    value = first_value(data, code)
    if value == "":
        return default
    try:
        return float(value)
    except ValueError:
        return default


def first_int(data: list[Pair], code: int, default: int = 0) -> int:
    value = first_value(data, code)
    if value == "":
        return default
    try:
        return int(float(value))
    except ValueError:
        return default


def all_values(data: list[Pair], code: int) -> list[str]:
    return [value for item_code, value in data if item_code == code]


def all_floats(data: list[Pair], code: int) -> list[float]:
    values: list[float] = []
    for value in all_values(data, code):
        try:
            values.append(float(value))
        except ValueError:
            continue
    return values


def last_float(data: list[Pair], code: int, default: float = 0.0) -> float:
    values = all_floats(data, code)
    if not values:
        return default
    return values[-1]


def cad_point(data: list[Pair], x_code: int, y_code: int, z_code: int | None = None) -> dict[str, float]:
    point = {
        "x": first_float(data, x_code),
        "y": first_float(data, y_code),
    }
    if z_code is not None:
        point["z"] = first_float(data, z_code)
    return point


def parse_lwpolyline(data: list[Pair], transform: Transform | None, digits: int) -> dict[str, Any]:
    vertices: list[dict[str, Any]] = []
    pending: dict[str, Any] | None = None
    for code, value in data:
        if code == 10:
            if pending is not None:
                vertices.append(pending)
            pending = {"x": float(value)}
        elif code == 20 and pending is not None:
            pending["y"] = float(value)
        elif code == 42 and pending is not None:
            pending["bulge"] = float(value)
        elif code == 40 and pending is not None:
            pending["start_width"] = float(value)
        elif code == 41 and pending is not None:
            pending["end_width"] = float(value)
    if pending is not None:
        vertices.append(pending)

    flags = first_int(data, 70)
    item: dict[str, Any] = entity_base("LWPOLYLINE", data)
    item.update(
        {
            "closed": (flags & 1) == 1,
            "flags": flags,
            "vertex_count": first_int(data, 90, len(vertices)),
            "vertices": [round_mapping(v, digits) for v in vertices],
        }
    )
    if transform is not None:
        item["vertices_local"] = [transform.point(v["x"], v["y"]) for v in vertices if "y" in v]
    return item


def parse_line(data: list[Pair], transform: Transform | None, digits: int) -> dict[str, Any]:
    start = cad_point(data, 10, 20, 30)
    end = cad_point(data, 11, 21, 31)
    dx = end["x"] - start["x"]
    dy = end["y"] - start["y"]
    orientation = "diagonal"
    if abs(dx) <= EPS:
        orientation = "vertical"
    elif abs(dy) <= EPS:
        orientation = "horizontal"
    item: dict[str, Any] = entity_base("LINE", data)
    item.update(
        {
            "start": round_mapping(start, digits),
            "end": round_mapping(end, digits),
            "length": round_num(math.hypot(dx, dy), digits),
            "orientation": orientation,
        }
    )
    if transform is not None:
        item["start_local"] = transform.point(start["x"], start["y"])
        item["end_local"] = transform.point(end["x"], end["y"])
    return item


def parse_dimension(data: list[Pair], transform: Transform | None, digits: int) -> dict[str, Any]:
    p1 = cad_point(data, 13, 23, 33)
    p2 = cad_point(data, 14, 24, 34)
    item: dict[str, Any] = entity_base("DIMENSION", data)
    item.update(
        {
            "name": first_value(data, 2),
            "style": first_value(data, 3),
            "dimension_type": first_int(data, 70),
            "subclasses": all_values(data, 100),
            "measure": round_num(first_float(data, 42), digits),
            "definition_start": round_mapping(p1, digits),
            "definition_end": round_mapping(p2, digits),
            "dimension_line_point": round_mapping(cad_point(data, 10, 20, 30), digits),
            "text_midpoint": round_mapping(cad_point(data, 11, 21, 31), digits),
        }
    )
    rotation = first_value(data, 50)
    if rotation != "":
        item["rotation_degrees"] = round_num(float(rotation), digits)
    if transform is not None:
        item["definition_start_local"] = transform.point(p1["x"], p1["y"])
        item["definition_end_local"] = transform.point(p2["x"], p2["y"])
    return item


def parse_3dsolid(data: list[Pair]) -> dict[str, Any]:
    item = entity_base("3DSOLID", data)
    item.update(
        {
            "persistent_id": first_value(data, 2),
            "history_handle": first_value(data, 350),
            "geometry_status": "recorded_without_readable_mesh",
        }
    )
    return item


def parse_circle(data: list[Pair], transform: Transform | None, digits: int) -> dict[str, Any]:
    center = cad_point(data, 10, 20, 30)
    item = entity_base("CIRCLE", data)
    item.update({"center": round_mapping(center, digits), "radius": round_num(first_float(data, 40), digits)})
    if transform is not None:
        item["center_local"] = transform.point(center["x"], center["y"])
    return item


def parse_arc(data: list[Pair], transform: Transform | None, digits: int) -> dict[str, Any]:
    item = parse_circle(data, transform, digits)
    item["type"] = "ARC"
    item["start_angle_degrees"] = round_num(first_float(data, 50), digits)
    item["end_angle_degrees"] = round_num(first_float(data, 51), digits)
    return item


def entity_base(entity_type: str, data: list[Pair]) -> dict[str, Any]:
    return {"type": entity_type, "handle": first_value(data, 5), "layer": first_value(data, 8, "0")}


def round_mapping(values: dict[str, Any], digits: int) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in values.items():
        out[key] = round_num(value, digits) if isinstance(value, float) else value
    return out


def parse_header(sections: dict[str, list[Pair]]) -> dict[str, str]:
    header = sections.get("HEADER", [])
    values: dict[str, str] = {}
    index = 0
    while index < len(header):
        code, value = header[index]
        if code == 9:
            key = value
            if index + 1 < len(header):
                values[key] = header[index + 1][1]
            index += 2
            continue
        index += 1
    return values


def parse_entities(raw_entities: list[tuple[str, list[Pair]]], transform: Transform | None, digits: int) -> dict[str, list[dict[str, Any]]]:
    parsed: dict[str, list[dict[str, Any]]] = {
        "lines": [],
        "polylines": [],
        "dimensions": [],
        "solids3d": [],
        "circles": [],
        "arcs": [],
        "unsupported": [],
    }
    for index, (entity_type, data) in enumerate(raw_entities):
        if entity_type == "LINE":
            item = parse_line(data, transform, digits)
            item["index"] = index
            parsed["lines"].append(item)
        elif entity_type == "LWPOLYLINE":
            item = parse_lwpolyline(data, transform, digits)
            item["index"] = index
            parsed["polylines"].append(item)
        elif entity_type == "DIMENSION":
            item = parse_dimension(data, transform, digits)
            item["index"] = index
            parsed["dimensions"].append(item)
        elif entity_type == "3DSOLID":
            item = parse_3dsolid(data)
            item["index"] = index
            parsed["solids3d"].append(item)
        elif entity_type == "CIRCLE":
            item = parse_circle(data, transform, digits)
            item["index"] = index
            parsed["circles"].append(item)
        elif entity_type == "ARC":
            item = parse_arc(data, transform, digits)
            item["index"] = index
            parsed["arcs"].append(item)
        else:
            parsed["unsupported"].append(
                {
                    "index": index,
                    "type": entity_type,
                    "handle": first_value(data, 5),
                    "layer": first_value(data, 8, "0"),
                    "group_count": len(data),
                }
            )
    return parsed


def bounds_from_points(points: Iterable[Point2]) -> Bounds | None:
    pts = list(points)
    if not pts:
        return None
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))


def bounds_dict(bounds: Bounds, digits: int) -> dict[str, float]:
    min_x, min_y, max_x, max_y = bounds
    return {
        "min_x": round_num(min_x, digits),
        "min_y": round_num(min_y, digits),
        "max_x": round_num(max_x, digits),
        "max_y": round_num(max_y, digits),
        "width": round_num(max_x - min_x, digits),
        "height": round_num(max_y - min_y, digits),
    }


def collect_geometry_points(raw_entities: list[tuple[str, list[Pair]]], include_dimensions: bool) -> list[Point2]:
    points: list[Point2] = []
    for entity_type, data in raw_entities:
        if entity_type == "LINE":
            points.append((first_float(data, 10), first_float(data, 20)))
            points.append((first_float(data, 11), first_float(data, 21)))
        elif entity_type == "LWPOLYLINE":
            points.extend(lwpolyline_points(data))
        elif entity_type in ("CIRCLE", "ARC"):
            cx = first_float(data, 10)
            cy = first_float(data, 20)
            radius = first_float(data, 40)
            points.extend([(cx - radius, cy - radius), (cx + radius, cy + radius)])
        elif include_dimensions and entity_type == "DIMENSION":
            for x_code, y_code in ((10, 20), (11, 21), (13, 23), (14, 24)):
                points.append((first_float(data, x_code), first_float(data, y_code)))
    return points


def lwpolyline_points(data: list[Pair]) -> list[Point2]:
    points: list[Point2] = []
    pending_x: float | None = None
    for code, value in data:
        if code == 10:
            pending_x = float(value)
        elif code == 20 and pending_x is not None:
            points.append((pending_x, float(value)))
            pending_x = None
    return points


def choose_frame(raw_entities: list[tuple[str, list[Pair]]]) -> dict[str, Any] | None:
    candidates: list[tuple[float, dict[str, Any]]] = []
    for index, (entity_type, data) in enumerate(raw_entities):
        if entity_type != "LWPOLYLINE":
            continue
        flags = first_int(data, 70)
        if (flags & 1) != 1:
            continue
        points = lwpolyline_points(data)
        bounds = bounds_from_points(points)
        if bounds is None:
            continue
        min_x, min_y, max_x, max_y = bounds
        area = (max_x - min_x) * (max_y - min_y)
        candidates.append(
            (
                area,
                {
                    "source": "largest_closed_lwpolyline",
                    "entity_index": index,
                    "handle": first_value(data, 5),
                    "cad_bounds": bounds,
                    "points": points,
                },
            )
        )
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def extract_segments(raw_entities: list[tuple[str, list[Pair]]], digits: int) -> list[Segment]:
    segments: list[Segment] = []
    for entity_type, data in raw_entities:
        if entity_type == "LINE":
            segments.append(
                (
                    round_num(first_float(data, 10), digits),
                    round_num(first_float(data, 20), digits),
                    round_num(first_float(data, 11), digits),
                    round_num(first_float(data, 21), digits),
                )
            )
        elif entity_type == "LWPOLYLINE":
            points = [(round_num(x, digits), round_num(y, digits)) for x, y in lwpolyline_points(data)]
            for start, end in zip(points, points[1:]):
                segments.append((start[0], start[1], end[0], end[1]))
            if first_int(data, 70) & 1 and len(points) > 2:
                start = points[-1]
                end = points[0]
                segments.append((start[0], start[1], end[0], end[1]))
    return segments


def canonical_segment(segment: Segment, digits: int) -> Segment:
    x1, y1, x2, y2 = (round_num(v, digits) for v in segment)
    if (x2, y2) < (x1, y1):
        return (x2, y2, x1, y1)
    return (x1, y1, x2, y2)


def dedupe_segments(segments: list[Segment], digits: int) -> list[Segment]:
    seen = {canonical_segment(segment, digits) for segment in segments}
    return sorted(seen, key=lambda item: (item[0], item[1], item[2], item[3]))


def merge_intervals(intervals: list[tuple[float, float]]) -> list[tuple[float, float]]:
    merged: list[list[float]] = []
    for start, end in sorted(intervals):
        if not merged or start > merged[-1][1] + EPS:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return [(start, end) for start, end in merged]


def axis_interval_maps(segments: list[Segment]) -> tuple[dict[float, list[tuple[float, float]]], dict[float, list[tuple[float, float]]], list[float], list[float]]:
    horizontal: dict[float, list[tuple[float, float]]] = defaultdict(list)
    vertical: dict[float, list[tuple[float, float]]] = defaultdict(list)
    xs: set[float] = set()
    ys: set[float] = set()
    for x1, y1, x2, y2 in segments:
        xs.update((x1, x2))
        ys.update((y1, y2))
        if abs(y1 - y2) <= EPS:
            start, end = sorted((x1, x2))
            horizontal[y1].append((start, end))
        elif abs(x1 - x2) <= EPS:
            start, end = sorted((y1, y2))
            vertical[x1].append((start, end))
    return (
        {key: merge_intervals(value) for key, value in horizontal.items()},
        {key: merge_intervals(value) for key, value in vertical.items()},
        sorted(xs),
        sorted(ys),
    )


def interval_covered(intervals: list[tuple[float, float]], start: float, end: float) -> bool:
    cursor = start
    for interval_start, interval_end in intervals:
        if interval_end < cursor + EPS:
            continue
        if interval_start > cursor + EPS:
            return False
        cursor = max(cursor, interval_end)
        if cursor >= end - EPS:
            return True
    return False


def detect_rectangles(segments: list[Segment], frame_bounds: Bounds | None, transform: Transform, digits: int) -> list[dict[str, Any]]:
    horizontal, vertical, xs, ys = axis_interval_maps(segments)
    rectangles: list[dict[str, Any]] = []
    for x_index, x1 in enumerate(xs):
        for x2 in xs[x_index + 1 :]:
            if x2 - x1 <= EPS:
                continue
            for y_index, y1 in enumerate(ys):
                for y2 in ys[y_index + 1 :]:
                    if y2 - y1 <= EPS:
                        continue
                    if not interval_covered(horizontal.get(y1, []), x1, x2):
                        continue
                    if not interval_covered(horizontal.get(y2, []), x1, x2):
                        continue
                    if not interval_covered(vertical.get(x1, []), y1, y2):
                        continue
                    if not interval_covered(vertical.get(x2, []), y1, y2):
                        continue
                    width = x2 - x1
                    height = y2 - y1
                    is_frame = False
                    if frame_bounds is not None:
                        is_frame = all(abs(a - b) <= 10**(-digits + 1) for a, b in zip((x1, y1, x2, y2), frame_bounds))
                    local_min = transform.point(x1, y1)
                    local_max = transform.point(x2, y2)
                    start_x = min(local_min["x"], local_max["x"])
                    start_z = min(local_min["z"], local_max["z"])
                    end_x = max(local_min["x"], local_max["x"])
                    end_z = max(local_min["z"], local_max["z"])
                    rectangles.append(
                        {
                            "cad_bounds": bounds_dict((x1, y1, x2, y2), digits),
                            "local_rect": {
                                "startX": round_num(start_x, digits),
                                "startZ": round_num(start_z, digits),
                                "sx": round_num(end_x - start_x, digits),
                                "sz": round_num(end_z - start_z, digits),
                            },
                            "area": round_num(width * height, digits),
                            "is_frame": is_frame,
                            "source": "closed_axis_aligned_segments",
                        }
                    )
    return sorted(rectangles, key=lambda item: (-item["area"], item["local_rect"]["startX"], item["local_rect"]["startZ"]))


def build_runtime_pieces(rectangles: list[dict[str, Any]], digits: int) -> list[dict[str, Any]]:
    pieces: list[dict[str, Any]] = []
    for index, rect in enumerate([item for item in rectangles if not item["is_frame"]], start=1):
        local = rect["local_rect"]
        pieces.append(
            {
                "name": f"rect_{index:03d}_{format_size(local['sx'])}x{format_size(local['sz'])}",
                "startX": round_num(float(local["startX"]), digits),
                "startZ": round_num(float(local["startZ"]), digits),
                "sx": round_num(float(local["sx"]), digits),
                "sz": round_num(float(local["sz"]), digits),
                "source": rect["source"],
            }
        )
    return pieces


def format_size(value: Any) -> str:
    number = float(value)
    text = f"{number:g}"
    return text.replace(".", "_")


def build_layer_summary(raw_entities: list[tuple[str, list[Pair]]]) -> dict[str, Any]:
    layers: dict[str, Counter[str]] = defaultdict(Counter)
    for entity_type, data in raw_entities:
        layers[first_value(data, 8, "0")][entity_type] += 1
    return {layer: dict(counts) for layer, counts in sorted(layers.items())}


def build_axis_segments(segments: list[Segment], transform: Transform, digits: int) -> list[dict[str, Any]]:
    axis_segments: list[dict[str, Any]] = []
    for x1, y1, x2, y2 in segments:
        if abs(x1 - x2) <= EPS:
            orientation = "vertical"
        elif abs(y1 - y2) <= EPS:
            orientation = "horizontal"
        else:
            continue
        local_start = transform.point(x1, y1)
        local_end = transform.point(x2, y2)
        axis_segments.append(
            {
                "orientation": orientation,
                "cad": {
                    "start": {"x": round_num(x1, digits), "y": round_num(y1, digits)},
                    "end": {"x": round_num(x2, digits), "y": round_num(y2, digits)},
                },
                "local": {"start": local_start, "end": local_end},
                "length": round_num(math.hypot(x2 - x1, y2 - y1), digits),
            }
        )
    return sorted(axis_segments, key=lambda item: (item["orientation"], item["cad"]["start"]["x"], item["cad"]["start"]["y"], item["cad"]["end"]["x"], item["cad"]["end"]["y"]))


def build_handle_index(raw_objects: list[tuple[str, list[Pair]]]) -> dict[str, tuple[str, list[Pair]]]:
    index: dict[str, tuple[str, list[Pair]]] = {}
    for entity_type, data in raw_objects:
        handle = first_value(data, 5)
        if handle != "":
            index[handle] = (entity_type, data)
    return index


def build_object_counts(raw_objects: list[tuple[str, list[Pair]]]) -> dict[str, int]:
    return dict(sorted(Counter(entity_type for entity_type, _ in raw_objects).items()))


def parse_acsh_box_class(data: list[Pair], transform: Transform, digits: int) -> dict[str, Any] | None:
    subclasses = all_values(data, 100)
    if "AcDbShBox" not in subclasses:
        return None

    tx = first_float(data, 43)
    ty = first_float(data, 47)
    m00 = first_float(data, 40)
    m01 = first_float(data, 41)
    m02 = first_float(data, 42)
    m10 = first_float(data, 44)
    m11 = first_float(data, 45)
    m12 = first_float(data, 46)
    size_x = last_float(data, 40)
    size_y = last_float(data, 41)
    size_z = last_float(data, 42)

    projected_sx = abs(m00) * size_x + abs(m01) * size_y + abs(m02) * size_z
    projected_sz = abs(m10) * size_x + abs(m11) * size_y + abs(m12) * size_z
    center = transform.point(tx, ty)
    start_x = center["x"] - projected_sx / 2
    start_z = center["z"] - projected_sz / 2

    return {
        "box_handle": first_value(data, 5),
        "graph_handle": first_value(data, 330),
        "node_id": first_int(data, 92),
        "cad_center": {
            "x": round_num(tx, digits),
            "y": round_num(ty, digits),
        },
        "local_center": center,
        "topdown_rect": {
            "startX": round_num(start_x, digits),
            "startZ": round_num(start_z, digits),
            "sx": round_num(projected_sx, digits),
            "sz": round_num(projected_sz, digits),
        },
        "raw_box_size": {
            "x": round_num(size_x, digits),
            "y": round_num(size_y, digits),
            "z": round_num(size_z, digits),
        },
        "topdown_transform": {
            "m00": round_num(m00, digits),
            "m01": round_num(m01, digits),
            "m02": round_num(m02, digits),
            "m10": round_num(m10, digits),
            "m11": round_num(m11, digits),
            "m12": round_num(m12, digits),
        },
        "source": "ACSH_BOX_CLASS",
    }


def build_solid_box_candidates(
    solids: list[dict[str, Any]],
    raw_objects: list[tuple[str, list[Pair]]],
    transform: Transform,
    digits: int,
) -> list[dict[str, Any]]:
    object_index = build_handle_index(raw_objects)
    candidates: list[dict[str, Any]] = []
    for solid in solids:
        solid_handle = str(solid.get("handle", ""))
        history_handle = str(solid.get("history_handle", ""))
        history = object_index.get(history_handle)
        if history is None or history[0] != "ACSH_HISTORY_CLASS":
            continue
        graph_handle = first_value(history[1], 360)
        graph = object_index.get(graph_handle)
        if graph is None or graph[0] != "ACAD_EVALUATION_GRAPH":
            continue
        box_handle = first_value(graph[1], 360)
        box = object_index.get(box_handle)
        if box is None or box[0] != "ACSH_BOX_CLASS":
            continue
        parsed_box = parse_acsh_box_class(box[1], transform, digits)
        if parsed_box is None:
            continue
        local_rect = parsed_box["topdown_rect"]
        candidates.append(
            {
                "solid_handle": solid_handle,
                "history_handle": history_handle,
                "persistent_id": solid.get("persistent_id", ""),
                "name": f"solid_{solid_handle}_{format_size(local_rect['sx'])}x{format_size(local_rect['sz'])}",
                **parsed_box,
            }
        )
    return sorted(
        candidates,
        key=lambda item: (
            item["topdown_rect"]["startX"],
            item["topdown_rect"]["startZ"],
            item["solid_handle"],
        ),
    )


def build_data(input_path: Path, z_mode: str, digits: int) -> dict[str, Any]:
    pairs = read_pairs(input_path)
    sections = split_sections(pairs)
    raw_entities = split_entities(sections.get("ENTITIES", []))
    raw_objects = split_entities(sections.get("OBJECTS", []))
    header = parse_header(sections)
    entity_counts = Counter(entity_type for entity_type, _ in raw_entities)

    frame = choose_frame(raw_entities)
    geometry_bounds = bounds_from_points(collect_geometry_points(raw_entities, include_dimensions=False))
    drawing_bounds = bounds_from_points(collect_geometry_points(raw_entities, include_dimensions=True))
    if frame is not None:
        transform_bounds = frame["cad_bounds"]
    elif geometry_bounds is not None:
        transform_bounds = geometry_bounds
    elif drawing_bounds is not None:
        transform_bounds = drawing_bounds
    else:
        transform_bounds = (0.0, 0.0, 0.0, 0.0)

    min_x, min_y, max_x, max_y = transform_bounds
    transform = Transform(origin_x=min_x, origin_y=min_y, max_y=max_y, z_mode=z_mode, round_digits=digits)
    parsed = parse_entities(raw_entities, transform, digits)
    segments = dedupe_segments(extract_segments(raw_entities, digits), digits)
    rectangles = detect_rectangles(segments, transform_bounds, transform, digits)

    frame_data: dict[str, Any] | None = None
    if frame is not None:
        frame_data = {
            "source": frame["source"],
            "entity_index": frame["entity_index"],
            "handle": frame["handle"],
            "cad_bounds": bounds_dict(frame["cad_bounds"], digits),
            "local_bounds": {
                "startX": 0.0,
                "startZ": 0.0,
                "sx": round_num(max_x - min_x, digits),
                "sz": round_num(max_y - min_y, digits),
            },
            "points": [{"x": round_num(x, digits), "y": round_num(y, digits)} for x, y in frame["points"]],
            "points_local": [transform.point(x, y) for x, y in frame["points"]],
        }

    data = {
        "schema": SCHEMA,
        "source": {
            "path": str(input_path),
            "filename": input_path.name,
            "acad_version": header.get("$ACADVER", ""),
        },
        "options": {
            "round_digits": digits,
            "z_mode": z_mode,
            "coordinate_mapping": "cad_x_to_local_x__cad_y_to_local_z",
        },
        "summary": {
            "entity_counts": dict(sorted(entity_counts.items())),
            "object_counts": build_object_counts(raw_objects),
            "layers": build_layer_summary(raw_entities),
            "geometry_bounds": bounds_dict(geometry_bounds, digits) if geometry_bounds is not None else None,
            "drawing_bounds": bounds_dict(drawing_bounds, digits) if drawing_bounds is not None else None,
        },
        "frame": frame_data,
        "entities": parsed,
        "processed": {
            "axis_segments": build_axis_segments(segments, transform, digits),
            "rectangle_candidates": rectangles,
            "runtime_terrain_piece_candidates": build_runtime_pieces(rectangles, digits),
            "solid_box_candidates": build_solid_box_candidates(parsed["solids3d"], raw_objects, transform, digits),
            "notes": [
                "rectangle_candidates 只来自闭合的轴对齐线段边界。",
                "solid_box_candidates 来自 3DSOLID 的 ACSH_BOX_CLASS 历史数据；topdown_rect 是按 CAD 俯视投影得到的施工参考。",
                "3DSOLID 的 ACIS mesh 未直接解析；如需要斜面/非盒体，应额外校验 ACDSDATA。",
            ],
        },
    }
    return data


def print_summary(data: dict[str, Any]) -> None:
    summary = data["summary"]
    processed = data["processed"]
    print("DXF:", data["source"]["path"])
    print("ACADVER:", data["source"].get("acad_version") or "(unknown)")
    print("entities:", json.dumps(summary["entity_counts"], ensure_ascii=False, sort_keys=True))
    if data["frame"] is not None:
        print("frame:", json.dumps(data["frame"]["local_bounds"], ensure_ascii=False, sort_keys=True))
    print("axis_segments:", len(processed["axis_segments"]))
    print("rectangle_candidates:", len(processed["rectangle_candidates"]))
    print("runtime_terrain_piece_candidates:", len(processed["runtime_terrain_piece_candidates"]))
    print("solid_box_candidates:", len(processed["solid_box_candidates"]))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="读取 ASCII DXF 并导出关卡几何 JSON")
    parser.add_argument("input", help="DXF 文件路径")
    parser.add_argument(
        "-o",
        "--output",
        default="",
        help="输出 JSON 路径；不传则写入 art/dxf_level_data/<dxf_stem>.json",
    )
    parser.add_argument("--z-mode", choices=("cad-y", "flip-y"), default="cad-y", help="CAD Y 转 local Z 的方式")
    parser.add_argument("--round-digits", type=int, default=6, help="输出数字保留位数")
    parser.add_argument("--summary", action="store_true", help="导出后打印摘要")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).expanduser().resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"DXF 文件不存在: {input_path}")
    data = build_data(input_path, z_mode=args.z_mode, digits=args.round_digits)

    if args.output:
        output_path = Path(args.output).expanduser().resolve()
    else:
        output_dir = (Path.cwd() / DEFAULT_OUTPUT_DIR).resolve()
        output_path = output_dir / f"{input_path.stem}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output_path)
    if args.summary:
        print_summary(data)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
