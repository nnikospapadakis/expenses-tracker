import { useEffect, useState } from "react";
import { api, fmt } from "../api.js";
import Numpad from "./Numpad.jsx";
import CategoryPicker from "./CategoryPicker.jsx";

// Dashboard "quick add" card. Adds an expense or income in a couple of taps.
// The transaction date is always today for both types.
export default function QuickTransaction({ onAdded }) {
  const [type, setType] = useState("expense"); // "expense" | "income"
  const [amount, setAmount] = useState(""); // raw string from the numpad
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isIncome = type === "income";

  const loadCategories = () =>
    api.get("/api/categories").then(setCategories).catch(() => {});
  useEffect(() => {
    loadCategories();
  }, []);

  function reset() {
    setAmount("");
    setCategory("");
    setNote("");
    setError("");
  }

  async function createCategory(data) {
    setError("");
    try {
      await api.post("/api/categories", data);
      loadCategories();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteCategory(c) {
    if (!confirm(`Delete "${c.label}"? Past expenses keep their label.`)) return;
    try {
      await api.del(`/api/categories/${c.id}`);
      if (category === c.label) setCategory("");
      loadCategories();
    } catch (e) {
      setError(e.message);
    }
  }

  async function submit() {
    setError("");
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setSaving(true);
    const date = new Date().toISOString(); // always today
    try {
      if (isIncome) {
        await api.post("/api/income", { date, amount: value, note: note || null });
      } else {
        await api.post("/api/expenses", {
          date,
          amount: value,
          category: category || null,
          note: note || null,
        });
      }
      reset();
      onAdded?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card quick">
      <div className="seg">
        <button
          type="button"
          className={`seg-btn ${!isIncome ? "active neg" : ""}`}
          aria-pressed={!isIncome}
          onClick={() => setType("expense")}
        >
          − Expense
        </button>
        <button
          type="button"
          className={`seg-btn ${isIncome ? "active pos" : ""}`}
          aria-pressed={isIncome}
          onClick={() => setType("income")}
        >
          + Income
        </button>
      </div>

      <div
        className={`amount-display ${isIncome ? "pos" : "neg"}`}
        aria-live="polite"
      >
        {isIncome ? "+" : "−"} {fmt(Number(amount) || 0)}
      </div>

      <Numpad value={amount} onChange={setAmount} />

      {!isIncome && (
        <CategoryPicker
          categories={categories}
          value={category}
          onSelect={setCategory}
          onCreate={createCategory}
          onDelete={deleteCategory}
        />
      )}

      <input
        className="quick-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        aria-label="Note"
      />

      {error && <div className="error">{error}</div>}

      <button className="btn primary" onClick={submit} disabled={saving}>
        {saving ? "Saving…" : isIncome ? "Add income" : "Add expense"}
      </button>
    </div>
  );
}
