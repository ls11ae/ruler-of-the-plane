"""
Large neighbourhood search for the booth lawns: free a window of the tours and re-optimise it with CP-SAT.
Three kinds of windows ("moves"):

- segment: a stretch of 10-60 steps of one tour. CP-SAT re-routes it between its two ends inside the
  stretch's bounding box (widened by one or two points), as a path through each point at most once
  (sometimes twice), so that the grass the rest of the tours no longer mows gets mowed. The path is a
  circuit constraint (closed by a fixed arc from its end back to its start), which CP-SAT propagates well.
- pair: two shorter stretches close to each other, of the same tour or of two tours, re-routed together,
  so that grass can change hands between them.
- rectangle: every edge of the tours inside a small rectangle. A tour is then seen as a multiset of
  lattice edges, each used once or twice: a closed walk through such a multiset exists exactly when it is
  connected and every degree is even (Euler), and an optimal tour never uses an edge more than twice. The
  rest of each tour falls apart into fixed pieces; CP-SAT chooses new edges so that every degree is even
  and a flow from one piece reaches every other piece and every visited point. This move can reconnect
  the passes through the rectangle in a new order; the walk is read off with Hierholzer's algorithm.

The objective is the longest tour, then the total length; a move is kept if it is not worse. The search
starts from several simple strategies, continues from the best result, and kicks the solution (re-routes
a few stretches to keep at most half of their steps, a little longer if need be) whenever it stalls.
"""

from __future__ import annotations

import random
import time
from collections import Counter, defaultdict

from ortools.sat.python import cp_model

from lawn import Lawn, Point, Walk, check_walk, edge, length, neighbours

Edge = tuple[Point, Point]
Tour = Counter  # Counter[Edge] with multiplicities 1 or 2


def edges_of(walk: Walk) -> Tour:
    """The edge multiset of a closed walk, with every multiplicity reduced to 1 or 2."""
    count: Counter = Counter()
    if len(walk) > 1:
        for i, p in enumerate(walk):
            count[edge(p, walk[(i + 1) % len(walk)])] += 1
    return Counter({e: 2 - m % 2 for e, m in count.items()})


def vertices(tour: Tour) -> set[Point]:
    return {p for e in tour for p in e}


def cost(tours: list[Tour]) -> tuple[int, int]:
    lengths = [sum(t.values()) for t in tours]
    return max(lengths), sum(lengths)


def _components(tour: Tour) -> list[set[Point]]:
    parent: dict[Point, Point] = {}

    def find(p: Point) -> Point:
        while parent.setdefault(p, p) != p:
            parent[p] = parent[parent[p]]
            p = parent[p]
        return p

    for a, b in tour:
        parent[find(a)] = find(b)
    groups: dict[Point, set[Point]] = defaultdict(set)
    for p in list(parent):
        groups[find(p)].add(p)
    return list(groups.values())


def is_tour(tour: Tour) -> bool:
    degree: Counter = Counter()
    for (a, b), m in tour.items():
        degree[a] += m
        degree[b] += m
    return all(d % 2 == 0 for d in degree.values()) and len(_components(tour)) <= 1


def euler(tour: Tour, start: Point) -> Walk:
    """A closed walk through every edge of the tour from `start`, going straight on where it can."""
    if not tour:
        return [start]
    adjacency: dict[Point, list[tuple[Point, int]]] = defaultdict(list)
    for index, ((a, b), m) in enumerate(tour.items()):
        for copy in range(m):
            adjacency[a].append((b, 2 * index + copy))
            adjacency[b].append((a, 2 * index + copy))
    used: set[int] = set()
    stack = [start]
    circuit: list[Point] = []
    while stack:
        v = stack[-1]
        options = [(w, i) for w, i in adjacency[v] if i not in used]
        if not options:
            circuit.append(stack.pop())
            continue
        if len(stack) > 1:
            u = stack[-2]
            d = (v[0] - u[0], v[1] - u[1])
            # Straight on first, then left, then right, then back.
            rank = {d: 0, (-d[1], d[0]): 1, (d[1], -d[0]): 2, (-d[0], -d[1]): 3}
            options.sort(key=lambda o: rank[(o[0][0] - v[0], o[0][1] - v[1])])
        w, i = options[0]
        used.add(i)
        stack.append(w)
    circuit.reverse()
    circuit.pop()  # back at the start
    return circuit


