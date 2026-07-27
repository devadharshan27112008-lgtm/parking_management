import { createSession, serializeCookie } from "../../../lib/auth";

// POST /api/admin/login — { username, password }
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body || {};

  if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = await createSession();
  res.setHeader("Set-Cookie", serializeCookie(token));
  return res.status(200).json({ ok: true });
}
