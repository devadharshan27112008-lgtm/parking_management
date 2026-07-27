import { Redis } from "@upstash/redis";

// Reads KV_REST_API_URL / KV_REST_API_TOKEN from env (Upstash REST creds).
export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// =====================================================
//  ORDERS (simulated payments, created by /api/pay)
//  order:<orderId> -> { slot, amount, status: "created"|"success"|"failed" }
// =====================================================
export async function getOrder(orderId) {
  return redis.get(`order:${orderId}`);
}

export async function saveOrder(orderId, data) {
  return redis.set(`order:${orderId}`, data, { ex: 60 * 60 }); // expire in 1hr
}

// =====================================================
//  PENDING CONFIRMATIONS (website -> device)
//  pending:slot:<n> -> { id, amount }
//  The ESP32 polls /api/report and applies+acks this; once acked,
//  /api/report clears it.
// =====================================================
export async function setPendingConfirmation(slot, id, amount) {
  return redis.set(`pending:slot:${slot}`, { id, amount }, { ex: 60 * 10 });
}

export async function getPendingConfirmation(slot) {
  return redis.get(`pending:slot:${slot}`);
}

export async function clearPendingConfirmation(slot) {
  return redis.del(`pending:slot:${slot}`);
}

// =====================================================
//  LIVE SLOT STATUS (device -> website, via /api/report)
//  slot:<n> -> { occupied, price, paid, entryTime, exitTime, gateOpen, updatedAt }
// =====================================================
export async function setSlotStatus(slot, data) {
  return redis.set(`slot:${slot}`, data);
}

export async function getSlotStatus(slot) {
  return redis.get(`slot:${slot}`);
}

// =====================================================
//  PRICING (owner-adjustable via /api/admin/setprice)
// =====================================================
const DEFAULT_PRICING = { base: 10, rate: 1, mintime: 10, unit: "min" };

export async function getPricing() {
  const p = await redis.get("pricing");
  return p || DEFAULT_PRICING;
}

export async function setPricing(data) {
  return redis.set("pricing", data);
}

// =====================================================
//  HISTORY (completed + paid sessions, for the admin page)
//  history -> list of { slot, amount, entryTime, exitTime, paidAt, orderId }
// =====================================================
export async function addHistoryEntry(entry) {
  return redis.lpush("history", entry);
}

export async function getHistory(limit = 50) {
  return redis.lrange("history", 0, limit - 1);
}