def covered(lawn: Lawn, tours: list[Tour]) -> set[Point]:
    out: set[Point] = set()
    for t in tours:
        for p in vertices(t):
            out.update(lawn.footprint(p))
    return out


class Window:
    """One CP-SAT re-optimisation of the tours inside a rectangle of lattice points."""

    def __init__(self, lawn: Lawn, tours: list[Tour], box: tuple[int, int, int, int]) -> None:
        self.lawn = lawn
        self.tours = tours
        x0, y0, x1, y1 = box
        self.points = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if lawn.inside((x, y))]
        self.inside = set(self.points)
        self.edges = [edge(p, q) for p in self.points for q in neighbours(p) if p < q and q in self.inside]
        self.at: dict[Point, list[Edge]] = defaultdict(list)
        for e in self.edges:
            self.at[e[0]].append(e)
            self.at[e[1]].append(e)

    def solve(self, time_limit: float, seed: int, workers: int) -> tuple[list[Tour], bool] | None:
        """Better or equally good tours (and whether CP-SAT proved them optimal for the window), or None."""
        lawn, inside = self.lawn, self.inside
        model = cp_model.CpModel()
        fixed_cover: set[Point] = set()
        lengths: list = []
        parts = []
        for tour in self.tours:
            fixed = Counter({e: m for e, m in tour.items() if not (e[0] in inside and e[1] in inside)})
            old = {e: m for e, m in tour.items() if e[0] in inside and e[1] in inside}
            fixed_points = vertices(fixed)
            for p in fixed_points:
                fixed_cover.update(lawn.footprint(p))
            involved = bool(old) or bool(fixed_points & inside)
            if involved and not fixed:
                return None  # the whole tour lies in the window; such windows are not used
            parts.append((fixed, old, fixed_points, involved))
        need = [c for c in lawn.cells if c not in fixed_cover]
        visit_vars: dict[Point, list] = defaultdict(list)
        cutters = []  # per involved tour: (index, edge uses)
        hints = []
        for t, (fixed, old, fixed_points, involved) in enumerate(parts):
            fixed_length = sum(fixed.values())
            if not involved:
                lengths.append(fixed_length)
                continue
            use = {e: model.new_int_var(0, 2, "") for e in self.edges}
            on = {e: model.new_bool_var("") for e in self.edges}
            for e in self.edges:
                model.add(use[e] >= on[e])
                model.add(use[e] <= 2 * on[e])
                hints += [(use[e], old.get(e, 0)), (on[e], 1 if e in old else 0)]
            fixed_degree: Counter = Counter()
            for (a, b), m in fixed.items():
                fixed_degree[a] += m
                fixed_degree[b] += m
            terminals = fixed_points & inside
            old_points = vertices(Counter(old)) | terminals
            visit: dict[Point, object] = {}
            for p in self.points:
                if p in terminals:
                    visit[p] = 1
                else:
                    v = model.new_bool_var("")
                    hints.append((v, 1 if p in old_points else 0))
                    model.add(sum(on[e] for e in self.at[p]) >= v)
                    model.add(sum(use[e] for e in self.at[p]) >= 2 * v)  # even and not zero
                    for e in self.at[p]:
                        model.add(on[e] <= v)
                    visit[p] = v
                    visit_vars[p].append(v)
                half = model.new_int_var(0, 4 + fixed_degree[p], "")
                model.add(sum(use[e] for e in self.at[p]) + fixed_degree[p] == 2 * half)
            pieces = [c & inside for c in _components(fixed)]
            self._flow(model, on, visit, terminals, pieces)
            lengths.append(fixed_length + sum(use.values()))
            cutters.append((t, use))
        for c in need:
            options = [v for p in lawn.coverers[c] if p in inside for v in visit_vars[p]]
            if not options:
                return None  # cannot happen for a window cut from a feasible solution
            model.add_bool_or(options)
        old_max, old_sum = cost(self.tours)
        if len(self.tours) == 1:
            objective = lengths[0]
            model.add(objective <= old_max)
        else:
            longest = model.new_int_var(0, old_max, "")
            for value in lengths:
                model.add(longest >= value)
            weight = old_sum + 1
            objective = longest * weight + sum(lengths)
            model.add(objective <= old_max * weight + old_sum)
        model.minimize(objective)
        for var, value in hints:
            model.add_hint(var, value)
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit
        solver.parameters.num_workers = workers
        solver.parameters.random_seed = seed
        status = solver.solve(model)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return None
        result = []
        for t, (fixed, old, _, involved) in enumerate(parts):
            result.append(self.tours[t] if not involved else None)
        for t, use in cutters:
            new = Counter(parts[t][0])
            for e, var in use.items():
                m = solver.value(var)
                if m:
                    new[e] = m
            if not is_tour(new):
                raise AssertionError("window produced a broken tour")
            result[t] = new
        if not covered(lawn, result) >= lawn.cells:
            raise AssertionError("window left grass")
        return result, status == cp_model.OPTIMAL

    def _flow(self, model, on, visit, terminals, pieces) -> None:
        """A flow from the first fixed piece reaches every other piece and every visited point; a piece is
        one node, joined to its terminals at no cost."""
        nodes = len(self.points) - len(terminals) + len(pieces)  # at most this much flow on any arc
        inflow: dict[object, list] = defaultdict(list)
        outflow: dict[object, list] = defaultdict(list)
        for a, b in self.edges:
            for s, d in ((a, b), (b, a)):
                f = model.new_int_var(0, nodes, "")
                model.add(f <= nodes * on[(a, b)])
                outflow[s].append(f)
                inflow[d].append(f)
        for j, piece in enumerate(pieces):
            for p in piece:
                for s, d in ((("piece", j), p), (p, ("piece", j))):
                    f = model.new_int_var(0, nodes, "")
                    outflow[s].append(f)
                    inflow[d].append(f)
        for j in range(1, len(pieces)):
            node = ("piece", j)
            model.add(sum(inflow[node]) - sum(outflow[node]) == 1)
        for p in self.points:
            demand = 0 if p in terminals else visit[p]
            model.add(sum(inflow[p]) - sum(outflow[p]) == demand)


