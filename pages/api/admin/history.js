import { getTokenFromReq, isValidSession } from "../../../lib/auth";
import { getHistory } from "../../../lib/redis";

// GET /api/admin/history — requires login
export default async function handler(req, res) {
  const token = getTokenFromReq(req);
  if (!(await isValidSession(token))) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const history = await getHistory(50);
  return res.status(200).json({ history });
}
