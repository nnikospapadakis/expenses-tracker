import { Router } from "express";
import { db } from "../store.js";
import { toMonthly } from "../lib.js";

export const reportsRouter = Router();

// Per-month summary for the last N months (default 12), oldest first — current user.
reportsRouter.get("/monthly", (req, res) => {
  const uid = req.user.uid;
  const months = Math.min(Math.max(parseInt(req.query.months) || 12, 1), 60);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const startT = start.getTime();

  const activeSubs = db.subscriptions.filter((s) => s.userId === uid && s.active);
  const subsMonthly = activeSubs.reduce((s, x) => s + toMonthly(x.amount, x.cycle), 0);

  const buckets = [];
  const index = new Map();
  for (let m = 0; m < months; m++) {
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const row = {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString("en", { month: "short", year: "2-digit" }),
      income: 0,
      expenses: 0,
      subs: subsMonthly,
    };
    buckets.push(row);
    index.set(key, row);
  }

  for (const i of db.income) {
    if (i.userId !== uid) continue;
    const row = index.get(`${i.year}-${i.month}`);
    if (row) row.income += i.amount;
  }
  for (const e of db.expenses) {
    if (e.userId !== uid) continue;
    const d = new Date(e.date);
    if (d.getTime() < startT) continue;
    const row = index.get(`${d.getFullYear()}-${d.getMonth() + 1}`);
    if (row) row.expenses += e.amount;
  }
  for (const row of buckets) row.net = row.income - row.expenses - row.subs;

  res.json({ subsMonthly, months: buckets });
});

// Spending grouped by category, optionally within ?from=&to=. Sorted desc — current user.
reportsRouter.get("/categories", (req, res) => {
  const uid = req.user.uid;
  const { from, to } = req.query;
  const fromT = from ? new Date(from).getTime() : null;
  let toT = null;
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    toT = d.getTime();
  }

  const totals = new Map();
  for (const e of db.expenses) {
    if (e.userId !== uid) continue;
    const t = new Date(e.date).getTime();
    if (fromT != null && t < fromT) continue;
    if (toT != null && t > toT) continue;
    const key = e.category || "Uncategorized";
    totals.set(key, (totals.get(key) || 0) + e.amount);
  }
  const rows = [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  res.json({ grandTotal, categories: rows });
});
