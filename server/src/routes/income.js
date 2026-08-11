import { Router } from "express";
import { db, save, nextId } from "../store.js";
import { num } from "../lib.js";
import { materializeIncome } from "../recurring.js";

export const incomeRouter = Router();

// Find a record owned by the current user, or null.
const owned = (list, id, uid) =>
  list.find((x) => x.id === Number(id) && x.userId === uid);

incomeRouter.get("/", (req, res) => {
  materializeIncome(req.user.uid);
  const items = db.income
    .filter((i) => i.userId === req.user.uid)
    .sort(
      (a, b) =>
        b.year - a.year ||
        b.month - a.month ||
        new Date(b.date || 0) - new Date(a.date || 0)
    );
  res.json(items);
});

incomeRouter.post("/", (req, res, next) => {
  try {
    const { amount, note } = req.body || {};
    const parts = dateParts(req.body || {});
    const item = {
      id: nextId("income"),
      userId: req.user.uid,
      year: parts.year,
      month: parts.month,
      date: parts.date,
      amount: num(amount, "amount"),
      note: note || null,
      createdAt: new Date().toISOString(),
    };
    db.income.push(item);
    save();
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

incomeRouter.put("/:id", (req, res, next) => {
  try {
    const item = owned(db.income, req.params.id, req.user.uid);
    if (!item) return res.status(404).json({ error: "Not found" });
    const parts = dateParts(req.body || {});
    item.year = parts.year;
    item.month = parts.month;
    item.date = parts.date;
    item.amount = num(req.body?.amount, "amount");
    item.note = req.body?.note ?? null;
    save();
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// Resolve income date fields from either an explicit `date` or year/month.
// An exact date wins and its year/month are derived so the month-based
// dashboard/reports/projection aggregations keep working unchanged.
function dateParts({ date, year, month }) {
  if (date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      const err = new Error("Invalid date");
      err.status = 400;
      throw err;
    }
    return { year: d.getFullYear(), month: d.getMonth() + 1, date: d.toISOString() };
  }
  const y = num(year, "year");
  const m = num(month, "month");
  return { year: y, month: m, date: new Date(y, m - 1, 1).toISOString() };
}

incomeRouter.delete("/:id", (req, res) => {
  const uid = req.user.uid;
  db.income = db.income.filter(
    (x) => !(x.id === Number(req.params.id) && x.userId === uid)
  );
  save();
  res.json({ ok: true });
});
