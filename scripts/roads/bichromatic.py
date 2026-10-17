"""Maps of "Zwei Sorten" (Straßenbau): minimum plane bichromatic spanning trees, computed offline.

Every road joins a castle and a village, and roads must not cross. Without the crossing rule the shortest
such network is a minimum spanning tree of the castle-village roads (Kruskal); with it the problem is
NP-hard (Borgelt et al. 2009). This script draws seeded random maps, keeps those where the crossing rule
matters (the tree without it has crossings), where the greedy strategy (always the shortest allowed road
that crosses no chosen road) ends longer than the optimum or gets stuck, and where no road of the networks
the game draws passes close to another place. It computes the optimum exactly with CP-SAT (OR-Tools): a
spanning tree on the castle-village roads by a single-commodity flow, and no two crossing roads. Maps with
at most 8 places are checked against brute force.

    pip install ortools
    python3 scripts/roads/bichromatic.py [map numbers]

writes levels/roads/bichromatic/<n>-<name>.json (all maps, or the numbered ones); `npm run levels`
imports them. The larger maps take a while: the 10-place map took 2.4 million seeds (an hour).
"""

from __future__ import annotations

import itertools
import json
import math
import random
import re
import sys
from pathlib import Path

from ortools.sat.python import cp_model

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "levels" / "roads" / "bichromatic"

# The maps: name, castles, villages, clearance (see below). Level units as the other maps (about 6 x 4).
SPECS = [
    ("burgen", 2, 4, 0.4),
    ("weiler", 3, 4, 0.4),
    ("mark", 3, 5, 0.4),
    ("grafschaft", 4, 5, 0.4),
    ("herzogtum", 4, 6, 0.4),
    # With 12 places hardly a map keeps 0.4 (none in an hour of search); 0.3 is still outside the icons.
    ("koenigreich", 5, 7, 0.3),
]
# The crossing rule must matter: the tree without it has at least this many crossings, and the optimum is
# at least this much longer than it. The greedy strategy must get stuck or end at least this much longer
# than the optimum. (On random maps of these sizes it never got stuck in 14,000 tries: a crossing-free
# forest rarely blocks every castle-village road between two of its groups.)
MIN_CROSSINGS = 2
MIN_COST_OF_RULE = 0.02
MIN_GREEDY_EXCESS = 0.03
BOUNDS = (-2.8, -1.8, 2.8, 1.8)
MIN_SPACING = 0.95
# Roads of the networks the game draws (the optimum, the tree without the rule) keep the clearance given per
# map from every other place, so no road seems to run through a place.
SCALE = 10**6


