import { getTokenFromReq, isValidSession } from "../../../lib/auth";

// GET /api/admin/me — used by the admin page to check login state
export default async function handler(req, res) {
  const token = getTokenFromReq(req);
  const loggedIn = await isValidSession(token);
  return res.status(200).json({
    loggedIn,
    username: loggedIn ? process.env.ADMIN_USER : null,
  });
}
