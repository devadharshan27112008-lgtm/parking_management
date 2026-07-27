import crypto from "crypto";
import { redis } from "./redis";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export function serializeCookie(token, maxAgeSeconds = SESSION_TTL_SECONDS) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getTokenFromReq(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export async function createSession() {
  const token = crypto.randomBytes(24).toString("hex");
  await redis.set(`session:${token}`, true, { ex: SESSION_TTL_SECONDS });
  return token;
}

export async function isValidSession(token) {
  if (!token) return false;
  const val = await redis.get(`session:${token}`);
  return !!val;
}

export async function destroySession(token) {
  if (token) await redis.del(`session:${token}`);
}
