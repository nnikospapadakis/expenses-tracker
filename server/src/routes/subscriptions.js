import { Router } from "express";
import { db, save, nextId } from "../store.js";
import { num, CYCLES } from "../lib.js";

export const subscriptionsRouter = Router();

const owned = (list, id, uid) =>
  list.find((x) => x.id === Number(id) && x.userId === uid);

function parseCycle(cycle) {
  if (!CYCLES.includes(cycle)) {
    const err = new Error(`cycle must be one of: ${CYCLES.join(", ")}`);
    err.status = 400;
    throw err;
  }
  return cycle;
}

subscriptionsRouter.get("/", (req, res) => {
  const items = db.subscriptions
    .filter((s) => s.userId === req.user.uid)
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(items);
});

subscriptionsRouter.post("/", (req, res, next) => {
  try {
    const { name, amount, cycle, startDate, active } = req.body || {};
    if (!name) return res.status(400).json({ error: "name required" });
    const item = {
      id: nextId("subscriptions"),
      userId: req.user.uid,
      name,
      amount: num(amount, "amount"),
      cycle: parseCycle(cycle),
      startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      active: active !== false,
      createdAt: new Date().toISOString(),
    };
    db.subscriptions.push(item);
    save();
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

subscriptionsRouter.put("/:id", (req, res, next) => {
  try {
    const item = owned(db.subscriptions, req.params.id, req.user.uid);
    if (!item) return res.status(404).json({ error: "Not found" });
    const { name, amount, cycle, startDate, active } = req.body || {};
    item.name = name;
    item.amount = num(amount, "amount");
    item.cycle = parseCycle(cycle);
    if (startDate) item.startDate = new Date(startDate).toISOString();
    item.active = active !== false;
    save();
    res.json(item);
  } catch (e) {
    next(e);
  }
});

subscriptionsRouter.delete("/:id", (req, res) => {
  const uid = req.user.uid;
  db.subscriptions = db.subscriptions.filter(
    (x) => !(x.id === Number(req.params.id) && x.userId === uid)
  );
  save();
  res.json({ ok: true });
});
