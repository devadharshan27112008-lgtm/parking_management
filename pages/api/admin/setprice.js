import { getTokenFromReq, isValidSession } from "../../../lib/auth";
import { setPricing } from "../../../lib/redis";

const VALID_UNITS = ["sec", "min", "hr"];

// POST /api/admin/setprice — { base, mintime, rate, unit } (requires login)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getTokenFromReq(req);
  if (!(await isValidSession(token))) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { base, mintime, rate, unit } = req.body || {};

  if (base == null || mintime == null || rate == null || !unit) {
    return res.status(400).json({ error: "Missing fields: base, mintime, rate, unit" });
  }
  if (!VALID_UNITS.includes(unit)) {
    return res.status(400).json({ error: `unit must be one of: ${VALID_UNITS.join(", ")}` });
  }

  await setPricing({ base, mintime, rate, unit });
  return res.status(200).json({ ok: true });
}
