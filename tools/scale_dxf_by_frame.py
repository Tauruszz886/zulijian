#!/usr/bin/env python3
"""按外框目标尺寸缩放 ASCII DXF。

用途：把 CAD 平面外框从原始长宽缩放到目标长宽，并保持高度方向 Z 不变。
当前脚本覆盖常规坐标组码和本项目 DXF 中的 AcDbShBox 历史盒体数据。
"""

from __future__ import annotations

import argparse
import math
import struct
from dataclasses import dataclass
from pathlib import Path


EPS = 1e-9
X_CODES = set(range(10, 19))
Y_CODES = set(range(20, 29))


@dataclass
class Pair:
    code_line: str
    value_line: str
    code: int | None


@dataclass
class Record:
    start: int
    end: int
    kind: str


@dataclass(frozen=True)
class Frame:
    min_x: float
    min_y: float
    max_x: float
    max_y: float

    @property
    def width(self) -> float:
        return self.max_x - self.min_x

    @property
    def height(self) -> float:
        return self.max_y - self.min_y


def parse_pairs(path: Path) -> list[Pair]:
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    pairs: list[Pair] = []
    for index in range(0, len(lines) - 1, 2):
        code_line = lines[index]
        value_line = lines[index + 1]
        try:
            code = int(code_line.strip())
        except ValueError:
            code = None
        pairs.append(Pair(code_line=code_line, value_line=value_line, code=code))
    return pairs


def write_pairs(path: Path, pairs: list[Pair]) -> None:
    lines: list[str] = []
    for pair in pairs:
        lines.append(pair.code_line)
        lines.append(pair.value_line)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def split_records(pairs: list[Pair]) -> list[Record]:
    records: list[Record] = []
    index = 0
    while index < len(pairs):
        if pairs[index].code != 0:
            index += 1
            continue
        start = index
        kind = pairs[index].value_line.strip()
        index += 1
        while index < len(pairs) and pairs[index].code != 0:
            index += 1
        records.append(Record(start=start, end=index, kind=kind))
    return records


def iter_sections(pairs: list[Pair]) -> dict[str, tuple[int, int]]:
    sections: dict[str, tuple[int, int]] = {}
    index = 0
    while index < len(pairs):
        if pair_value(pairs, index) != "SECTION":
            index += 1
            continue
        section_name = ""
        if index + 1 < len(pairs) and pairs[index + 1].code == 2:
            section_name = pairs[index + 1].value_line.strip()
        body_start = index + 2
        index = body_start
        while index < len(pairs) and pair_value(pairs, index) != "ENDSEC":
            index += 1
        sections[section_name] = (body_start, index)
        index += 1
    return sections


def pair_value(pairs: list[Pair], index: int) -> str:
    if index < 0 or index >= len(pairs):
        return ""
    return pairs[index].value_line.strip()


def read_float(value: str) -> float | None:
    try:
        return float(value.strip())
    except ValueError:
        return None


def format_float(value: float) -> str:
    if abs(value) < 1e-12:
        value = 0.0
    text = f"{value:.12f}".rstrip("0").rstrip(".")
    if text == "-0":
        return "0"
    if "." not in text and "e" not in text.lower():
        return text + ".0"
    return text


def first_value(pairs: list[Pair], record: Record, code: int) -> str:
    for index in range(record.start + 1, record.end):
        if pairs[index].code == code:
            return pairs[index].value_line.strip()
    return ""


def first_float(pairs: list[Pair], record: Record, code: int) -> float | None:
    return read_float(first_value(pairs, record, code))


def all_record_codes(pairs: list[Pair], record: Record, code: int) -> list[int]:
    return [index for index in range(record.start + 1, record.end) if pairs[index].code == code]


def record_has_subclass(pairs: list[Pair], record: Record, subclass: str) -> bool:
    for index in range(record.start + 1, record.end):
        if pairs[index].code == 100 and pairs[index].value_line.strip() == subclass:
            return True
    return False


def lwpolyline_points(pairs: list[Pair], record: Record) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    pending_x: float | None = None
    for index in range(record.start + 1, record.end):
        code = pairs[index].code
        value = read_float(pairs[index].value_line)
        if value is None:
            continue
        if code == 10:
            pending_x = value
        elif code == 20 and pending_x is not None:
            points.append((pending_x, value))
            pending_x = None
    return points


