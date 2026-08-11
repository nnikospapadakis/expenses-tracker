import { Router } from "express";
import { db, save, nextId } from "../store.js";
import { num } from "../lib.js";

export const incomeRouter = Router();

// Find a record owned by the current user, or null.
const owned = (list, id, uid) =>
  list.find((x) => x.id === Number(id) && x.userId === uid);

incomeRouter.get("/", (req, res) => {
  const items = db.income
    .filter((i) => i.userId === req.user.uid)
    .sort((a, b) => b.year - a.year || b.month - a.month);
  res.json(items);
});

incomeRouter.post("/", (req, res, next) => {
  try {
    const { year, month, amount, note } = req.body || {};
    const item = {
      id: nextId("income"),
      userId: req.user.uid,
      year: num(year, "year"),
      month: num(month, "month"),
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
    const { year, month, amount, note } = req.body || {};
    item.year = num(year, "year");
    item.month = num(month, "month");
    item.amount = num(amount, "amount");
    item.note = note ?? null;
    save();
    res.json(item);
  } catch (e) {
    next(e);
  }
});

incomeRouter.delete("/:id", (req, res) => {
  const uid = req.user.uid;
  db.income = db.income.filter(
    (x) => !(x.id === Number(req.params.id) && x.userId === uid)
  );
  save();
  res.json({ ok: true });
});
