import { Router } from "express";
import { db } from "../store.js";
import { toMonthly } from "../lib.js";

export const dashboardRouter = Router();

// Aggregated numbers for the dashboard "at a glance" view (current user only).
dashboardRouter.get("/", (req, res) => {
  const uid = req.user.uid;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const monthStart = new Date(year, month - 1, 1).getTime();
  const monthEnd = new Date(year, month, 1).getTime();

  const activeSubs = db.subscriptions.filter((s) => s.userId === uid && s.active);
  const monthlySubscriptionCost = activeSubs.reduce(
    (sum, s) => sum + toMonthly(s.amount, s.cycle),
    0
  );

  const currentMonthIncome = db.income
    .filter((i) => i.userId === uid && i.year === year && i.month === month)
    .reduce((s, i) => s + i.amount, 0);

  const currentMonthExpenses = db.expenses
    .filter((e) => {
      if (e.userId !== uid) return false;
      const t = new Date(e.date).getTime();
      return t >= monthStart && t < monthEnd;
    })
    .reduce((s, e) => s + e.amount, 0);

  const latestSnapshot = db.netWorthSnapshots
    .filter((n) => n.userId === uid)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  res.json({
    period: { year, month },
    monthlySubscriptionCost,
    subscriptionCount: activeSubs.length,
    currentMonthIncome,
    currentMonthExpenses,
    currentMonthNet: currentMonthIncome - currentMonthExpenses,
    currentMonthNetAfterSubs:
      currentMonthIncome - currentMonthExpenses - monthlySubscriptionCost,
    currentNetWorth: latestSnapshot ? latestSnapshot.balance : null,
  });
});
