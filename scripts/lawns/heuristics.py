"""
Simple strategies a visitor might follow in "Rasenmähen", as starting points for the solver and as the
yardstick for how interesting a lawn is:

- strips: back and forth in strips as high as the cutter (the game's strip strategy, `strips.ts`), for
  several cutters split into consecutive groups of strips;
- spiral: along the edge of the grass that is left, straight on as long as that mows something;
- nearest: always to the nearest uncut grass, the step that mows most first;
- for several cutters also: the lawn cut into two halves, each mowed alone with one of the above, and
  the cutters mowing at the same time, each taking turns with spiral or nearest.

Every strategy drives home on a shortest way when the lawn is mowed.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable

from lawn import Lawn, Point, Walk, add, bfs, length, path, walk_through

Result = tuple[str, list[Walk]]

# ---------------------------------------------------------------------------------------------------------
# Strips, as in src/core/games/lawn-mowing/strips.ts


def _strips(
    cells: list[Point], offsets: tuple[Point, ...], w: int, offset: int
) -> list[tuple[int, int, int]]:
    min_oy = min(y for _, y in offsets)
    min_ox = min(x for x, _ in offsets)
    max_ox = max(x for x, _ in offsets)
    ys = [y for _, y in cells]
    out = []
    for b in range(min(ys) - offset, max(ys) + 1, w):
        xs = [x for x, y in cells if b <= y < b + w]
        if not xs:
            continue
        start = min(xs) - min_ox
        out.append((b - min_oy, start, max(start, max(xs) - max_ox)))
    return out


def _snake(strips: list[tuple[int, int, int]]) -> list[Point]:
    best: list[Point] = []
    best_length = None
    for left_first in (True, False):
        points: list[Point] = []
        for i, (line, a, b) in enumerate(strips):
            if (i % 2 == 0) != left_first:
                a, b = b, a
            if points:
                points.append((a, points[-1][1]))
            points += [(a, line), (b, line)]
        first, last = points[0], points[-1]
        if first[0] != last[0] and first[1] != last[1]:
            points.append((first[0], last[1]))
        walk = walk_through(_dedupe(points))
        if best_length is None or length(walk) < best_length:
            best, best_length = walk, length(walk)
    return best


def _dedupe(points: list[Point]) -> list[Point]:
    out: list[Point] = []
    for p in points:
        if not out or out[-1] != p:
            out.append(p)
    while len(out) > 1 and out[-1] == out[0]:
        out.pop()
    return out


def _splits(n: int, k: int) -> Iterable[list[tuple[int, int]]]:
    if k <= 1 or n < k:
        yield [(0, n)]
    elif k == 2:
        for a in range(1, n):
            yield [(0, a), (a, n)]
    else:
        for a in range(1, n - 1):
            for b in range(a + 1, n):
                yield [(0, a), (a, b), (b, n)]


def strips(lawn: Lawn, k: int, cells: Iterable[Point] | None = None) -> list[Walk]:
    """The game's strip strategy (the same tours as `stripTours` in strips.ts)."""
    cells = sorted(cells if cells is not None else lawn.cells)
    best: list[Walk] = []
    best_length = None
    for transposed in (False, True):
        swap = (lambda p: (p[1], p[0])) if transposed else (lambda p: p)
        c = [swap(p) for p in cells]
        o = tuple(swap(p) for p in lawn.offsets)
        w = max(y for _, y in o) - min(y for _, y in o) + 1
        for offset in range(w):
            s = _strips(c, o, w, offset)
            for groups in _splits(len(s), k):
                walks = [_snake(s[a:b]) for a, b in groups]
                value = max(length(t) for t in walks)
                if best_length is None or value < best_length:
                    best_length = value
                    best = [[swap(p) for p in t] for t in walks]
    return best


# ---------------------------------------------------------------------------------------------------------
# Driving by a rule: spiral and nearest


def _turn(d: Point, left: bool) -> Point:
    return (-d[1], d[0]) if left else (d[1], -d[0])


Rule = Callable[[Point, Point, Callable[[Point], int]], Point | None]


def spiral_rule(left_first: bool) -> Rule:
    """Straight on while that mows something, else turn (towards the inside first), else back."""

    def rule(p: Point, heading: Point, fresh: Callable[[Point], int]) -> Point | None:
        for d in (
            heading,
            _turn(heading, left_first),
            _turn(heading, not left_first),
            (-heading[0], -heading[1]),
        ):
            if fresh(add(p, d)) > 0:
                return d
        return None

    return rule


def nearest_rule(left_first: bool) -> Rule:
    """The step that mows most; on a tie straight on, then a turn."""

    def rule(p: Point, heading: Point, fresh: Callable[[Point], int]) -> Point | None:
        order = (
            heading,
            _turn(heading, left_first),
            _turn(heading, not left_first),
            (-heading[0], -heading[1]),
        )
        best = max(order, key=lambda d: fresh(add(p, d)))
        return best if fresh(add(p, best)) > 0 else None

    return rule


