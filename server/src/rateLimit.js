// Tiny in-memory rate limiter — no dependency, in keeping with the app's
// zero-native-deps design. Fixed window per (name, client IP). State lives in
// memory, so it's per-process and resets on restart; that's fine for this
// single-instance app and is only meant as light abuse protection, not a WAF.
const buckets = new Map();

// Sweep expired buckets so the Map can't grow unbounded. unref() so this timer
// never keeps the process alive on its own.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now >= b.reset) buckets.delete(k);
}, 60_000).unref();

// Client IP. With `app.set("trust proxy", true)`, req.ip resolves to the real
// client via X-Forwarded-For (set by the cPanel/LiteSpeed proxy); falls back to
// the socket address in plain local runs.
const clientIp = (req) => req.ip || req.socket?.remoteAddress || "unknown";

export function rateLimit({ windowMs, max, name = "rl", skipGet = false, message }) {
  const msg = message || "Too many requests — please slow down and try again shortly.";
  return (req, res, next) => {
    if (skipGet && (req.method === "GET" || req.method === "HEAD")) return next();

    const key = `${name}|${clientIp(req)}`;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || now >= b.reset) {
      b = { count: 0, reset: now + windowMs };
      buckets.set(key, b);
    }
    b.count++;

    if (b.count > max) {
      res.setHeader("Retry-After", Math.ceil((b.reset - now) / 1000));
      return res.status(429).json({ error: msg });
    }
    next();
  };
}
