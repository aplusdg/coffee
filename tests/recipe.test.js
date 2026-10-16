import test from "node:test";
import assert from "node:assert/strict";
import {
  MENU,
  FLOOR,
  RIM,
  DURATION,
  innerRadius,
  getRecipe,
  recipeAt,
  volumeAt,
} from "../src/recipe.js";

test("all eight hot/iced recipes fill monotonically and stay within the cup", () => {
  for (const coffee of Object.keys(MENU))
    for (const temp of ["hot", "iced"]) {
      let previous = FLOOR;
      for (let t = 0; t <= DURATION; t += 0.025) {
        const r = recipeAt(t, coffee, temp);
        assert(r.level >= FLOOR);
        assert(r.surface >= previous - 1e-9);
        previous = r.surface;
        assert(r.surface < RIM - 0.15);
        assert(r.radius < innerRadius(r.level) - 0.04);
        if (r.foamHeight > 0)
          assert(
            r.foamRadius + 0.01 < innerRadius(r.level - 0.01),
            "foam clears the lower wall even at full thickness",
          );
        if (temp === "iced") {
          const orbit = Math.min(0.58, r.radius - 0.27);
          assert(
            orbit + 0.25 + 0.02 < innerRadius(Math.max(FLOOR + 0.22, r.level)),
          );
          assert(r.level + 0.06 * r.foam + 0.25 + 0.012 < RIM);
        }
      }
      assert(
        Math.abs(
          recipeAt(DURATION, coffee, temp).surface -
            getRecipe(coffee, temp).surface,
        ) < 1e-8,
      );
    }
});
test("espresso, milk and foam volumes match each advertised house recipe", () => {
  for (const coffee of ["flat-white", "latte", "cappuccino"])
    for (const temp of ["hot", "iced"]) {
      const recipe = getRecipe(coffee, temp),
        espressoEnd = recipe.stages[0].end;
      const baseVolume = volumeAt(recipeAt(espressoEnd, coffee, temp).level);
      const final = recipeAt(DURATION, coffee, temp);
      const milkVolume = volumeAt(final.level) - baseVolume;
      const foamVolume = volumeAt(final.surface) - volumeAt(final.level);
      assert(
        Math.abs(
          milkVolume / baseVolume -
            recipe.ingredients.milk / recipe.ingredients.espresso,
        ) < 1e-6,
      );
      assert(
        Math.abs(
          foamVolume / baseVolume -
            recipe.ingredients.foam / recipe.ingredients.espresso,
        ) < 1e-6,
      );
    }
  assert(
    getRecipe("flat-white").ingredients.espresso >
      getRecipe("latte").ingredients.espresso,
  );
  assert(
    recipeAt(DURATION, "cappuccino").foamHeight >
      recipeAt(DURATION, "latte").foamHeight,
  );
  assert(
    recipeAt(DURATION, "latte").foamHeight >
      recipeAt(DURATION, "flat-white").foamHeight,
  );
});
test("Long Black pours water before espresso and never adds milk or foam", () => {
  for (const temp of ["hot", "iced"]) {
    const recipe = getRecipe("long-black", temp);
    assert.deepEqual(
      recipe.stages.map((s) => s.type),
      ["water", "espresso"],
    );
    const water = recipeAt(recipe.stages[0].end, "long-black", temp);
    assert(water.amounts.water > 0);
    assert.equal(water.amounts.espresso, 0);
    for (let t = 0; t <= DURATION; t += 0.1) {
      const r = recipeAt(t, "long-black", temp);
      assert.equal(r.amounts.milk, 0);
      assert.equal(r.foamHeight, 0);
    }
  }
});
test("each pour ends before the next begins and the menu has exactly four coffees", () => {
  assert.equal(Object.keys(MENU).length, 4);
  for (const coffee of Object.keys(MENU))
    for (const temp of ["hot", "iced"]) {
      const { stages } = getRecipe(coffee, temp);
      for (let i = 0; i < stages.length; i++) {
        assert(stages[i].end > stages[i].start);
        assert(stages[i].end < DURATION);
        if (i) assert(stages[i].start > stages[i - 1].end);
      }
    }
});
