# Booth lawns for "Rasenmähen"

Five small lawns for the booth, each as a CG:SHOP 2027 instance in the pyutils27 format
([github.com/CG-SHOP/pyutils27](https://github.com/CG-SHOP/pyutils27)) with a 3 × 3 cutter (`cutter`
from (0, 0) to (3, 3), `cutter_center` (1, 1), as in the competition's `…s3` instances), once for one and
once for two cutters.

| Lawn  | Name          | Cells | Holes                                 |
| ----- | ------------- | ----: | ------------------------------------- |
| lawn1 | Vorgarten     |   304 | pond, tree                            |
| lawn2 | Gemüsegarten  |   345 | six flower beds                       |
| lawn3 | Schlossgarten |   399 | pond, tree, flower bed                |
| lawn4 | Obstwiese     |   426 | 13 trees                              |
| lawn5 | Stadtpark     |   462 | pond around an island, tree, two beds |

## Solutions

`python3 scripts/lawns/solve.py` (after `pip install -r scripts/lawns/requirements.txt`) computes the
tours in `solutions/`, the lower bounds and the best simple strategy, and prints this table
(`--table` prints it from the solution files alone). Instance `lawn<n>_<k>s3` has k cutters; lengths
are the longest tour (the competition's objective).

| Instance  | Lower bound | Best tour |   Gap | Best simple strategy     | Simple above best | Verdict     |
| --------- | ----------: | --------: | ----: | ------------------------ | ----------------: | ----------- |
| lawn1_1s3 |         108 |       110 | 1.9 % | 126 (spiral)             |           +14.5 % |             |
| lawn1_2s3 |          54 |        56 | 3.7 % | 62 (halves with spiral)  |           +10.7 % |             |
| lawn2_1s3 |         120 |       122 | 1.7 % | 144 (spiral)             |           +18.0 % | interesting |
| lawn2_2s3 |          60 |        64 | 6.7 % | 68 (halves with nearest) |            +6.2 % |             |
| lawn3_1s3 |         140 |       144 | 2.9 % | 170 (strips)             |           +18.1 % | interesting |
| lawn3_2s3 |          70 |        74 | 5.7 % | 84 (halves with spiral)  |           +13.5 % |             |
| lawn4_1s3 |         160 |       164 | 2.5 % | 174 (spiral)             |            +6.1 % |             |
| lawn4_2s3 |          80 |        82 | 2.5 % | 92 (halves with spiral)  |           +12.2 % |             |
| lawn5_1s3 |         170 |       184 | 8.2 % | 216 (strips)             |           +17.4 % | interesting |
| lawn5_2s3 |          86 |        92 | 7.0 % | 112 (strips)             |           +21.7 % | interesting |

- Lower bound: walking once around a closed tour, every lawn cell is "entered" by some step (it is under
  the cutter after the step but not before), and a step enters at most the three cells of the new row of
  the cutter, fewer at the lawn's edge and at holes. The shortest circulation (as many steps into every
  position as out of it, but not necessarily connected) that enters every lawn cell is therefore a lower
  bound for the total length of all tours; CP-SAT computes it, and dividing by k and rounding up to an
  even number (a closed tour on the grid has even length) bounds the longest tour. On these lawns it is 2
  to 18 steps above the area bound ⌈N / 3k⌉ (N cells, rounded up to even); the game's theory view
  explains the even simpler ⌈(N − 9k) / 3k⌉.
- Best tour: the best of the simple strategies below, improved by large neighbourhood search: CP-SAT
  repeatedly re-optimises a window of the tours (a stretch of 10–60 steps, two nearby stretches, or all
  edges in a small rectangle) and keeps the result if the longest tour does not get longer
  (`scripts/lawns/lns.py`). Gap: how far the best tour is above the lower bound.
- Best simple strategy: the best of the strategies a visitor might follow (`scripts/lawns/heuristics.py`):
  back-and-forth strips as high as the cutter (as in the game; both orientations, every offset, for two
  cutters split into two groups of strips), a spiral along the edge of the grass that is left, always to
  the nearest grass; for two cutters also the lawn cut into two halves mowed alone with one of these, and
  both cutters mowing at the same time with spiral or nearest. A lawn is interesting if the best simple
  strategy is at least 15 % above the best tour, boring if it is within 5 %. No booth lawn is boring.

The solution files keep the lower bound and the best simple strategy in their `meta`. A new run starts
from the existing solution file as well and only replaces it by a better one.

## Files

- `lawns.txt`: the lawns drawn on the grid, one character per cell (the source).
  `python3 scripts/lawns/make_instances.py` (needs `pip install cgshop2027-pyutils`) regenerates
  `instances/` from it and validates every file with the pyutils27 schema.
- `instances/<lawn>_<k>s3.instance.json`: the ten instances (k = number of cutters).
- `solutions/<lawn>_<k>s3.solution.json`: the best tours found by `scripts/lawns/solve.py`, in the
  pyutils27 solution format. They are kept apart from the instances because pyutils27's instance database treats every JSON
  file in a folder as an instance. `npm run levels` puts instances and solutions into
  `public/levels/lawn-mowing/<lawn>.json` (one file per lawn with both numbers of cutters).
- `example/`: the small example lawn of the explanation after a finished lawn ("Was steckt dahinter?"),
  none of the booth lawns (Kevin, 2026-10-19: the animation showed the solution of the lawn just played).
  `lawn.txt` is its source (same format as `lawns.txt`), `instances/` its instances for one and two
  cutters (`make_instances.py`), `solutions/` the tours of `python3 scripts/lawns/solve.py example_1s3
example_2s3` (one cutter: 46 steps, equal to the lower bound; two cutters: 26, lower bound 24).
  `npm run levels` writes it to `public/levels/lawn-mowing/example.json`.
- `competition/`: a real CG:SHOP 2027 instance with the example solution from pyutils27 (MIT), shown in
  the theory view.
- `fixtures/`: tours on some of these instances checked by the pyutils27 verifier
  (`python3 scripts/lawns/make_fixtures.py`); a test compares the game's coverage and tour lengths with
  them.

## Checking a solution

Every solution file is checked by the pyutils27 verifier when it is written; by hand:

```python
from cgshop2027_pyutils.io import read_instance, read_solution
from cgshop2027_pyutils.verify import check_for_errors

errors = check_for_errors(
    read_instance("instances/lawn3_2s3.instance.json"),
    read_solution("solutions/lawn3_2s3.solution.json"),
)
```

The game shows the longest tour as the target ("Ziel vom Löser") and animates the tours in the theory
view. The instances have no start position, as in the competition: the game starts each cutter on the
first point of its tour (the point nearest to the lawn's lower left corner), so the target stays
reachable.

## Conventions

- Coordinates as in pyutils27: y points up, cell (x, y) is the unit square [x, x + 1] × [y, y + 1]; the
  game flips y to draw.
- Holes need no mowing; cutters may cross them and leave the lawn. The game picks a hole's art from its
  shape: a 1 × 1 or 2 × 2 square is a tree, a rectangle 1 or 2 cells wide and at least 3 long a flower bed,
  anything else a pond.
