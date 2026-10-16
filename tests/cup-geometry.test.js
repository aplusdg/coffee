import test from "node:test";
import assert from "node:assert/strict";
import { createHandleGeometry } from "../src/cup-geometry.js";
import { FLOOR, RIM, innerRadius } from "../src/recipe.js";

test("every handle vertex stays outside the cup cavity, including attachment ends", () => {
  const geometry = createHandleGeometry(),
    positions = geometry.attributes.position;
  let clearance = Infinity;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (y >= FLOOR && y <= RIM) {
      const radial = Math.hypot(positions.getX(i), positions.getZ(i));
      clearance = Math.min(clearance, radial - innerRadius(y));
    }
  }
  assert(clearance > 0.02, `Handle entered cavity: clearance ${clearance}`);
  geometry.dispose();
});
