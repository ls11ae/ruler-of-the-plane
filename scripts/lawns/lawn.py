"""
The lawn-mowing model shared by the solver scripts: a lawn (the cells to mow, rasterized exactly as the
pyutils27 verifier does), the cutter's footprint, closed tours as walks of unit steps, and reading and
writing pyutils27 files.

Coordinates as in pyutils27: y points up, cell (x, y) is the unit square [x, x + 1] x [y, y + 1], and a
cutter at the lattice point p covers the cells of the cutter shape shifted by p - cutter_center. For the
booth lawns (3 x 3 cutter, centre (1, 1)) that is the 3 x 3 block of cells around cell p.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from cgshop2027_pyutils.grid import rasterize, rasterize_ring
from cgshop2027_pyutils.io import read_instance
from cgshop2027_pyutils.schemas import CGSHOP2027Instance, CGSHOP2027Solution
from cgshop2027_pyutils.verify import SolutionValidator

ROOT = Path(__file__).resolve().parents[2]
LAWNS = ROOT / "levels" / "lawn-mowing"
INSTANCES = LAWNS / "instances"
SOLUTIONS = LAWNS / "solutions"
# The example lawn of the game's explanation (not a booth lawn), with its own instances and solutions.
EXAMPLE = LAWNS / "example"


def folders(uid: str) -> tuple[Path, Path]:
    """The folders of an instance and its solution: the example lawn's (`example_<k>s3`) or the booth's."""
    if uid.startswith("example"):
        return EXAMPLE / "instances", EXAMPLE / "solutions"
    return INSTANCES, SOLUTIONS

Point = tuple[int, int]
Walk = list[Point]  # a closed walk: positions after every unit step, the return to walk[0] implicit

DIRECTIONS: tuple[Point, ...] = ((1, 0), (0, 1), (-1, 0), (0, -1))  # counter-clockwise from east


def add(p: Point, d: Point) -> Point:
    return (p[0] + d[0], p[1] + d[1])


def neighbours(p: Point) -> list[Point]:
    return [(p[0] + dx, p[1] + dy) for dx, dy in DIRECTIONS]


def edge(p: Point, q: Point) -> tuple[Point, Point]:
    """An undirected lattice edge as a sorted pair."""
    return (p, q) if p < q else (q, p)


class Lawn:
    """An instance with the cells to mow and the positions worth driving to."""

    def __init__(self, instance: CGSHOP2027Instance) -> None:
        self.instance = instance
        self.uid = instance.instance_uid
        self.k = instance.number_of_cutters
        self.cells: frozenset[Point] = frozenset(rasterize(instance.region_to_cover).cells())
        cx, cy = instance.cutter_center
        self.offsets: tuple[Point, ...] = tuple(
            (x - cx, y - cy) for x, y in rasterize_ring(instance.cutter).cells()
        )
        xs = [x for x, _ in self.cells]
        ys = [y for _, y in self.cells]
        ox = [x for x, _ in self.offsets]
        oy = [y for _, y in self.offsets]
        self.width = max(ox) - min(ox) + 1  # cutter width, 3 for the booth lawns
        # Positions from which the cutter touches the bounding box of the lawn. A tour clamped to this box
        # mows at least as much and is no longer, so no tour needs to leave it.
        self.box = (
            min(xs) - max(ox),
            min(ys) - max(oy),
            max(xs) - min(ox),
            max(ys) - min(oy),
        )
        x0, y0, x1, y1 = self.box
        self.positions: list[Point] = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
        self._footprint: dict[Point, tuple[Point, ...]] = {}
        # For every lawn cell, the positions whose footprint contains it.
        self.coverers: dict[Point, tuple[Point, ...]] = {
            c: tuple((c[0] - dx, c[1] - dy) for dx, dy in self.offsets) for c in self.cells
        }

    def inside(self, p: Point) -> bool:
        x0, y0, x1, y1 = self.box
        return x0 <= p[0] <= x1 and y0 <= p[1] <= y1

    def footprint(self, p: Point) -> tuple[Point, ...]:
        """The lawn cells the cutter covers at position p."""
        f = self._footprint.get(p)
        if f is None:
            f = tuple(c for dx, dy in self.offsets if (c := (p[0] + dx, p[1] + dy)) in self.cells)
            self._footprint[p] = f
        return f

    def steps_from(self, p: Point) -> list[Point]:
        return [q for q in neighbours(p) if self.inside(q)]

    def covered(self, walks: list[Walk]) -> set[Point]:
        out: set[Point] = set()
        for walk in walks:
            for p in walk:
                out.update(self.footprint(p))
        return out


def length(walk: Walk) -> int:
    """L1 length of a closed walk of unit steps (pyutils27 `CutterTour.length`)."""
    return len(walk) if len(walk) > 1 else 0


def check_walk(walk: Walk) -> None:
    for i, p in enumerate(walk):
        q = walk[(i + 1) % len(walk)]
        if len(walk) > 1 and abs(p[0] - q[0]) + abs(p[1] - q[1]) != 1:
            raise ValueError(f"not a unit step: {p} -> {q}")


def path(p: Point, q: Point, horizontal_first: bool = True) -> list[Point]:
    """A shortest L-shaped way from p to q: the positions after each step (q last, p not included)."""
    out = []
    x, y = p
    for axis in (0, 1) if horizontal_first else (1, 0):
        while (x, y)[axis] != q[axis]:
            if axis == 0:
                x += 1 if q[0] > x else -1
            else:
                y += 1 if q[1] > y else -1
            out.append((x, y))
    return out


def walk_through(corners: list[Point]) -> Walk:
    """The closed walk through axis-parallel corner points (pyutils27 tour), back to the first one."""
    if len(corners) == 1:
        return list(corners)
    walk = [corners[0]]
    for i, c in enumerate(corners):
        nxt = corners[(i + 1) % len(corners)]
        if c[0] != nxt[0] and c[1] != nxt[1]:
            raise ValueError(f"edge {c} -> {nxt} is not axis-parallel")
        walk += path(c, nxt)
    walk.pop()  # back at the start
    return walk


def corners_of(walk: Walk) -> list[Point]:
    """The corner points of a closed walk: its start and every point where the direction changes."""
    if len(walk) < 2:
        return list(walk[:1])
    n = len(walk)
    out = [walk[0]]
    for i in range(1, n):
        a, b, c = walk[i - 1], walk[i], walk[(i + 1) % n]
        if (b[0] - a[0], b[1] - a[1]) != (c[0] - b[0], c[1] - b[1]):
            out.append(b)
    return out


def bfs(lawn: Lawn, start: Point) -> dict[Point, Point | None]:
    """Predecessors on shortest ways from `start` inside the position box (all steps cost 1)."""
    prev: dict[Point, Point | None] = {start: None}
    queue = deque([start])
    while queue:
        p = queue.popleft()
        for q in lawn.steps_from(p):
            if q not in prev:
                prev[q] = p
                queue.append(q)
    return prev


def load(uid: str) -> Lawn:
    return Lawn(read_instance(folders(uid)[0] / f"{uid}.instance.json"))


def solution_of(lawn: Lawn, walks: list[Walk], meta: dict | None = None) -> CGSHOP2027Solution:
    tours = []
    for walk in walks:
        corners = corners_of(walk)
        tours.append({"x": [p[0] for p in corners], "y": [p[1] for p in corners]})
    return CGSHOP2027Solution(instance_uid=lawn.uid, tours=tours, meta=meta or {})


def verify(lawn: Lawn, walks: list[Walk]) -> list[str]:
    """Errors of the pyutils27 verifier for these walks (empty if the solution is feasible)."""
    return SolutionValidator(lawn.instance).check_for_errors(solution_of(lawn, walks))


def write_solution(lawn: Lawn, walks: list[Walk], meta: dict, folder: Path | None = None) -> Path:
    solution = solution_of(lawn, walks, meta)
    errors = SolutionValidator(lawn.instance).check_for_errors(solution)
    if errors:
        raise ValueError(f"{lawn.uid}: {errors}")
    data = {
        "content_type": "CGSHOP2027_Solution",
        "instance_uid": lawn.uid,
        "tours": [{"x": t.x, "y": t.y} for t in solution.tours],
        "meta": meta,
    }
    target = (folder or folders(lawn.uid)[1]) / f"{lawn.uid}.solution.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    return target
