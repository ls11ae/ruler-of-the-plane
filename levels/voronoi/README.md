# Maps for "Erobere das Land"

IPE files, converted to `public/levels/voronoi/` by `npm run levels` (`scripts/levels/voronoi.ts`). File
names are `map<n>-<name>.ipe`; `n` is the order in the game.

| Map                      | Name       | Land                                      | Cities | Mines |
| ------------------------ | ---------- | ----------------------------------------- | -----: | ----: |
| `map1-island.ipe`        | Insel      | an island with a lake, an islet           |      4 |     1 |
| `map2-river-valley.ipe`  | Flusstal   | the whole sheet, a river with a tributary |      5 |     1 |
| `map3-lake-district.ipe` | Seenplatte | a coast in the south-east, six lakes      |      5 |     1 |

## Drawing a map in IPE

Use straight segments only (polylines and polygons, no curves or arcs); draw coasts with many short
segments so they look round.

- Layer `frame`: one axis-parallel rectangle, the map sheet. The game shows it (larger side scaled to 16
  units) and clips the castles' cells to it.
- Layer `land`: closed polygons of land. They may reach beyond the frame (e.g. land filling the whole
  sheet); the part outside the frame is cut off. Several polygons are united.
- Layer `water`: closed polygons of lakes and rivers, cut out of the land. A lake may not contain an
  island (the island would be cut out too).
- Markers, on any layer: `square` = city (+5 points), `cross` = gold mine (+10 points), `disk` = forest,
  `circle` = mountains. Forests and mountains are decoration. Put cities and mines on land, not too close
  to the water.

An object without a layer attribute is on the layer of the object before it, as in IPE itself.
