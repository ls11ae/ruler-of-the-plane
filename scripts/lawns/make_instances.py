"""
Turns the lawns drawn in `levels/lawn-mowing/lawns.txt` into CG:SHOP 2027 instances (pyutils27 JSON)
with a 3 x 3 cutter, one file per lawn and number of cutters, in `levels/lawn-mowing/instances/`.

Needs `pip install cgshop2027-pyutils`; every instance is validated with its schema. Run from the
repository root: `python3 scripts/lawns/make_instances.py`.
"""

import json
import sys
from pathlib import Path

from cgshop2027_pyutils.schemas import CGSHOP2027Instance

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "levels" / "lawn-mowing" / "lawns.txt"
OUT = ROOT / "levels" / "lawn-mowing" / "instances"
CUTTERS = (1, 2)
CUTTER = {"x": [0, 3, 3, 0], "y": [0, 0, 3, 3]}
CUTTER_CENTER = [1, 1]
CUTTER_WIDTH = 3

Cell = tuple[int, int]


def read_lawns(text: str) -> dict[str, tuple[str, list[str]]]:
    """Lawns by name as (title, rows). A lawn is a block of lines: `<name> <title>`, then its rows;
    blocks are separated by blank lines, and lines starting with `#` between blocks are comments."""
    lawns: dict[str, tuple[str, list[str]]] = {}
    name = None
    for line in text.splitlines():
        if not line.strip():
            name = None
        elif name is None and line.startswith("#"):
            continue
        elif name is None:
            name, _, title = line.partition(" ")
            lawns[name] = (title.strip(), [])
        else:
            lawns[name][1].append(line.rstrip())
    return lawns


def cells_of(rows: list[str]) -> tuple[set[Cell], dict[Cell, str]]:
    """Lawn cells and hole letters, with y pointing up (the top row has the largest y)."""
    width = max(len(row) for row in rows)
    lawn: set[Cell] = set()
    marks: dict[Cell, str] = {}
    for row_index, row in enumerate(rows):
        y = len(rows) - 1 - row_index
        for x, char in enumerate(row.ljust(width, ".")):
            if char == "#":
                lawn.add((x, y))
            elif char in "TFP":
                marks[(x, y)] = char
            elif char != ".":
                raise ValueError(f"unknown character {char!r} at ({x}, {y})")
    return lawn, marks


def components(cells: set[Cell]) -> list[set[Cell]]:
    left = set(cells)
    result = []
    while left:
        stack = [left.pop()]
        part = set(stack)
        while stack:
            x, y = stack.pop()
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if n in left:
                    left.remove(n)
                    part.add(n)
                    stack.append(n)
        result.append(part)
    return result


def hole_kind(hole: set[Cell]) -> str:
    """The art the game draws for a hole: the same rule as in the game's code."""
    xs = [x for x, _ in hole]
    ys = [y for _, y in hole]
    w, h = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    if len(hole) == w * h:
        if w == h and w <= 2:
            return "T"
        if min(w, h) <= 2 and max(w, h) >= 3:
            return "F"
    return "P"


def rings(lawn: set[Cell]) -> list[list[tuple[int, int]]]:
    """Boundary rings with the lawn on the left: the outer one CCW, holes CW (y up)."""
    nxt: dict[tuple[int, int], tuple[int, int]] = {}

    def edge(a: tuple[int, int], b: tuple[int, int]) -> None:
        if a in nxt:
            raise ValueError(f"pinch point at {a}: cells touch only at a corner")
        nxt[a] = b

    for x, y in lawn:
        if (x, y - 1) not in lawn:
            edge((x, y), (x + 1, y))
        if (x + 1, y) not in lawn:
            edge((x + 1, y), (x + 1, y + 1))
        if (x, y + 1) not in lawn:
            edge((x + 1, y + 1), (x, y + 1))
        if (x - 1, y) not in lawn:
            edge((x, y + 1), (x, y))
    result = []
    while nxt:
        start = min(nxt)
        ring = [start]
        point = nxt.pop(start)
        while point != start:
            ring.append(point)
            point = nxt.pop(point)
        # Keep corners only.
        n = len(ring)
        corners = [
            ring[i]
            for i in range(n)
            if (ring[i - 1][0] == ring[i][0]) != (ring[i][0] == ring[(i + 1) % n][0])
        ]
        result.append(corners)
    return result


def area2(ring: list[tuple[int, int]]) -> int:
    return sum(
        ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1] for i in range(len(ring))
    )


def make(name: str, rows: list[str]) -> tuple[dict, int, int]:
    lawn, marks = cells_of(rows)
    if len(components(lawn)) != 1:
        raise ValueError(f"{name}: the lawn is not connected")
    holes = components(set(marks))
    width = max(len(row) for row in rows)
    for hole in holes:
        if any(x in (0, width - 1) or y in (0, len(rows) - 1) for x, y in hole) or any(
            n not in lawn and n not in hole
            for x, y in hole
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
        ):
            raise ValueError(f"{name}: hole at {min(hole)} is not enclosed by lawn")
        letters = {marks[c] for c in hole}
        if letters != {hole_kind(hole)}:
            raise ValueError(
                f"{name}: hole at {min(hole)} drawn as {letters}, "
                f"but its shape makes it {hole_kind(hole)!r}"
            )
    all_rings = sorted(rings(lawn), key=area2, reverse=True)
    outer, inner = all_rings[0], all_rings[1:]
    if len(inner) != len(holes):
        raise ValueError(f"{name}: {len(inner)} inner rings for {len(holes)} holes")
    region = {
        "outer_boundary": {"x": [p[0] for p in outer], "y": [p[1] for p in outer]},
        "inner_boundaries": [
            {"x": [p[0] for p in ring], "y": [p[1] for p in ring]} for ring in inner
        ],
    }
    return region, len(lawn), len(holes)


def main() -> None:
    lawns = read_lawns(SOURCE.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    written = set()
    for name, (title, rows) in lawns.items():
        region, cells, holes = make(name, rows)
        for k in CUTTERS:
            uid = f"{name}_{k}s{CUTTER_WIDTH}"
            instance = {
                "content_type": "CGSHOP2027_Instance",
                "instance_uid": uid,
                "region_to_cover": region,
                "cutter": CUTTER,
                "cutter_center": CUTTER_CENTER,
                "number_of_cutters": k,
            }
            CGSHOP2027Instance.model_validate(instance)
            path = OUT / f"{uid}.instance.json"
            path.write_text(json.dumps(instance, separators=(",", ":")) + "\n")
            written.add(path.name)
        bound = -(-(cells - CUTTER_WIDTH**2) // CUTTER_WIDTH)
        print(f"{name} ({title}): {cells} cells, {holes} holes, lower bound {bound} (1 cutter)")
    for stale in OUT.glob("*.instance.json"):
        if stale.name not in written:
            stale.unlink()
            print(f"removed {stale.name}")


if __name__ == "__main__":
    sys.exit(main())