Segment = tuple[int, int, int]  # (tour, index of the first position, number of steps)


def reroute(
    lawn: Lawn,
    walks: list[Walk],
    segments: list[Segment],
    margin: int,
    time_limit: float,
    seed: int,
    workers: int,
    copies: int = 2,
    slack: int = 0,
    differ: float = 1.0,
) -> tuple[list[Walk], bool] | None:
    """
    Frees the given segments of the walks (disjoint stretches of the tours) and lets CP-SAT
    re-route each between its two ends, inside the bounding box of the old segment widened by `margin`,
    so that all grass that the rest of the tours no longer mows gets mowed. Each segment becomes a path
    (a circuit closed by a fixed arc from its end back to its start), passing every point at most twice.
    Returns better or equally good walks (and whether CP-SAT proved them optimal), or None. For a kick,
    `slack` allows the longest tour to grow by that much and `differ` < 1 keeps at most that share of the
    old segments' steps.
    """
    lengths = [length(w) for w in walks]
    freed: dict[int, set[int]] = defaultdict(set)
    spans: dict[int, set[int]] = defaultdict(set)
    for t, i, steps in segments:
        if steps >= lengths[t] or steps < 1:
            return None
        inner = {(i + j) % lengths[t] for j in range(1, steps)}
        span = inner | {i, (i + steps) % lengths[t]}
        # Segments of one tour may share an end, nothing else.
        if inner & spans[t] or span & freed[t]:
            return None
        freed[t] |= inner
        spans[t] |= span
    fixed_cover: set[Point] = set()
    for t, walk in enumerate(walks):
        for index, p in enumerate(walk):
            if index not in freed[t]:
                fixed_cover.update(lawn.footprint(p))
    need = [c for c in lawn.cells if c not in fixed_cover]
    model = cp_model.CpModel()
    visits: dict[Point, list] = defaultdict(list)
    circuits = []
    new_lengths: list = list(lengths)
    for t, i, steps in segments:
        walk = walks[t]
        old = [walk[(i + j) % lengths[t]] for j in range(steps + 1)]
        s, e = old[0], old[-1]
        xs = [p[0] for p in old]
        ys = [p[1] for p in old]
        points = [
            (x, y)
            for x in range(min(xs) - margin, max(xs) + margin + 1)
            for y in range(min(ys) - margin, max(ys) + margin + 1)
            if lawn.inside((x, y))
        ]
        index = {p: n for n, p in enumerate(points)}

        width = max(copies, 2) if s == e else copies

        def node(p: Point, copy: int) -> int:
            return width * index[p] + copy

        end = node(e, 1) if s == e else node(e, 0)  # a closed segment ends at the second copy of its start
        if s == e and copies == 1:
            return None
        arcs = []
        arc_of: dict[tuple[int, int], object] = {}
        for p in points:
            for q in neighbours(p):
                if q not in index:
                    continue
                for a in range(copies):
                    for b in range(copies):
                        lit = model.new_bool_var("")
                        arcs.append((node(p, a), node(q, b), lit))
                        arc_of[(node(p, a), node(q, b))] = lit
        skip = {}
        for p in points:
            for a in range(copies):
                n = node(p, a)
                if n in (node(s, 0), end):
                    continue
                skip[n] = model.new_bool_var("")
                arcs.append((n, n, skip[n]))
            if copies > 1 and node(p, 1) in skip and node(p, 0) in skip:
                model.add_implication(skip[node(p, 0)], skip[node(p, 1)])
        closing = model.new_bool_var("")
        model.add(closing == 1)
        arcs.append((end, node(s, 0), closing))
        model.add_circuit(arcs)
        for p in points:
            n = node(p, 0)
            if n in skip:
                visits[p].append(~skip[n])
        steps_var = sum(lit for (a, b), lit in arc_of.items())
        new_lengths[t] = new_lengths[t] - steps + steps_var
        # Hint: the old segment, if it passes no point more than twice.
        taken = {node(s, 0), end}
        nodes = [node(s, 0)]
        for p in old[1:-1]:
            free = [n for n in (node(p, a) for a in range(copies)) if n not in taken]
            if not free:
                break
            nodes.append(free[0])
            taken.add(free[0])
        nodes.append(end)
        if len(nodes) == len(old):
            used_arcs = set(zip(nodes, nodes[1:]))
            if differ < 1.0:
                model.add(sum(arc_of[key] for key in used_arcs) <= int(differ * len(used_arcs)))
            else:
                for key, lit in arc_of.items():
                    model.add_hint(lit, key in used_arcs)
                for n, lit in skip.items():
                    model.add_hint(lit, n not in nodes)
        elif differ < 1.0:
            return None
        circuits.append((t, i, steps, arc_of, node(s, 0), end, points, width))
    for c in need:
        options = [v for p in lawn.coverers[c] for v in visits.get(p, [])]
        if not options:
            return None
        model.add_bool_or(options)
    old_max, old_sum = max(lengths), sum(lengths)
    if len(walks) == 1:
        objective = new_lengths[0]
        model.add(objective <= old_max + slack)
    else:
        longest = model.new_int_var(0, old_max + slack, "")
        for value in new_lengths:
            model.add(longest >= value)
        weight = old_sum + len(walks) * slack + 1
        objective = longest * weight + sum(new_lengths)
        model.add(objective <= (old_max + slack) * weight + old_sum + len(walks) * slack)
    model.minimize(objective)
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit
    solver.parameters.num_workers = workers
    solver.parameters.random_seed = seed
    status = solver.solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None
    replaced: dict[int, dict[int, tuple[int, list[Point]]]] = defaultdict(dict)
    for t, i, steps, arc_of, start, end, points, width in circuits:
        succ = {a: b for (a, b), lit in arc_of.items() if solver.value(lit)}
        route = []
        n = succ[start]
        while n != end:
            route.append(points[n // width])
            n = succ[n]
        replaced[t][i] = (steps, route)
    result = []
    for t, walk in enumerate(walks):
        if t not in replaced:
            result.append(walk)
            continue
        n = len(walk)
        # Start at a fixed position: the end of one of the segments.
        first = next(iter(replaced[t]))
        r = (first + replaced[t][first][0]) % n
        out: list[Point] = []
        j = 0
        while j < n:
            index = (r + j) % n
            out.append(walk[index])
            if index in replaced[t]:
                steps, route = replaced[t][index]
                out += route
                j += steps
            else:
                j += 1
        check_walk(out)
        result.append(out)
    if not lawn.covered(result) >= lawn.cells:
        raise AssertionError("re-routing left grass")
    return result, status == cp_model.OPTIMAL


def _cost(walks: list[Walk]) -> tuple[int, int]:
    lengths = [length(w) for w in walks]
    return max(lengths), sum(lengths)


class Search:
    """The state of the search and its three kinds of moves, with window sizes adapted as it goes."""

    def __init__(self, lawn: Lawn, walks: list[Walk], rng: random.Random, workers: int, limit: float) -> None:
        self.lawn = lawn
        self.walks = walks
        self.rng = rng
        self.workers = workers
        self.limit = limit
        self.steps = 20  # segment length
        self.size = 7  # side of a rectangle window
        self.easy = Counter()

    def _tour(self) -> int:
        lengths = [length(w) for w in self.walks]
        if len(lengths) > 1 and self.rng.random() < 0.7:
            return max(range(len(lengths)), key=lambda i: (lengths[i], self.rng.random()))
        return self.rng.randrange(len(lengths))

    def _adapt(self, kind: str, optimal: bool, took: float) -> None:
        if optimal and took < 0.5 * self.limit:
            self.easy[kind] += 1
            if self.easy[kind] >= 8:
                self.easy[kind] = 0
                if kind == "rectangle":
                    self.size = min(14, self.size + 1)
                else:
                    self.steps = min(60, self.steps + 2)
        elif not optimal:
            self.easy[kind] = 0
            if kind == "rectangle":
                self.size = max(5, self.size - 1)
            else:
                self.steps = max(10, self.steps - 2)

    def segment(self, pair: bool) -> tuple[list[Walk], bool] | None:
        rng, walks = self.rng, self.walks
        t = self._tour()
        n = length(walks[t])
        steps = min(n - 1, max(4, self.steps + rng.randint(-4, 4)))
        i = rng.randrange(n)
        segments = [(t, i, steps)]
        if pair:
            steps = max(4, steps // 2)
            segments = [(t, i, steps)]
            mine = [walks[t][(i + j) % n] for j in range(steps + 1)]
            x0, x1 = min(p[0] for p in mine) - 3, max(p[0] for p in mine) + 3
            y0, y1 = min(p[1] for p in mine) - 3, max(p[1] for p in mine) + 3
            span = {(i + j) % n for j in range(-steps, steps + 1)}
            options = [
                (u, j)
                for u, walk in enumerate(walks)
                for j, p in enumerate(walk)
                if x0 <= p[0] <= x1 and y0 <= p[1] <= y1 and not (u == t and j in span)
            ]
            if not options:
                return None
            u, j = rng.choice(options)
            other = min(steps, length(walks[u]) - 1)
            segments.append((u, (j - rng.randint(0, other)) % length(walks[u]), other))
        copies = 2 if rng.random() < 0.2 else 1
        margin = 2 if rng.random() < 0.25 else 1
        return reroute(
            self.lawn, walks, segments, margin, self.limit, rng.randrange(1 << 30), self.workers, copies
        )

    def rectangle(self) -> tuple[list[Walk], bool] | None:
        rng, walks = self.rng, self.walks
        tours = [edges_of(w) for w in walks]
        t = self._tour()
        points = sorted(vertices(tours[t]))
        if len(tours) > 1 and rng.random() < 0.5:
            # Near another tour, so that grass can change hands.
            others = set().union(*(vertices(tours[i]) for i in range(len(tours)) if i != t))
            close = [p for p in points if any(abs(p[0] - q[0]) + abs(p[1] - q[1]) <= 3 for q in others)]
            points = close or points
        cx, cy = rng.choice(points)
        w = max(4, self.size + rng.randint(-2, 2))
        h = max(4, self.size + rng.randint(-2, 2))
        x0 = cx - rng.randint(0, w - 1)
        y0 = cy - rng.randint(0, h - 1)
        result = Window(self.lawn, tours, (x0, y0, x0 + w - 1, y0 + h - 1)).solve(
            self.limit, rng.randrange(1 << 30), self.workers
        )
        if result is None:
            return None
        new, optimal = result
        out = []
        for walk, tour in zip(walks, new):
            out.append(
                walk
                if tour == edges_of(walk)
                else euler(tour, walk[0] if walk[0] in vertices(tour) else min(vertices(tour)))
            )
        return out, optimal


def _search(search: Search, best: tuple[int, int], deadline: float, patience: int, log, label: str):
    """LNS rounds until the deadline or `patience` rounds without improving `best`; returns the best walks
    seen and their cost."""
    best_walks = search.walks
    rounds = idle = 0
    limit = search.limit
    while time.monotonic() < deadline and idle < patience:
        rounds += 1
        idle += 1
        search.limit = max(0.5, min(limit, deadline - time.monotonic()))
        r = search.rng.random()
        kind = "segment" if r < 0.5 else "pair" if r < 0.8 else "rectangle"
        started = time.monotonic()
        result = search.rectangle() if kind == "rectangle" else search.segment(kind == "pair")
        took = time.monotonic() - started
        if result is None:
            continue
        new, optimal = result
        value = _cost(new)
        if value > _cost(search.walks):
            raise AssertionError(f"{kind} move made the tours longer")
        if value < best:
            log(f"  {search.lawn.uid}: {best} -> {value} ({label}, {kind}, round {rounds}, {took:.1f} s)")
            best, best_walks, idle = value, new, 0
        search.walks = new
        search._adapt("rectangle" if kind == "rectangle" else "segment", optimal, took)
    search.limit = limit
    return best_walks, best


def kick(search: Search, strength: int) -> None:
    """Re-routes `strength` random segments so that they keep at most half their steps, allowing each to
    get a little longer: a jump to a nearby solution for the search to continue from."""
    done = 0
    for _ in range(10 * strength):
        if done >= strength:
            break
        t = search._tour()
        n = length(search.walks[t])
        steps = min(n - 1, search.rng.randint(8, 20))
        result = reroute(
            search.lawn,
            search.walks,
            [(t, search.rng.randrange(n), steps)],
            1,
            search.limit,
            search.rng.randrange(1 << 30),
            search.workers,
            copies=1,
            slack=4,
            differ=0.5,
        )
        if result is not None:
            search.walks = result[0]
            done += 1


def improve(
    lawn: Lawn,
    starts: list[list[Walk]],
    seconds: float,
    seed: int = 1,
    workers: int = 1,
    window_seconds: float = 3.0,
    log=print,
) -> list[Walk]:
    """
    LNS for about `seconds`: first a share of the time from each of the starting solutions, then from the
    best one, with a kick whenever the search stalls (and back to the best solution after a few kicks
    that led nowhere). Returns the best walks found.
    """
    rng = random.Random(seed)
    started = time.monotonic()
    deadline = started + seconds
    best_walks = min(starts, key=_cost)
    best = _cost(best_walks)
    share = 0.4 * seconds / len(starts)
    for number, walks in enumerate(starts):
        search = Search(lawn, [list(w) for w in walks], random.Random(rng.random()), workers, window_seconds)
        found, value = _search(
            search, _cost(walks), min(deadline, time.monotonic() + share), 10**9, log, f"start {number + 1}"
        )
        log(f"  {lawn.uid}: start {number + 1} {_cost(walks)} -> {value}")
        if value < best:
            best, best_walks = value, found
    search = Search(lawn, [list(w) for w in best_walks], random.Random(rng.random()), workers, window_seconds)
    failures = 0
    while time.monotonic() < deadline:
        found, value = _search(search, best, deadline, 60, log, "kicked")
        if value < best:
            best, best_walks, failures = value, found, 0
        else:
            failures += 1
        if failures >= 3:
            search.walks = [list(w) for w in best_walks]
            failures = 0
        kick(search, rng.randint(1, 3))
    return best_walks


def rotated(lawn: Lawn, walks: list[Walk]) -> list[Walk]:
    """The walks, each starting at its point nearest to the lawn's lower left corner (a different point per
    walk, so that the cutters start apart)."""
    x0 = min(x for x, _ in lawn.cells)
    y0 = min(y for _, y in lawn.cells)
    out = []
    taken: set[Point] = set()
    for walk in walks:
        options = [j for j, p in enumerate(walk) if p not in taken]
        j = min(options, key=lambda j: (abs(walk[j][0] - x0) + abs(walk[j][1] - y0), walk[j]))
        taken.add(walk[j])
        out.append(walk[j:] + walk[:j])
    return out
