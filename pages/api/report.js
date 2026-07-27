import {
  setSlotStatus,
  getPricing,
  getPendingConfirmation,
  clearPendingConfirmation,
} from "../../lib/redis";

// POST /api/report — called by the ESP32 every ~2 seconds.
// Requires header: x-api-key: <DEVICE_API_KEY>
//
// Body: { now, slot1: {...}, slot2: {...}, ack: { slot1, slot2 } }
// Response: { pricing: {...}, pending: { slot1: {id,amount}|null, slot2: ...} }
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (req.headers["x-api-key"] !== process.env.DEVICE_API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const { now, slot1, slot2, ack } = req.body || {};

  if (slot1) await setSlotStatus(1, { ...slot1, updatedAt: now });
  if (slot2) await setSlotStatus(2, { ...slot2, updatedAt: now });

  // If the device's ack matches the pending id we sent, it means the
  // device has applied that payment — safe to clear it so we stop
  // resending it on future reports.
  let pending1 = await getPendingConfirmation(1);
  if (ack?.slot1 && pending1 && ack.slot1 === pending1.id) {
    await clearPendingConfirmation(1);
    pending1 = null;
  }

  let pending2 = await getPendingConfirmation(2);
  if (ack?.slot2 && pending2 && ack.slot2 === pending2.id) {
    await clearPendingConfirmation(2);
    pending2 = null;
  }

  const pricing = await getPricing();

  return res.status(200).json({
    pricing,
    pending: {
      slot1: pending1 || null,
      slot2: pending2 || null,
    },
  });
}
