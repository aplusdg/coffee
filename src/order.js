export const DEFAULT_RECIPIENTS = ["terrinobb@gmail.com"];
export function buildOrder(
  { name, temperature, strength, art, timing, pickupValue },
  now = new Date(),
) {
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
    coffee: "Cappuccino",
    temperature: temperature === "iced" ? "Iced" : "Hot",
    strength: strength === "strong" ? "Strong" : "Regular",
    latte_art:
      { heart: "Heart", star: "Star", logo: "A+ Design Group logo" }[art] ||
      "Heart",
    pickup_time: `${timing === "now" ? "Right now — " : ""}${display} (${zone})`,
    pickup_mode: timing === "custom" ? "custom" : "now",
    pickup_iso: pickup.toISOString(),
    pickup_timezone: zone,
    submitted_at: now.toISOString(),
  };
}
