import { getTokenFromReq, destroySession, clearCookie } from "../../../lib/auth";

// GET /api/admin/logout
export default async function handler(req, res) {
  const token = getTokenFromReq(req);
  await destroySession(token);
  res.setHeader("Set-Cookie", clearCookie());
  return res.status(200).json({ ok: true });
}
