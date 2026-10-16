import test from "node:test";
import assert from "node:assert/strict";
import { buildOrder, DEFAULT_RECIPIENTS } from "../src/order.js";
const now = new Date("2026-10-16T01:00:00Z");
const config = {
  name: "Maddy",
  temperature: "iced",
  coffee: "flat-white",
  art: "logo",
  timing: "now",
};
test("a request carries the customer, complete recipe, timestamp and timezone", () => {
  const order = buildOrder(config, now);
  assert.equal(order.customer_name, "Maddy");
  assert.equal(order.temperature, "Iced");
  assert.equal(order.coffee, "Flat White");
  assert.match(order.recipe, /40 \/ 140 \/ 4 mL/);
  assert.equal(order.latte_art, "A+ Design Group logo");
  assert.equal(order.pickup_iso, now.toISOString());
  assert.match(order.pickup_time, /Right now/);
  assert(order.pickup_timezone);
});
test("custom pickup must be a valid future time and a name is required", () => {
  for (const pickupValue of ["", "invalid", "2026-10-15T12:00:00Z"])
    assert.throws(() =>
      buildOrder({ ...config, timing: "custom", pickupValue }, now),
    );
  assert.throws(() => buildOrder({ ...config, name: "   " }, now));
  const o = buildOrder(
    { ...config, timing: "custom", pickupValue: "2026-10-17T02:30:00Z" },
    now,
  );
  assert.equal(o.pickup_iso, "2026-10-17T02:30:00.000Z");
});
test("the coffee host is the requested notification recipient", () => {
  assert.deepEqual(DEFAULT_RECIPIENTS, ["terrinobb@gmail.com"]);
});

test("Long Black requests contain no milk or latte art", () => {
  const order = buildOrder({ ...config, coffee: "long-black" }, now);
  assert.equal(order.coffee, "Long Black");
  assert.equal(order.latte_art, "None");
  assert(!order.recipe.includes("MILK"));
});