def choose_frame(pairs: list[Pair]) -> Frame:
    sections = iter_sections(pairs)
    entity_range = sections.get("ENTITIES")
    if entity_range is None:
        raise ValueError("DXF 缺少 ENTITIES 段")

    best_area = -1.0
    best_frame: Frame | None = None
    for record in split_records(pairs[entity_range[0] : entity_range[1]]):
        shifted = Record(record.start + entity_range[0], record.end + entity_range[0], record.kind)
        if shifted.kind != "LWPOLYLINE":
            continue
        flags_text = first_value(pairs, shifted, 70)
        try:
            flags = int(float(flags_text))
        except ValueError:
            flags = 0
        if (flags & 1) == 0:
            continue
        points = lwpolyline_points(pairs, shifted)
        if len(points) < 4:
            continue
        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        frame = Frame(min(xs), min(ys), max(xs), max(ys))
        area = frame.width * frame.height
        if area > best_area:
            best_area = area
            best_frame = frame
    if best_frame is not None:
        return best_frame

    points: list[tuple[float, float]] = []
    for index in range(entity_range[0], entity_range[1]):
        code = pairs[index].code
        if code not in X_CODES:
            continue
        x = read_float(pairs[index].value_line)
        if x is None:
            continue
        for next_index in range(index + 1, min(index + 4, entity_range[1])):
            if pairs[next_index].code == code + 10:
                y = read_float(pairs[next_index].value_line)
                if y is not None:
                    points.append((x, y))
                break
    if not points:
        raise ValueError("无法从 DXF 中识别外框")
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return Frame(min(xs), min(ys), max(xs), max(ys))


def scale_x(value: float, frame: Frame, sx: float) -> float:
    return frame.min_x + (value - frame.min_x) * sx


def scale_y(value: float, frame: Frame, sy: float) -> float:
    return frame.min_y + (value - frame.min_y) * sy


def records_in_range(pairs: list[Pair], start: int, end: int) -> list[Record]:
    records: list[Record] = []
    local_records = split_records(pairs[start:end])
    for record in local_records:
        records.append(Record(record.start + start, record.end + start, record.kind))
    return records


def scale_entity_coordinates(pairs: list[Pair], frame: Frame, sx: float, sy: float) -> int:
    sections = iter_sections(pairs)
    entity_range = sections.get("ENTITIES")
    if entity_range is None:
        raise ValueError("DXF 缺少 ENTITIES 段")

    changed = 0
    for record in records_in_range(pairs, entity_range[0], entity_range[1]):
        if record.kind not in {"LINE", "LWPOLYLINE", "POLYLINE", "VERTEX", "DIMENSION", "CIRCLE", "ARC", "ELLIPSE", "TEXT", "MTEXT", "INSERT", "POINT", "SOLID", "TRACE", "3DFACE"}:
            continue
        for index in range(record.start + 1, record.end):
            pair = pairs[index]
            if pair.code not in X_CODES and pair.code not in Y_CODES:
                continue
            value = read_float(pair.value_line)
            if value is None:
                continue
            if pair.code in X_CODES:
                pair.value_line = format_float(scale_x(value, frame, sx))
            else:
                pair.value_line = format_float(scale_y(value, frame, sy))
            changed += 1
    return changed


def update_dimension_measures(pairs: list[Pair]) -> int:
    changed = 0
    sections = iter_sections(pairs)
    entity_range = sections.get("ENTITIES")
    if entity_range is None:
        return changed
    for record in records_in_range(pairs, entity_range[0], entity_range[1]):
        if record.kind != "DIMENSION":
            continue
        x1 = first_float(pairs, record, 13)
        y1 = first_float(pairs, record, 23)
        x2 = first_float(pairs, record, 14)
        y2 = first_float(pairs, record, 24)
        if x1 is None or y1 is None or x2 is None or y2 is None:
            continue
        measure = math.hypot(x2 - x1, y2 - y1)
        for index in all_record_codes(pairs, record, 42)[:1]:
            pairs[index].value_line = format_float(measure)
            changed += 1
            break
    return changed


def scale_acsh_boxes(pairs: list[Pair], frame: Frame, sx: float, sy: float) -> int:
    changed = 0
    for record in split_records(pairs):
        if record.kind != "ACSH_BOX_CLASS" or not record_has_subclass(pairs, record, "AcDbShBox"):
            continue

        for code, scale_func, scale_value in ((43, scale_x, sx), (47, scale_y, sy)):
            indices = all_record_codes(pairs, record, code)
            if not indices:
                continue
            index = indices[0]
            value = read_float(pairs[index].value_line)
            if value is None:
                continue
            pairs[index].value_line = format_float(scale_func(value, frame, scale_value))
            changed += 1

        size_x_indices = all_record_codes(pairs, record, 40)
        size_y_indices = all_record_codes(pairs, record, 41)
        if size_x_indices:
            index = size_x_indices[-1]
            value = read_float(pairs[index].value_line)
            if value is not None:
                pairs[index].value_line = format_float(value * sx)
                changed += 1
        if size_y_indices:
            index = size_y_indices[-1]
            value = read_float(pairs[index].value_line)
            if value is not None:
                pairs[index].value_line = format_float(value * sy)
                changed += 1
    return changed


def record_handle(pairs: list[Pair], record: Record) -> str:
    return first_value(pairs, record, 5)


def build_handle_index(pairs: list[Pair]) -> dict[str, Record]:
    index: dict[str, Record] = {}
    for record in split_records(pairs):
        handle = record_handle(pairs, record)
        if handle:
            index[handle] = record
    return index


