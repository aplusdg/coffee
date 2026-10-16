import { getRecipe } from "./recipe.js";
export const DEFAULT_RECIPIENTS = ["terrinobb@gmail.com"];
export function buildOrder(
  { name, temperature, coffee = "cappuccino", art, timing, pickupValue },
  now = new Date(),
) {
  const recipe = getRecipe(coffee, temperature);
  const customer = name.trim();
  if (!customer || customer.length > 80)
    throw new Error("Please enter your name (up to 80 characters).");
  const pickup = timing === "custom" ? new Date(pickupValue) : now;
  if (
    !Number.isFinite(pickup.getTime()) ||
    (timing === "custom" && pickup <= now)
  )
    throw new Error("Please choose a time in the future.");
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const display = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: undefined,
  }).format(pickup);
  return {
    order_id: globalThis.crypto.randomUUID(),
    customer_name: customer,
    coffee: recipe.name,
    recipe: recipe.ratioLabel + ": " + recipe.ratio,
    temperature: temperature === "iced" ? "Iced" : "Hot",
    latte_art: recipe.hasMilk
      ? { heart: "Heart", star: "Star", logo: "A+ Design Group logo" }[art] ||
        "Heart"
      : "None",
    pickup_time: `${timing === "now" ? "Right now — " : ""}${display} (${zone})`,
    pickup_mode: timing === "custom" ? "custom" : "now",
    pickup_iso: pickup.toISOString(),
    pickup_timezone: zone,
    submitted_at: now.toISOString(),
  };
}
