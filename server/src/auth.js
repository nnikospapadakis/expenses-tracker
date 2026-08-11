import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, save, nextId } from "./store.js";

const COOKIE = "et_token";
const secret = () => process.env.JWT_SECRET || "dev-secret";

// Google Sign-In. We use the ID-token flow: the browser gets a signed token from
// Google and posts it here; we verify it and issue our own login cookie. The
// Client ID is public and comes from the environment.
//
// Verification is done with jsonwebtoken against Google's published public certs
// (fetched and cached) — no extra dependency needed, which keeps the cPanel
// deploy simple (nothing new to bundle into node_modules).
const googleClientId = () => process.env.GOOGLE_CLIENT_ID || "";

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v1/certs";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
let certCache = { certs: null, exp: 0 };

async function googleCerts() {
  if (certCache.certs && Date.now() < certCache.exp) return certCache.certs;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("Could not fetch Google certificates");
  const certs = await res.json();
  const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") || "");
  const ttlMs = (maxAge ? Number(maxAge[1]) : 3600) * 1000;
  certCache = { certs, exp: Date.now() + ttlMs };
  return certs;
}

// Verify a Google ID token; returns its payload (sub, email, name, ...) or throws.
async function verifyGoogleIdToken(credential, clientId) {
  const decoded = jwt.decode(credential, { complete: true });
  const kid = decoded?.header?.kid;
  if (!kid) throw new Error("Malformed Google token");
  const cert = (await googleCerts())[kid];
  if (!cert) throw new Error("Unknown Google signing key");
  return jwt.verify(credential, cert, {
    algorithms: ["RS256"],
    audience: clientId,
    issuer: GOOGLE_ISSUERS,
  });
}

function sign(user) {
  return jwt.sign({ uid: user.id, username: user.username }, secret(), {
    expiresIn: "30d",
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

// Middleware: require a valid login cookie.
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "Not logged in" });
  try {
    req.user = jwt.verify(token, secret());
    next();
  } catch {
    res.status(401).json({ error: "Session expired" });
  }
}

// Create or update the single login user (used by the CLI script too).
export async function setUser(username, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = db.users.find((u) => u.username === username);
  if (existing) {
    existing.passwordHash = passwordHash;
  } else {
    db.users.push({
      id: nextId("users"),
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
  }
  save();
}

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  const user = db.users.find((u) => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ error: "Invalid credentials" });

  res.cookie(COOKIE, sign(user), cookieOptions());
  res.json({ username: user.username });
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.json({ user: null });
  try {
    const payload = jwt.verify(token, secret());
    res.json({ user: { username: payload.username } });
  } catch {
    res.json({ user: null });
  }
});

// Public: lets the login page know which Google Client ID to render the button
// with (kept server-side so there's a single source of truth in the .env).
authRouter.get("/config", (req, res) => {
  res.json({ googleClientId: googleClientId() });
});

// Verify a Google ID token and log the user in, creating (or linking) an account.
authRouter.post("/google", async (req, res) => {
  const { credential } = req.body || {};
  if (!credential)
    return res.status(400).json({ error: "Missing Google credential" });

  const clientId = googleClientId();
  if (!clientId)
    return res.status(500).json({ error: "Google sign-in is not configured" });

  let payload;
  try {
    payload = await verifyGoogleIdToken(credential, clientId);
  } catch {
    return res.status(401).json({ error: "Could not verify Google sign-in" });
  }

  if (!payload?.email || !payload.email_verified)
    return res.status(401).json({ error: "Your Google email isn't verified" });

  const sub = payload.sub;
  const email = payload.email.toLowerCase();

  // Match order: known Google id -> same email (link existing account) -> create.
  let user = db.users.find((u) => u.googleSub === sub);
  if (!user) {
    user = db.users.find((u) => (u.email || "").toLowerCase() === email);
    if (user) user.googleSub = sub; // link Google to the existing account
  }
  if (!user) {
    user = {
      id: nextId("users"),
      username: payload.name || email,
      email,
      googleSub: sub,
      provider: "google",
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  }
  if (!user.email) user.email = email;
  save();

  res.cookie(COOKIE, sign(user), cookieOptions());
  res.json({ username: user.username });
});
