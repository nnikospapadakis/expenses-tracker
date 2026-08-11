import { Router } from "express";
import { db, save, nextId } from "../store.js";
import { num } from "../lib.js";
import { materializeIncome } from "../recurring.js";

export const recurringIncomeRouter = Router();

const owned = (list, id, uid) =>
  list.find((x) => x.id === Number(id) && x.userId === uid);

const mine = (req) =>
  db.recurringIncome
    .filter((r) => r.userId === req.user.uid)
    .sort((a, b) => a.dayOfMonth - b.dayOfMonth);

function dayOfMonth(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 31) {
    const err = new Error("Day of month must be between 1 and 31");
    err.status = 400;
    throw err;
  }
  return n;
}

recurringIncomeRouter.get("/", (req, res) => {
  materializeIncome(req.user.uid);
  res.json(mine(req));
});

recurringIncomeRouter.post("/", (req, res, next) => {
  try {
    const { amount, note, day, active } = req.body || {};
    const now = new Date();
    const item = {
      id: nextId("recurringIncome"),
      userId: req.user.uid,
      amount: num(amount, "amount"),
      dayOfMonth: dayOfMonth(day),
      note: note || null,
      active: active !== false,
      startYear: now.getFullYear(),
      startMonth: now.getMonth() + 1,
      lastYear: null,
      lastMonth: null,
      createdAt: new Date().toISOString(),
    };
    db.recurringIncome.push(item);
    save();
    materializeIncome(req.user.uid); // create this month's entry if already due
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

recurringIncomeRouter.put("/:id", (req, res, next) => {
  try {
    const item = owned(db.recurringIncome, req.params.id, req.user.uid);
    if (!item) return res.status(404).json({ error: "Not found" });
    const { amount, note, day, active } = req.body || {};
    if (amount !== undefined) item.amount = num(amount, "amount");
    if (day !== undefined) item.dayOfMonth = dayOfMonth(day);
    if (note !== undefined) item.note = note || null;
    if (active !== undefined) item.active = active !== false;
    save();
    materializeIncome(req.user.uid);
    res.json(item);
  } catch (e) {
    next(e);
  }
});

recurringIncomeRouter.delete("/:id", (req, res) => {
  const uid = req.user.uid;
  db.recurringIncome = db.recurringIncome.filter(
    (x) => !(x.id === Number(req.params.id) && x.userId === uid)
  );
  save();
  res.json({ ok: true });
});
