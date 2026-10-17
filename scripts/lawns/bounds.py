"""
Lower bounds for the longest tour on a booth lawn.

Area bound. A unit step moves the cutter's footprint by one cell, so the footprint gains one row of
`width` cells. Walk once around a closed tour p_0, ..., p_{L-1}: every lawn cell is either in every
footprint of the tour, or it is "entered" by some step, i.e. it lies in F(p_i) but not in F(p_{i-1})
(start at a position whose footprint misses it and go forward to the first one that has it). A tour
with a cell in all its footprints stays within one 3 x 3 block of positions and covers at most 25 cells,
so on our lawns every tour enters every cell it covers: N <= sum of width * L_i <= k * width * L_max.
A closed tour on the grid has even length, so L_max >= N / (3k), rounded up to an even number.

Circulation bound. The same argument counts only lawn cells: a step enters the lawn cells of the new row
of its footprint, which may be fewer than three at the lawn's edge, at holes and where rows of grass
have already been entered. Every tour is a circulation (as many steps into a position as out of it), so
the shortest circulation that enters every lawn cell at least once is a lower bound for the total length
of all tours. CP-SAT finds it (or a proven bound on it) quickly; connectivity is left out, which is what
makes it a relaxation. With k cutters, L_max >= total / k, rounded up to an even number.
"""

from __future__ import annotations

import math

from ortools.sat.python import cp_model

from lawn import Lawn, neighbours


def even_ceil(value: float) -> int:
    n = math.ceil(value - 1e-9)
    return n + n % 2


def area_bound(lawn: Lawn) -> int:
    return even_ceil(len(lawn.cells) / (lawn.width * lawn.k))


def entered(lawn: Lawn, p, q) -> list:
    """Lawn cells that the step p -> q brings under the cutter."""
    before = set(lawn.footprint(p))
    return [c for c in lawn.footprint(q) if c not in before]


def circulation_bound(lawn: Lawn, seconds: float = 120.0, workers: int = 4) -> tuple[int, int, bool]:
    """
    (lower bound for the longest tour, bound for the total length, whether CP-SAT proved the total
    optimal). Falls back to the area bound if CP-SAT finds nothing better.
    """
    model = cp_model.CpModel()
    steps = {}
    for p in lawn.positions:
        for q in neighbours(p):
            if lawn.inside(q):
                # An optimal tour uses an edge at most twice, in either direction.
                steps[(p, q)] = model.new_int_var(0, 2 * lawn.k, "")
    for (p, q), var in steps.items():
        if p < q:
            model.add(var + steps[(q, p)] <= 2 * lawn.k)
    into: dict = {p: [] for p in lawn.positions}
    out: dict = {p: [] for p in lawn.positions}
    entering: dict = {c: [] for c in lawn.cells}
    for (p, q), var in steps.items():
        out[p].append(var)
        into[q].append(var)
        for c in entered(lawn, p, q):
            entering[c].append(var)
    for p in lawn.positions:
        model.add(sum(into[p]) == sum(out[p]))
    for c, options in entering.items():
        model.add(sum(options) >= 1)
    model.minimize(sum(steps.values()))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = seconds
    solver.parameters.num_workers = workers
    status = solver.solve(model)
    total = math.ceil(solver.best_objective_bound - 1e-6) if status != cp_model.UNKNOWN else 0
    # Only a tour within one 3 x 3 block of positions can skip the argument; it mows at most 25 cells, and
    # the other cutters then need the area bound for the rest.
    escape = even_ceil((len(lawn.cells) - 25) / (lawn.width * max(1, lawn.k - 1))) if lawn.k > 1 else total
    bound = max(area_bound(lawn), min(even_ceil(total / lawn.k), escape))
    return bound, total, status == cp_model.OPTIMAL
