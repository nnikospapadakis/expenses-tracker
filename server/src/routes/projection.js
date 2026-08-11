import { Router } from "express";
import { db, save, nextId } from "../store.js";
import { toMonthly, num } from "../lib.js";

export const projectionRouter = Router();

// Base figures for the projection (current user only).
projectionRouter.get("/", (req, res) => {
  const uid = req.user.uid;

  const activeSubs = db.subscriptions.filter((s) => s.userId === uid && s.active);
  const monthlySubscriptions = activeSubs.reduce(
    (sum, s) => sum + toMonthly(s.amount, s.cycle),
    0
  );

  const incomeByMonth = new Map();
  for (const i of db.income) {
    if (i.userId !== uid) continue;
    const key = `${i.year}-${i.month}`;
    incomeByMonth.set(key, (incomeByMonth.get(key) || 0) + i.amount);
  }
  const avgMonthlyIncome = average([...incomeByMonth.values()]);

  const expenseByMonth = new Map();
  for (const e of db.expenses) {
    if (e.userId !== uid) continue;
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    expenseByMonth.set(key, (expenseByMonth.get(key) || 0) + e.amount);
  }
  const avgMonthlyExpenses = average([...expenseByMonth.values()]);

  const latestSnapshot = db.netWorthSnapshots
    .filter((n) => n.userId === uid)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  res.json({
    startingBalance: latestSnapshot ? latestSnapshot.balance : 0,
    startingBalanceDate: latestSnapshot ? latestSnapshot.date : null,
    avgMonthlyIncome,
    monthlySubscriptions,
    avgMonthlyExpenses,
    monthsOfIncomeData: incomeByMonth.size,
    monthsOfExpenseData: expenseByMonth.size,
  });
});

// Record / update current net worth (starting point for projections).
projectionRouter.post("/networth", (req, res, next) => {
  try {
    const balance = num(req.body?.balance, "balance");
    const snapshot = {
      id: nextId("netWorthSnapshots"),
      userId: req.user.uid,
      balance,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.netWorthSnapshots.push(snapshot);
    save();
    res.status(201).json(snapshot);
  } catch (e) {
    next(e);
  }
});

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
