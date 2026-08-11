// Turns recurring-income templates into real income records for every month
// that is now due. This host has no background scheduler, so we "catch up"
// lazily whenever the app is used. It's safe to run repeatedly: each generated
// month advances the template's lastYear/lastMonth cursor, so nothing is
// created twice.
import { db, save, nextId } from "./store.js";

const nextMonth = (y, m) => (m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 });
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

export function materializeIncome(uid) {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const curD = now.getDate();
  let changed = false;

  for (const r of db.recurringIncome) {
    if (r.userId !== uid || !r.active) continue;

    // Start at the month after the last one generated, or at the template's
    // start month if it has never run.
    let { y, m } =
      r.lastYear && r.lastMonth
        ? nextMonth(r.lastYear, r.lastMonth)
        : { y: r.startYear, m: r.startMonth };

    while (y < curY || (y === curY && m <= curM)) {
      const dueDay = Math.min(r.dayOfMonth, daysInMonth(y, m));
      // In the current month, only add once the chosen day has arrived.
      if (y === curY && m === curM && curD < dueDay) break;

      db.income.push({
        id: nextId("income"),
        userId: uid,
        year: y,
        month: m,
        date: new Date(y, m - 1, dueDay).toISOString(),
        amount: r.amount,
        note: r.note || null,
        recurringId: r.id,
        createdAt: new Date().toISOString(),
      });
      r.lastYear = y;
      r.lastMonth = m;
      changed = true;
      ({ y, m } = nextMonth(y, m));
    }
  }

  if (changed) save();
  return changed;
}
