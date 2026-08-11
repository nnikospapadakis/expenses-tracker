// Shared helpers.

// Normalize a subscription's cost to a per-month figure so different billing
// cycles can be compared and summed.
export function toMonthly(amount, cycle) {
  switch (cycle) {
    case "weekly":
      return (amount * 52) / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

export const CYCLES = ["weekly", "monthly", "quarterly", "yearly"];

// Coerce a value to a finite number or throw a 400-style error.
export function num(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    const err = new Error(`Invalid number for "${field}"`);
    err.status = 400;
    throw err;
  }
  return n;
}
