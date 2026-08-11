import { Router } from "express";
import express from "express";
import { db, save, nextId } from "../store.js";
import { num } from "../lib.js";

export const expensesRouter = Router();

const owned = (list, id, uid) =>
  list.find((x) => x.id === Number(id) && x.userId === uid);

const mine = (req) => db.expenses.filter((e) => e.userId === req.user.uid);

// List expenses, with optional filters: ?category=&from=YYYY-MM-DD&to=YYYY-MM-DD
expensesRouter.get("/", (req, res) => {
  const { category, from, to } = req.query;
  const fromT = from ? new Date(from).getTime() : null;
  const toT = to ? endOfDay(to).getTime() : null;

  const items = mine(req)
    .filter((e) => {
      if (category && e.category !== category) return false;
      const t = new Date(e.date).getTime();
      if (fromT != null && t < fromT) return false;
      if (toT != null && t > toT) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(items);
});

// Distinct categories in use (for filter dropdowns / autocomplete).
expensesRouter.get("/categories", (req, res) => {
  const set = new Set(
    mine(req).map((e) => e.category).filter((c) => c != null && c !== "")
  );
  res.json([...set].sort((a, b) => a.localeCompare(b)));
});

// Export the user's expenses as CSV.
expensesRouter.get("/export", (req, res) => {
  const items = mine(req).sort((a, b) => new Date(b.date) - new Date(a.date));
  const header = "date,amount,category,note";
  const lines = items.map((e) =>
    [
      new Date(e.date).toISOString().slice(0, 10),
      e.amount,
      csvCell(e.category || ""),
      csvCell(e.note || ""),
    ].join(",")
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
  res.send([header, ...lines].join("\n"));
});

// Import expenses from CSV text (columns: date,amount,category,note).
expensesRouter.post("/import", express.text({ type: "*/*", limit: "2mb" }), (req, res, next) => {
  try {
    const rows = parseCSV(req.body || "");
    if (!rows.length) return res.json({ imported: 0 });

    let start = 0;
    const first = rows[0];
    if (first[0] && isNaN(Date.parse(first[0])) && isNaN(Number(first[1])))
      start = 1;

    let imported = 0;
    for (let i = start; i < rows.length; i++) {
      const [date, amount, category, note] = rows[i];
      if (amount == null || amount === "") continue;
      db.expenses.push({
        id: nextId("expenses"),
        userId: req.user.uid,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        amount: Number(amount),
        category: category || null,
        note: note || null,
        createdAt: new Date().toISOString(),
      });
      imported++;
    }
    save();
    res.json({ imported });
  } catch (e) {
    next(e);
  }
});

expensesRouter.post("/", (req, res, next) => {
  try {
    const { date, amount, category, note } = req.body || {};
    const item = {
      id: nextId("expenses"),
      userId: req.user.uid,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      amount: num(amount, "amount"),
      category: category || null,
      note: note || null,
      createdAt: new Date().toISOString(),
    };
    db.expenses.push(item);
    save();
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

expensesRouter.put("/:id", (req, res, next) => {
  try {
    const item = owned(db.expenses, req.params.id, req.user.uid);
    if (!item) return res.status(404).json({ error: "Not found" });
    const { date, amount, category, note } = req.body || {};
    if (date) item.date = new Date(date).toISOString();
    item.amount = num(amount, "amount");
    item.category = category ?? null;
    item.note = note ?? null;
    save();
    res.json(item);
  } catch (e) {
    next(e);
  }
});

expensesRouter.delete("/:id", (req, res) => {
  const uid = req.user.uid;
  db.expenses = db.expenses.filter(
    (x) => !(x.id === Number(req.params.id) && x.userId === uid)
  );
  save();
  res.json({ ok: true });
});

// --- helpers ---
function endOfDay(s) {
  const d = new Date(s);
  d.setHours(23, 59, 59, 999);
  return d;
}

function csvCell(s) {
  const str = String(s);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Minimal RFC-4180-ish CSV parser (handles quotes, commas, newlines).
function parseCSV(text) {
  const rows = [];
  let field = "", row = [], inQ = false;
  const t = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
