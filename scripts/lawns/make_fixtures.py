"""
Test fixtures for "Rasenmähen": tours on a few instances, checked by the pyutils27 verifier, so the game's
TypeScript coverage and tour lengths can be compared with the official tools
(`src/core/games/lawn-mowing/verify.test.ts`).

Needs `pip install cgshop2027-pyutils`. Run from the repository root:
`python3 scripts/lawns/make_fixtures.py`; writes `levels/lawn-mowing/fixtures/<instance>.json`.
"""

import json
import random
from pathlib import Path

from cgshop2027_pyutils.io import read_instance, read_solution
from cgshop2027_pyutils.schemas import CGSHOP2027Solution, CutterTour
from cgshop2027_pyutils.verify import SolutionValidator

ROOT = Path(__file__).resolve().parents[2]
LAWNS = ROOT / "levels" / "lawn-mowing"
OUT = LAWNS / "fixtures"

INSTANCES = [
    LAWNS / "instances" / "lawn1_1s3.instance.json",
    LAWNS / "instances" / "lawn3_2s3.instance.json",
    LAWNS / "instances" / "lawn5_2s3.instance.json",
    LAWNS / "competition" / "smr_882k_481_3s3.instance.json",
]


def walk(rng: random.Random, start: tuple[int, int], legs: int, box: tuple[int, int, int, int]) -> dict:
    """A random closed tour: axis-parallel legs inside a box, then an L back to the start."""
    x0, y0, x1, y1 = box
    points = [start]
    x, y = start
    for leg in range(legs):
        if leg % 2 == 0:
            nx = rng.randint(x0, x1)
            if nx == x:
                nx = x + 1
            x = nx
        else:
            ny = rng.randint(y0, y1)
            if ny == y:
                ny = y + 1
            y = ny
        points.append((x, y))
    if x != start[0] and y != start[1]:
        points.append((start[0], y))
    # Drop points that repeat their predecessor (the schema refuses them), and a final copy of the start.
    clean = [points[0]]
    for p in points[1:]:
        if p != clean[-1]:
            clean.append(p)
    while len(clean) > 1 and clean[-1] == clean[0]:
        clean.pop()
    return {"x": [p[0] for p in clean], "y": [p[1] for p in clean]}


def sweep(box: tuple[int, int, int, int], width: int) -> dict:
    """Back and forth over a box in strips of the cutter's width (covers the box), then back to the start."""
    x0, y0, x1, y1 = box
    points = []
    left = True
    for y in range(y0 + 1, y1 + width, width):
        row = [(x0 + 1, y), (x1 - 1, y)]
        points += row if left else row[::-1]
        left = not left
    points.append((x0 + 1, points[-1][1]) if points[-1][0] != x0 + 1 else points[-1])
    clean = [points[0]]
    for p in points[1:]:
        if p != clean[-1]:
            clean.append(p)
    return {"x": [p[0] for p in clean], "y": [p[1] for p in clean]}


def cases(instance, solution) -> list[dict]:
    validator = SolutionValidator(instance)
    bx0, by0, bx1, by1 = validator.region.bounds
    box = (bx0 - 2, by0 - 2, bx1 + 2, by1 + 2)
    rng = random.Random(instance.instance_uid)
    k = instance.number_of_cutters
    candidates = []
    if solution is not None:
        candidates.append(("competition solution", [t.model_dump() for t in solution.tours]))
    # The whole box swept by the first cutter, the others stand still.
    candidates.append(("sweep", [sweep((bx0, by0, bx1 + 1, by1 + 1), 3)] + [{"x": [bx0], "y": [by0]}] * (k - 1)))
    for i in range(3):
        tours = [walk(rng, (rng.randint(bx0, bx1), rng.randint(by0, by1)), rng.randint(2, 9), box) for _ in range(k)]
        candidates.append((f"random walk {i + 1}", tours))
    candidates.append(("standing still", [{"x": [bx0 + 1], "y": [by0 + 1]}] * k))
    candidates.append(("outside the lawn", [{"x": [bx0 - 3, bx1 + 3], "y": [by0 - 3, by0 - 3]}] * k))
    out = []
    for name, tours in candidates:
        sol = CGSHOP2027Solution(instance_uid=instance.instance_uid, tours=tours)
        uncovered = validator.uncovered_cells(sol)
        out.append(
            {
                "name": name,
                "tours": [{"x": t.x, "y": t.y} for t in sol.tours],
                "lengths": [t.length for t in sol.tours],
                "maxTourLength": sol.max_tour_length,
                "uncovered": sorted([list(c) for c in uncovered.cells()]),
                "errors": validator.check_for_errors(sol),
            }
        )
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for path in INSTANCES:
        instance = read_instance(path)
        sol_path = path.with_name(path.name.replace(".instance.", ".solution."))
        solution = read_solution(sol_path) if sol_path.exists() else None
        fixture = {
            "instance": json.loads(path.read_text()),
            "regionCells": len(SolutionValidator(instance).region),
            "cases": cases(instance, solution),
        }
        target = OUT / f"{instance.instance_uid}.json"
        target.write_text(json.dumps(fixture, separators=(",", ":")) + "\n")
        print(f"{target.relative_to(ROOT)}: {len(fixture['cases'])} cases")


if __name__ == "__main__":
    main()
