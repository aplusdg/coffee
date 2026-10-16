import test from "node:test";
import assert from "node:assert/strict";
import { buildOrder } from "../src/order.js";
import {
  NOTIFICATION_ENDPOINT,
  notificationPayload,
  sendNotification,
} from "../src/notifications.js";
const order = buildOrder({
  name: "Maddy",
  temperature: "iced",
  strength: "strong",
  art: "logo",
  timing: "now",
});
test("notification has a fixed recipient and all order details", () => {
  assert.equal(
    NOTIFICATION_ENDPOINT,
    "https://formsubmit.co/ajax/terrinobb@gmail.com",
  );
  const p = notificationPayload(order);
  assert.equal(p.Name, "Maddy");
  assert.equal(p.Coffee, "Iced Strong Cappuccino");
  assert.equal(p["Latte art"], "A+ Design Group logo");
  assert.equal(p["Pickup timestamp"], order.pickup_iso);
  assert.equal(p["Time zone"], order.pickup_timezone);
});
test("only an accepted provider response can mark a request submitted", async () => {
  let request;
  const result = await sendNotification(order, async (url, init) => {
    request = { url, ...init };
    return { ok: true, json: async () => ({ success: "true" }) };
  });
  assert.equal(result.status, "accepted");
  assert.equal(request.method, "POST");
  assert.equal(JSON.parse(request.body).Name, "Maddy");
  for (const reply of [
    { ok: false },
    { ok: true, json: async () => ({ success: false }) },
    {
      ok: true,
      json: async () => {
        throw Error("Invalid JSON");
      },
    },
  ])
    await assert.rejects(() => sendNotification(order, async () => reply));
  await assert.rejects(() =>
    sendNotification(order, async () => {
      throw Error("offline");
    }),
  );
});
test("an activation response is distinct from an accepted order", async () => {
  const result = await sendNotification(order, async () => ({
    ok: true,
    json: async () => ({
      success: false,
      message: "Please activate this form. Check your inbox.",
    }),
  }));
  assert.equal(result.status, "activation");
});