def solid_box_record(pairs: list[Pair], solid: Record, handle_index: dict[str, Record]) -> Record | None:
    history_handle = first_value(pairs, solid, 350)
    history = handle_index.get(history_handle)
    if history is None or history.kind != "ACSH_HISTORY_CLASS":
        return None
    graph_handle = first_value(pairs, history, 360)
    graph = handle_index.get(graph_handle)
    if graph is None or graph.kind != "ACAD_EVALUATION_GRAPH":
        return None
    box_handle = first_value(pairs, graph, 360)
    box = handle_index.get(box_handle)
    if box is None or box.kind != "ACSH_BOX_CLASS" or not record_has_subclass(pairs, box, "AcDbShBox"):
        return None
    return box


def last_float(pairs: list[Pair], record: Record, code: int) -> float | None:
    indices = all_record_codes(pairs, record, code)
    if not indices:
        return None
    return read_float(pairs[indices[-1]].value_line)


def replace_double(data: bytes, old_value: float, new_value: float) -> tuple[bytes, int]:
    old_bytes = struct.pack("<d", old_value)
    new_bytes = struct.pack("<d", new_value)
    return data.replace(old_bytes, new_bytes), data.count(old_bytes)


def asm_replacements_for_box(pairs: list[Pair], box: Record, frame: Frame, sx: float, sy: float) -> list[tuple[float, float]]:
    center_x = first_float(pairs, box, 43)
    center_y = first_float(pairs, box, 47)
    size_x = last_float(pairs, box, 40)
    size_y = last_float(pairs, box, 41)
    if center_x is None or center_y is None or size_x is None or size_y is None:
        return []

    half_x = size_x / 2
    half_y = size_y / 2
    return [
        (center_x, scale_x(center_x, frame, sx)),
        (center_y, scale_y(center_y, frame, sy)),
        (half_x, half_x * sx),
        (-half_x, -half_x * sx),
        (half_y, half_y * sy),
        (-half_y, -half_y * sy),
    ]


def scale_asm_data(pairs: list[Pair], frame: Frame, sx: float, sy: float) -> tuple[int, int]:
    handle_index = build_handle_index(pairs)
    solids: dict[str, Record] = {}
    for record in split_records(pairs):
        if record.kind == "3DSOLID":
            handle = record_handle(pairs, record)
            if handle:
                solids[handle] = record

    asm_records_changed = 0
    double_replacements = 0
    for record in split_records(pairs):
        if record.kind != "ACDSRECORD":
            continue
        solid_handle = first_value(pairs, record, 320)
        solid = solids.get(solid_handle)
        if solid is None:
            continue
        box = solid_box_record(pairs, solid, handle_index)
        if box is None:
            continue
        replacements = asm_replacements_for_box(pairs, box, frame, sx, sy)
        if not replacements:
            continue

        chunk_indices = all_record_codes(pairs, record, 310)
        if not chunk_indices:
            continue
        hex_lengths = [len(pairs[index].value_line.strip()) for index in chunk_indices]
        try:
            blob = bytes.fromhex("".join(pairs[index].value_line.strip() for index in chunk_indices))
        except ValueError:
            continue

        changed_here = 0
        for old_value, new_value in replacements:
            blob, count = replace_double(blob, old_value, new_value)
            changed_here += count
        if changed_here <= 0:
            continue

        new_hex = blob.hex().upper()
        offset = 0
        for index, hex_len in zip(chunk_indices, hex_lengths):
            pairs[index].value_line = new_hex[offset : offset + hex_len]
            offset += hex_len
        asm_records_changed += 1
        double_replacements += changed_here
    return asm_records_changed, double_replacements


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="按外框目标尺寸缩放 ASCII DXF")
    parser.add_argument("input", help="输入 DXF")
    parser.add_argument("-o", "--output", required=True, help="输出 DXF")
    parser.add_argument("--target-length", type=float, required=True, help="目标长，对应 CAD X 方向")
    parser.add_argument("--target-width", type=float, required=True, help="目标宽，对应 CAD Y 方向")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    pairs = parse_pairs(input_path)
    frame = choose_frame(pairs)
    if frame.width <= EPS or frame.height <= EPS:
        raise ValueError(f"外框尺寸异常: {frame}")

    sx = args.target_length / frame.width
    sy = args.target_width / frame.height
    coord_changes = scale_entity_coordinates(pairs, frame, sx, sy)
    dim_changes = update_dimension_measures(pairs)
    asm_records, asm_doubles = scale_asm_data(pairs, frame, sx, sy)
    box_changes = scale_acsh_boxes(pairs, frame, sx, sy)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    write_pairs(output_path, pairs)
    print(f"input={input_path}")
    print(f"output={output_path}")
    print(f"frame={format_float(frame.width)}x{format_float(frame.height)} target={format_float(args.target_length)}x{format_float(args.target_width)}")
    print(f"scale_x={format_float(sx)} scale_y={format_float(sy)}")
    print(
        "changed "
        f"generic_coords={coord_changes} dimensions={dim_changes} "
        f"asm_records={asm_records} asm_doubles={asm_doubles} acsh_box_fields={box_changes}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
