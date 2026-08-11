import { Router } from "express";
import { db, save, nextId } from "../store.js";

export const categoriesRouter = Router();

// Seeded for each user the first time they have no categories. These are marked
// isDefault so the UI can protect them from deletion while still letting users
// add and remove their own.
const DEFAULTS = [
  { emoji: "🛒", label: "Supermarket" },
  { emoji: "🏥", label: "Health" },
  { emoji: "🛍️", label: "Shopping" },
  { emoji: "🍔", label: "Eating out" },
  { emoji: "⛽", label: "Fuel" },
  { emoji: "🏠", label: "Rent" },
  { emoji: "💡", label: "Bills" },
  { emoji: "🚌", label: "Transport" },
];

const mine = (req) => db.categories.filter((c) => c.userId === req.user.uid);
const byLabel = (a, b) => a.label.localeCompare(b.label);

function seedDefaults(uid) {
  const created = DEFAULTS.map((d) => ({
    id: nextId("categories"),
    userId: uid,
    emoji: d.emoji,
    label: d.label,
    isDefault: true,
    createdAt: new Date().toISOString(),
  }));
  db.categories.push(...created);
  save();
  return created;
}

categoriesRouter.get("/", (req, res) => {
  let items = mine(req);
  if (items.length === 0) items = seedDefaults(req.user.uid);
  res.json(items.sort(byLabel));
});

categoriesRouter.post("/", (req, res, next) => {
  try {
    const { emoji, label } = req.body || {};
    const clean = (label || "").trim();
    if (!clean) {
      const err = new Error("Category name is required");
      err.status = 400;
      throw err;
    }
    // Dedupe case-insensitively per user.
    if (mine(req).some((c) => c.label.toLowerCase() === clean.toLowerCase())) {
      const err = new Error("That category already exists");
      err.status = 400;
      throw err;
    }
    const item = {
      id: nextId("categories"),
      userId: req.user.uid,
      emoji: (emoji || "").trim() || "🏷️",
      label: clean,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    db.categories.push(item);
    save();
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

categoriesRouter.delete("/:id", (req, res) => {
  const uid = req.user.uid;
  db.categories = db.categories.filter(
    (x) => !(x.id === Number(req.params.id) && x.userId === uid)
  );
  save();
  res.json({ ok: true });
});
