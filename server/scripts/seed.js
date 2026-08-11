// Populate sample data so the dashboard isn't empty on first run.
// Usage: node scripts/seed.js
import "dotenv/config";
import { db, save, nextId } from "../src/store.js";

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;

const subs = [
  { name: "Netflix", amount: 13.99, cycle: "monthly" },
  { name: "Spotify", amount: 9.99, cycle: "monthly" },
  { name: "iCloud", amount: 2.99, cycle: "monthly" },
  { name: "Domain + hosting", amount: 60, cycle: "yearly" },
  { name: "Gym", amount: 120, cycle: "quarterly" },
];
for (const s of subs) {
  db.subscriptions.push({
    id: nextId("subscriptions"),
    ...s,
    startDate: now.toISOString(),
    active: true,
    createdAt: now.toISOString(),
  });
}

// Seasonal income: bigger in summer, lean in winter (last 6 months).
const seasonal = [3200, 3600, 2100, 900, 1200, 2800];
for (let i = 0; i < seasonal.length; i++) {
  const d = new Date(year, month - 1 - i, 1);
  db.income.push({
    id: nextId("income"),
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    amount: seasonal[i],
    note: "Seasonal work",
    createdAt: now.toISOString(),
  });
}

const expenses = [
  { day: 3, amount: 450, category: "Rent" },
  { day: 5, amount: 180, category: "Groceries" },
  { day: 9, amount: 60, category: "Fuel" },
  { day: 14, amount: 40, category: "Dining" },
];
for (const e of expenses) {
  db.expenses.push({
    id: nextId("expenses"),
    date: new Date(year, month - 1, e.day).toISOString(),
    amount: e.amount,
    category: e.category,
    note: null,
    createdAt: now.toISOString(),
  });
}

db.netWorthSnapshots.push({
  id: nextId("netWorthSnapshots"),
  date: now.toISOString(),
  balance: 8500,
  createdAt: now.toISOString(),
});

save();
console.log("✔ Sample data seeded.");