def drive(lawn: Lawn, todo: set[Point], starts: list[tuple[Point, Point]], rule: Rule) -> list[Walk]:
    """
    Cutters starting at the given (position, heading) mow the cells `todo` together, taking turns (the one
    with the shortest walk so far moves). A cutter whose rule finds no step that mows something drives to
    the nearest position that does. When everything is mowed, every cutter drives home.
    """
    left = set(todo)
    walks: list[Walk] = []
    headings: list[Point] = []
    plans: list[list[Point]] = []

    def fresh(q: Point) -> int:
        if not lawn.inside(q):
            return -1
        return sum(1 for c in lawn.footprint(q) if c in left)

    for p, heading in starts:
        walks.append([p])
        headings.append(heading)
        plans.append([])
        left.difference_update(lawn.footprint(p))
    while left:
        i = min(range(len(walks)), key=lambda j: len(walks[j]))
        p = walks[i][-1]
        if plans[i]:
            q = plans[i].pop(0)
        else:
            d = rule(p, headings[i], fresh)
            if d is not None:
                q = add(p, d)
            else:
                prev = bfs(lawn, p)
                best = None
                best_key = None
                for r in prev:
                    f = fresh(r)
                    if f > 0:
                        dist = abs(r[0] - p[0]) + abs(r[1] - p[1])
                        key = (dist, -f)
                        if best_key is None or key < best_key:
                            best, best_key = r, key
                assert best is not None, "a cell no position covers"
                way = []
                r = best
                while r != p:
                    way.append(r)
                    r = prev[r]
                plans[i] = way[::-1]
                q = plans[i].pop(0)
        headings[i] = (q[0] - p[0], q[1] - p[1])
        walks[i].append(q)
        left.difference_update(lawn.footprint(q))
    for walk in walks:
        if walk[-1] == walk[0] and len(walk) > 1:
            walk.pop()  # already home
        else:
            walk += path(walk[-1], walk[0])[:-1]
    return walks


def corner_starts(lawn: Lawn, cells: set[Point]) -> list[tuple[Point, Point]]:
    """Start positions near the corners of the cells' bounding box, with both headings along the edges."""
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    useful = [p for p in lawn.positions if any(c in cells for c in lawn.footprint(p))]
    out = []
    for cx, cy, hx, hy in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x1, y1, -1, -1), (x0, y1, 1, -1)):
        start = min(useful, key=lambda p: (abs(p[0] - cx - hx) + abs(p[1] - cy - hy), p))
        out += [(start, (hx, 0)), (start, (0, hy))]
    return out


def ruled(lawn: Lawn, cells: set[Point], name: str, make: Callable[[bool], Rule]) -> Result:
    """The best single-cutter run of a rule over all corner starts, headings and turning preferences."""
    best: list[Walk] | None = None
    for start in corner_starts(lawn, cells):
        for left_first in (True, False):
            walks = drive(lawn, cells, [start], make(left_first))
            if best is None or length(walks[0]) < length(best[0]):
                best = walks
    assert best is not None
    return name, best


def together(lawn: Lawn, k: int, name: str, make: Callable[[bool], Rule]) -> Result:
    """k = 2 cutters mowing at the same time from two opposite corners."""
    starts = corner_starts(lawn, set(lawn.cells))
    best: list[Walk] | None = None
    for a in range(len(starts)):
        for b in range(len(starts)):
            if starts[a][0] == starts[b][0]:
                continue
            for left_first in (True, False):
                walks = drive(lawn, set(lawn.cells), [starts[a], starts[b]][:k], make(left_first))
                if best is None or max(map(length, walks)) < max(map(length, best)):
                    best = walks
    assert best is not None
    return name, best


def halves(lawn: Lawn, solo: Callable[[set[Point]], list[Walk]], name: str) -> Result:
    """Two cutters: the lawn cut by a horizontal or vertical line, each half mowed alone by `solo`."""
    best: list[Walk] | None = None
    n = len(lawn.cells)
    for axis in (0, 1):
        values = sorted({c[axis] for c in lawn.cells})
        for s in values[1:]:
            a = {c for c in lawn.cells if c[axis] < s}
            if not 0.3 * n <= len(a) <= 0.7 * n:
                continue
            walks = solo(a) + solo(set(lawn.cells) - a)
            if best is None or max(map(length, walks)) < max(map(length, best)):
                best = walks
    assert best is not None
    return name, best


def all_heuristics(lawn: Lawn) -> list[Result]:
    """Every simple strategy for the lawn's number of cutters (1 or 2), each with its best tours."""
    cells = set(lawn.cells)
    if lawn.k == 1:
        return [
            ("strips", strips(lawn, 1)),
            ruled(lawn, cells, "spiral", spiral_rule),
            ruled(lawn, cells, "nearest", nearest_rule),
        ]
    if lawn.k != 2:
        raise ValueError("the heuristics handle one or two cutters")
    return [
        ("strips", strips(lawn, 2)),
        halves(lawn, lambda part: strips(lawn, 1, part), "halves with strips"),
        halves(lawn, lambda part: ruled(lawn, part, "", spiral_rule)[1], "halves with spiral"),
        halves(lawn, lambda part: ruled(lawn, part, "", nearest_rule)[1], "halves with nearest"),
        together(lawn, 2, "spiral together", spiral_rule),
        together(lawn, 2, "nearest together", nearest_rule),
    ]
