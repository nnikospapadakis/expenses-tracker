import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

import { authRouter, requireAuth } from "./auth.js";
import { incomeRouter } from "./routes/income.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { expensesRouter } from "./routes/expenses.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { projectionRouter } from "./routes/projection.js";
import { reportsRouter } from "./routes/reports.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(cookieParser());

// --- API ---
// All API routes live on one router, mounted under both "/api" and
// "/tracker/api". The app is served under the /tracker subpath in production;
// depending on how the host (LiteSpeed/Passenger) routes it, the app may see
// the path with or without the "/tracker" prefix — mounting both covers both.
const apiRouter = express.Router();
apiRouter.get("/health", (req, res) => res.json({ ok: true }));
apiRouter.use("/auth", authRouter);
apiRouter.use("/income", requireAuth, incomeRouter);
apiRouter.use("/subscriptions", requireAuth, subscriptionsRouter);
apiRouter.use("/expenses", requireAuth, expensesRouter);
apiRouter.use("/dashboard", requireAuth, dashboardRouter);
apiRouter.use("/projection", requireAuth, projectionRouter);
apiRouter.use("/reports", requireAuth, reportsRouter);

app.use("/api", apiRouter);
app.use("/tracker/api", apiRouter);

// --- Serve built client in production ---
// Prefer server/public (self-contained deploy, e.g. cPanel); fall back to the
// sibling client/dist during a local production test.
const publicDir = [
  path.resolve(__dirname, "../public"),
  path.resolve(__dirname, "../../client/dist"),
].find((p) => existsSync(p));

if (publicDir) {
  app.use(express.static(publicDir));
  app.use("/tracker", express.static(publicDir));
  // SPA fallback: send index.html for any non-API GET (root or /tracker).
  app.get(/^(?!\/(api|tracker\/api)).*/, (req, res) =>
    res.sendFile(path.join(publicDir, "index.html"))
  );
}

// --- Error handler ---
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
