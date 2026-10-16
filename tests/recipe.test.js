import test from "node:test";
import assert from "node:assert/strict";
import { FLOOR, RIM, innerRadius, recipeAt } from "../src/recipe.js";

test("every liquid surface and foam rim stays inside the tapered cup at every stage", () => {
  for (const strength of ["regular", "strong"])
    for (let t = 0; t <= 11; t += 0.025) {
      const { level, radius, foamHeight, foamRadius } = recipeAt(t, strength);
      assert(level >= FLOOR && level + foamHeight < RIM - 0.15);
      assert(radius < innerRadius(level) - 0.04);
      // Allow for foam motion; even its outer crema ring must clear the wall.
      assert(foamRadius * 0.977 + 0.015 < innerRadius(level + foamHeight - 0.015));
      // The ice cubes, including rotation and drift, have room inside.
      const orbit = Math.min(0.6, radius - 0.23);
      assert(orbit + 0.21 + 0.02 < innerRadius(Math.max(FLOOR + 0.19, level)));
      assert(level + 0.08 + 0.2 < RIM);
    }
});
test("Strong changes the espresso portion while keeping final fill and foam below the rim", () => {
  assert(recipeAt(3.5, "strong").level > recipeAt(3.5, "regular").level);
  assert(
    Math.abs(recipeAt(11, "strong").level - recipeAt(11, "regular").level) <
      1e-10,
  );
  assert(recipeAt(0).milk === 0 && recipeAt(7).foam === 0);
});
