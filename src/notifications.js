import { DEFAULT_RECIPIENTS } from "./order.js";

export const NOTIFICATION_ENDPOINT = `https://formsubmit.co/ajax/${DEFAULT_RECIPIENTS[0]}`;
export function notificationPayload(order) {
  return {
    _subject: `Coffee request: ${order.customer_name} — ${order.temperature} ${order.coffee}`,
    _template: "table",
    _captcha: "false",
    Name: order.customer_name,
    Coffee: `${order.temperature} ${order.coffee}`,
    "Latte art": order.latte_art,
    Recipe: order.recipe,
    "Requested time": order.pickup_time,
    "Pickup timestamp": order.pickup_iso,
    "Time zone": order.pickup_timezone,
    "Submitted at": order.submitted_at,
    "Request ID": order.order_id,
  };
}
export async function sendNotification(order, fetcher = fetch) {
  const response = await fetcher(NOTIFICATION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(notificationPayload(order)),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("The notification service is unavailable.");
  const result = await response.json();
  const message = typeof result.message === "string" ? result.message : "";
  if (/activat|confirm your email|check your (?:email|inbox)/i.test(message))
    return { status: "activation" };
  if (result.success !== true && result.success !== "true")
    throw new Error("The notification service did not accept this request.");
  return { status: "accepted" };
}