def orient(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def cross(p, q, r, s) -> bool:
    """Whether segments pq and rs cross (they share no endpoint here, and no three places are collinear)."""
    return (orient(p, q, r) > 0) != (orient(p, q, s) > 0) and (orient(r, s, p) > 0) != (orient(r, s, q) > 0)


def length(points, e):
    (a, b) = e
    return math.dist(points[a], points[b])


class Sets:
    def __init__(self, n):
        self.parent = list(range(n))
        self.count = n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        self.parent[rb] = ra
        self.count -= 1
        return True


def roads(villages, castles):
    """All castle-village roads, shortest first (ties by index): (village index, castle index) pairs."""
    n = len(villages)
    points = villages + castles
    es = [(v, n + c) for v in range(n) for c in range(len(castles))]
    return points, sorted(es, key=lambda e: (length(points, e), e))


def free_tree(points, es):
    """The shortest castle-village tree without the crossing rule (Kruskal)."""
    sets = Sets(len(points))
    tree = [e for e in es if sets.union(*e)]
    return tree


def crossings(points, tree):
    return [
        (e, f)
        for e, f in itertools.combinations(tree, 2)
        if len({*e, *f}) == 4 and cross(points[e[0]], points[e[1]], points[f[0]], points[f[1]])
    ]


def greedy(points, es):
    """The shortest allowed road that crosses no chosen road, again and again; stuck if none is left."""
    sets = Sets(len(points))
    chosen = []
    for e in es:
        if sets.find(e[0]) == sets.find(e[1]):
            continue
        if any(len({*e, *f}) == 4 and cross(points[e[0]], points[e[1]], points[f[0]], points[f[1]]) for f in chosen):
            continue
        sets.union(*e)
        chosen.append(e)
    return chosen, sets.count == 1


def optimum(points, es):
    """The minimum plane bichromatic spanning tree by CP-SAT; None if there is none."""
    n = len(points)
    model = cp_model.CpModel()
    x = {e: model.new_bool_var(f"x{e}") for e in es}
    model.add(sum(x.values()) == n - 1)
    # Single-commodity flow from node 0: every other node consumes one unit, flow only on chosen roads.
    flow = {}
    for (a, b) in es:
        for (u, v) in ((a, b), (b, a)):
            flow[u, v] = model.new_int_var(0, n - 1, f"f{u}_{v}")
            model.add(flow[u, v] <= (n - 1) * x[a, b])
    for v in range(n):
        out = sum(f for (p, q), f in flow.items() if p == v)
        inn = sum(f for (p, q), f in flow.items() if q == v)
        model.add(out - inn == (n - 1 if v == 0 else -1))
    for e, f in itertools.combinations(es, 2):
        if len({*e, *f}) == 4 and cross(points[e[0]], points[e[1]], points[f[0]], points[f[1]]):
            model.add_bool_or([x[e].Not(), x[f].Not()])
    model.minimize(sum(round(length(points, e) * SCALE) * x[e] for e in es))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 120
    solver.parameters.num_workers = 8
    status = solver.solve(model)
    if status == cp_model.INFEASIBLE:
        return None
    if status != cp_model.OPTIMAL:
        raise RuntimeError("CP-SAT did not prove optimality")
    return sorted(e for e in es if solver.value(x[e]))


def brute_force(points, es):
    """The same optimum by trying every set of n - 1 roads (small maps only)."""
    n = len(points)
    best = None
    for subset in itertools.combinations(es, n - 1):
        sets = Sets(n)
        if not all(sets.union(*e) for e in subset):
            continue
        if crossings(points, subset):
            continue
        total = sum(length(points, e) for e in subset)
        if best is None or total < best[0] - 1e-12:
            best = (total, sorted(subset))
    return best


def place(rng, castles, villages):
    x0, y0, x1, y1 = BOUNDS
    pts = []
    while len(pts) < castles + villages:
        p = (round(rng.uniform(x0, x1), 3), round(rng.uniform(y0, y1), 3))
        if all(math.dist(p, q) >= MIN_SPACING for q in pts):
            pts.append(p)
    # No three places on a line (crossings stay well defined).
    for a, b, c in itertools.combinations(pts, 3):
        if abs(orient(a, b, c)) < 1e-3:
            return None
    return pts[castles:], pts[:castles]


def clearance(points, roads):
    """The least distance between a road and a place it does not join."""
    best = math.inf
    for a, b in roads:
        (px, py), (qx, qy) = points[a], points[b]
        dx, dy = qx - px, qy - py
        for i, (x, y) in enumerate(points):
            if i in (a, b):
                continue
            t = max(0.0, min(1.0, ((x - px) * dx + (y - py) * dy) / (dx * dx + dy * dy)))
            best = min(best, math.hypot(px + t * dx - x, py + t * dy - y))
    return best


def total(points, tree):
    return sum(length(points, e) for e in tree)


def main(numbers):
    OUT.mkdir(parents=True, exist_ok=True)
    for number, (name, castles, villages, min_clearance) in enumerate(SPECS, start=1):
        if numbers and number not in numbers:
            continue
        # Separate seed ranges, so no two maps share their first places.
        for seed in itertools.count(10**7 * number):
            placed = place(random.Random(seed), castles, villages)
            if not placed:
                continue
            vs, cs = placed
            points, es = roads(vs, cs)
            free = free_tree(points, es)
            if len(crossings(points, free)) < MIN_CROSSINGS:
                continue
            chosen, connected = greedy(points, es)
            if clearance(points, free) < min_clearance:
                continue
            best = optimum(points, es)
            if best is None:
                continue
            opt = total(points, best)
            if opt < total(points, free) * (1 + MIN_COST_OF_RULE):
                continue
            if connected and total(points, chosen) < opt * (1 + MIN_GREEDY_EXCESS):
                continue
            if clearance(points, best) < min_clearance:
                continue
            if len(points) <= 8:
                check = brute_force(points, es)
                assert check is not None and abs(check[0] - opt) < 1e-6, (name, seed)
            break
        data = {
            "name": name,
            "villages": [list(p) for p in vs],
            "castles": [list(p) for p in cs],
            "optimum": {"roads": [list(e) for e in best], "length": round(opt, 6)},
            "free": {
                "roads": [list(e) for e in sorted(free)],
                "length": round(total(points, free), 6),
                "crossings": len(crossings(points, free)),
            },
            "greedy": {
                "roads": [list(e) for e in sorted(chosen)],
                "length": round(total(points, chosen), 6),
                "stuck": not connected,
            },
            "seed": seed,
            "method": "exact: CP-SAT (OR-Tools), flow model with pairwise crossing constraints (scripts/roads/bichromatic.py)",
        }
        text = json.dumps(data, indent=2, ensure_ascii=False)
        # Points and roads on one line each, as the other level files.
        text = re.sub(r"\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]", r"[\1, \2]", text)
        (OUT / f"{number}-{name}.json").write_text(text + "\n")
        g = "stuck" if not connected else f"{total(points, chosen):.3f}"
        print(
            f"{number}-{name}: {len(cs)} castles, {len(vs)} villages, seed {seed}: optimum {opt:.3f}, "
            f"without the rule {total(points, free):.3f} ({len(crossings(points, free))} crossings), greedy {g}"
        )


if __name__ == "__main__":
    main({int(a) for a in sys.argv[1:]})
