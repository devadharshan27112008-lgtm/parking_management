import {
  saveOrder,
  getOrder,
  getSlotStatus,
  setPendingConfirmation,
  addHistoryEntry,
} from "../../lib/redis";

// TEST-MODE ONLY. Simulates a payment gateway response with an ~80%
// approval rate — no real money, no external API calls, no keys required.
//
// Flow:
//   1. POST /api/pay { slot }               -> creates an order, returns { orderId, amount }
//   2. POST /api/pay { orderId, action:"confirm" } -> "runs" the simulated
//      payment and returns success/failure. On success, queues a
//      { id, amount } confirmation the device picks up on its next
//      /api/report poll, and logs a history entry for the admin page.

function randomOrderId() {
  return "SIM" + Date.now() + Math.floor(Math.random() * 10000);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slot, orderId, action, amount } = req.body || {};

  // Step 1: create a simulated order for a slot
  if (slot && !action) {
    if (slot !== 1 && slot !== 2) {
      return res.status(400).json({ error: "slot must be 1 or 2" });
    }

    let dueAmount = amount;
    if (dueAmount == null) {
      const status = await getSlotStatus(slot);
      dueAmount = status?.price ?? 20; // fallback test amount in INR
    }

    const newOrderId = randomOrderId();
    await saveOrder(newOrderId, { slot, amount: dueAmount, status: "created" });
    return res.status(200).json({ orderId: newOrderId, amount: dueAmount, mode: "test" });
  }

  // Step 2: "run" the simulated payment
  if (orderId && action === "confirm") {
    const order = await getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const approved = Math.random() < 0.8; // ~80% approval

    await saveOrder(orderId, { ...order, status: approved ? "success" : "failed" });

    if (approved) {
      // The device reads this on its next /api/report poll and applies it.
      await setPendingConfirmation(order.slot, orderId, order.amount);

      // Log for the admin history page.
      const slotStatus = await getSlotStatus(order.slot);
      await addHistoryEntry({
        slot: order.slot,
        amount: order.amount,
        entryTime: slotStatus?.entryTime ?? "-",
        exitTime: slotStatus?.exitTime ?? "-",
        paidAt: new Date().toISOString(),
        orderId,
      });
    }

    return res.status(200).json({
      orderId,
      status: approved ? "success" : "failed",
      mode: "test",
    });
  }

  return res.status(400).json({ error: "Invalid request. Expected { slot } or { orderId, action:'confirm' }." });
}
