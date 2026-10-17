"""
Offline solver for the booth lawns of "Rasenmähen": the simple strategies of `heuristics.py`, the best of
them improved by large neighbourhood search with CP-SAT (`lns.py`), and lower bounds (`bounds.py`).
Writes the best tours to `levels/lawn-mowing/solutions/<uid>.solution.json` (pyutils27 format, checked by
the pyutils27 verifier) and prints the numbers for the table in `levels/lawn-mowing/README.md`.

Needs `pip install -r scripts/lawns/requirements.txt`. Run from the repository root:

    python3 scripts/lawns/solve.py                      # all ten instances, 10 minutes each
    python3 scripts/lawns/solve.py lawn3_2s3 --seconds 120
    python3 scripts/lawns/solve.py --table              # only the README table, from the solution files

An existing solution file is the starting point if it is better than the best simple strategy (so runs can
continue each other); a file is only replaced by a shorter solution. Then `npm run levels`.
"""

from __future__ import annotations

import argparse
import sys
import time
from concurrent.futures import ProcessPoolExecutor

from cgshop2027_pyutils.io import read_solution

from bounds import circulation_bound
from heuristics import all_heuristics
from lawn import INSTANCES, SOLUTIONS, Lawn, Walk, length, load, verify, walk_through, write_solution
from lns import improve, rotated

ALGORITHM = "scripts/lawns/solve.py: best simple strategy, improved by large neighbourhood search with CP-SAT"
INTERESTING = 1.15  # the best simple strategy is at least 15 % above the best tour
BORING = 1.05  # ... at most 5 % above it


def existing(lawn: Lawn) -> tuple[list[Walk], dict] | None:
    path = SOLUTIONS / f"{lawn.uid}.solution.json"
    if not path.exists():
        return None
    solution = read_solution(path)
    walks = [walk_through(list(zip(t.x, t.y))) for t in solution.tours]
    if verify(lawn, walks):
        return None
    return walks, solution.meta or {}


def solve(uid: str, seconds: float, seed: int, workers: int, bound_seconds: float) -> str:
    started = time.monotonic()
    lawn = load(uid)
    results = all_heuristics(lawn)
    for name, walks in results:
        errors = verify(lawn, walks)
        if errors:
            raise AssertionError(f"{uid}: heuristic {name} fails the verifier: {errors}")
    ranked = sorted(results, key=lambda r: max(map(length, r[1])))
    name, walks = ranked[0]
    simple = max(map(length, walks))
    # The three best strategies of different kinds as starting points, and the previous solution if any.
    starts = [w for _, w in ranked[:3]]
    before = existing(lawn)
    if before is not None:
        starts.insert(0, before[0])
    log: list[str] = []
    best = rotated(lawn, improve(lawn, starts, seconds, seed=seed, workers=workers, log=log.append))
    value = max(map(length, best))
    bound, total, proven = circulation_bound(lawn, seconds=bound_seconds, workers=workers)
    if before is not None:
        # Both bounds are valid (CP-SAT may prove a weaker one within its time); keep the better.
        bound = max(bound, before[1].get("lower_bound", 0))
        if max(map(length, before[0])) <= value:
            best = before[0]
            value = max(map(length, best))
    meta = {
        "algorithm": ALGORITHM,
        "lower_bound": bound,
        "best_simple_strategy": {"name": name, "longest_tour": simple},
    }
    write_solution(lawn, best, meta)
    took = time.monotonic() - started
    lines = [f"{uid}: simple {simple} ({name}), best {value}, lower bound {bound} ({took:.0f} s)"]
    if not proven:
        lines.append(f"  (circulation bound not proven optimal: total >= {total})")
    return "\n".join(lines + log)


def table() -> str:
    """The README table from the solution files."""
    header = [
        "Instance",
        "Lower bound",
        "Best tour",
        "Gap",
        "Best simple strategy",
        "Simple above best",
        "Verdict",
    ]
    align = ["---", "---:", "---:", "---:", "---", "---:", "---"]
    rows = ["| " + " | ".join(header) + " |", "| " + " | ".join(align) + " |"]
    for path in sorted(INSTANCES.glob("*.instance.json")):
        uid = path.name.removesuffix(".instance.json")
        found = existing(load(uid))
        if found is None:
            rows.append(f"| {uid} | | | | | | no solution |")
            continue
        walks, meta = found
        best = max(map(length, walks))
        bound = meta["lower_bound"]
        simple = meta["best_simple_strategy"]
        ratio = simple["longest_tour"] / best
        verdict = "interesting" if ratio >= INTERESTING else "boring" if ratio <= BORING else ""
        gap = (best - bound) / bound
        rows.append(
            f"| {uid} | {bound} | {best} | {100 * gap:.1f} % | {simple['longest_tour']} ({simple['name']}) "
            f"| +{100 * (ratio - 1):.1f} % | {verdict} |"
        )
    return "\n".join(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("instances", nargs="*", help="instance uids (default: all booth lawns)")
    parser.add_argument("--seconds", type=float, default=600, help="search time per instance")
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--jobs", type=int, default=4, help="instances solved at the same time")
    parser.add_argument("--workers", type=int, default=1, help="CP-SAT workers per instance")
    parser.add_argument("--bound-seconds", type=float, default=120, help="time for the lower bound")
    parser.add_argument("--table", action="store_true", help="only print the README table")
    args = parser.parse_args()
    if not args.table:
        uids = args.instances or sorted(
            p.name.removesuffix(".instance.json") for p in INSTANCES.glob("*.json")
        )
        with ProcessPoolExecutor(max_workers=args.jobs) as pool:
            jobs = [
                pool.submit(solve, uid, args.seconds, args.seed, args.workers, args.bound_seconds)
                for uid in uids
            ]
            for job in jobs:
                print(job.result(), flush=True)
    print(table())


if __name__ == "__main__":
    sys.exit(main())
