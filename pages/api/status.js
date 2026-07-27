import { getSlotStatus, getPricing } from "../../lib/redis";

const EMPTY_SLOT = {
  occupied: false,
  price: 0,
  paid: true,
  entryTime: "-",
  exitTime: "-",
  gateOpen: true,
};

// GET /api/status — public, polled by the website's own frontend.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const [slot1, slot2, pricing] = await Promise.all([
    getSlotStatus(1),
    getSlotStatus(2),
    getPricing(),
  ]);

  return res.status(200).json({
    slot1: slot1 || EMPTY_SLOT,
    slot2: slot2 || EMPTY_SLOT,
    pricing,
  });
}
