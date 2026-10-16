# Booth lawns for "Rasenmähen"

Five small lawns for the booth, each as a CG:SHOP 2027 instance in the pyutils27 format
([github.com/CG-SHOP/pyutils27](https://github.com/CG-SHOP/pyutils27)) with a 3 × 3 cutter (`cutter`
from (0, 0) to (3, 3), `cutter_center` (1, 1), as in the competition's `…s3` instances), once for one and
once for two cutters.

| Lawn  | Name          | Cells | Holes                                 | Lower bound, 1 / 2 cutters | Strip heuristic, 1 / 2 cutters |
| ----- | ------------- | ----: | ------------------------------------- | -------------------------: | -----------------------------: |
| lawn1 | Vorgarten     |   304 | pond, tree                            |                    99 / 48 |                       140 / 74 |
| lawn2 | Gemüsegarten  |   345 | six flower beds                       |                   112 / 55 |                       168 / 96 |
| lawn3 | Schlossgarten |   399 | pond, tree, flower bed                |                   130 / 64 |                       170 / 92 |
| lawn4 | Obstwiese     |   426 | 13 trees                              |                   139 / 68 |                      182 / 108 |
| lawn5 | Stadtpark     |   462 | pond around an island, tree, two beds |                   151 / 74 |                      216 / 112 |

- Lower bound: a unit step of a 3 × 3 cutter sweeps at most 3 new cells and its first position 9, so with
  k cutters on N cells the longest tour has length at least ⌈(N − 9k) / 3k⌉.
- Strip heuristic: back-and-forth strips of height 3 (best of both orientations and three offsets, for two
  cutters the best split into two groups of strips). A baseline only; the solver should beat it clearly.

## Files

- `lawns.txt`: the lawns drawn on the grid, one character per cell (the source).
  `python3 scripts/lawns/make_instances.py` (needs `pip install cgshop2027-pyutils`) regenerates
  `instances/` from it and validates every file with the pyutils27 schema.
- `instances/<lawn>_<k>s3.instance.json`: the ten instances (k = number of cutters).
- `solutions/<lawn>_<k>s3.solution.json`: solutions of the chair's solver, in the pyutils27 solution
  format. They are kept apart from the instances because pyutils27's instance database treats every JSON
  file in a folder as an instance. `npm run levels` puts instances and solutions into
  `public/levels/lawn-mowing/<lawn>.json` (one file per lawn with both numbers of cutters).
- `competition/`: a real CG:SHOP 2027 instance with the example solution from pyutils27 (MIT), shown in
  the theory view.
- `fixtures/`: tours on some of these instances checked by the pyutils27 verifier
  (`python3 scripts/lawns/make_fixtures.py`); a test compares the game's coverage and tour lengths with
  them.

## Solutions wanted

For each of the ten instances, the best solution the chair's solver finds, with the competition's
objective (the longest tour). Check a file with:

```python
from cgshop2027_pyutils.io import read_instance, read_solution
from cgshop2027_pyutils.verify import check_for_errors

errors = check_for_errors(
    read_instance("instances/lawn3_2s3.instance.json"),
    read_solution("solutions/lawn3_2s3.solution.json"),
)
```

The game shows the longest tour as the target ("Ziel vom Löser") and animates the tours in the theory
view. The instances have no start position, as in the competition: the game starts each cutter on a point
of the solver's tour, so any closed tour works and the target stays reachable.

## Conventions

- Coordinates as in pyutils27: y points up, cell (x, y) is the unit square [x, x + 1] × [y, y + 1]; the
  game flips y to draw.
- Holes need no mowing; cutters may cross them and leave the lawn. The game picks a hole's art from its
  shape: a 1 × 1 or 2 × 2 square is a tree, a rectangle 1 or 2 cells wide and at least 3 long a flower bed,
  anything else a pond.
