import { useEffect, useState } from "react";
import { api, fmt } from "../api.js";

const today = () => new Date().toISOString().slice(0, 10);

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    date: today(),
    amount: "",
    category: "",
    note: "",
  });
  const [filter, setFilter] = useState({ category: "", from: "", to: "" });
  const [error, setError] = useState("");

  const loadCategories = () =>
    api.get("/api/expenses/categories").then(setCategories).catch(() => {});

  function load() {
    const qs = new URLSearchParams();
    if (filter.category) qs.set("category", filter.category);
    if (filter.from) qs.set("from", filter.from);
    if (filter.to) qs.set("to", filter.to);
    const q = qs.toString();
    api
      .get(`/api/expenses${q ? `?${q}` : ""}`)
      .then(setItems)
      .catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, [filter]);
  useEffect(() => { loadCategories(); }, []);

  const total = items.reduce((s, e) => s + e.amount, 0);
  const filtering = filter.category || filter.from || filter.to;

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/expenses", {
        date: form.date,
        amount: Number(form.amount),
        category: form.category,
        note: form.note,
      });
      setForm({ date: today(), amount: "", category: "", note: "" });
      load();
      loadCategories();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this expense?")) return;
    await api.del(`/api/expenses/${id}`);
    load();
  }

  return (
    <div>
      <h2 className="page-title">Expenses</h2>

      <form className="card form" onSubmit={add}>
        <div className="row">
          <label>
            Date
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            Amount (€)
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="row">
          <label>
            Category
            <input
              list="cat-options"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Groceries, rent, fuel…"
            />
          </label>
          <label>
            Note
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn primary">Add expense</button>
      </form>

      {/* shared category suggestions for both the form and the filter */}
      <datalist id="cat-options">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* --- Filters --- */}
      <div className="card form filters">
        <div className="row">
          <label>
            Category
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              value={filter.from}
              onChange={(e) => setFilter({ ...filter, from: e.target.value })}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filter.to}
              onChange={(e) => setFilter({ ...filter, to: e.target.value })}
            />
          </label>
        </div>
        <div className="filter-summary">
          <span className="muted small">
            {items.length} item{items.length === 1 ? "" : "s"} · {fmt(total)}
          </span>
          {filtering && (
            <button
              type="button"
              className="link-btn"
              onClick={() => setFilter({ category: "", from: "", to: "" })}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <ul className="list">
        {items.map((it) => (
          <li key={it.id} className="card list-item">
            <div>
              <div className="li-title">
                {it.category || "Uncategorized"}
              </div>
              <div className="muted small">
                {new Date(it.date).toLocaleDateString()}
                {it.note ? ` · ${it.note}` : ""}
              </div>
            </div>
            <div className="li-right">
              <span className="amount neg">−{fmt(it.amount)}</span>
              <button className="link-btn danger" onClick={() => remove(it.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="muted">No expenses match.</li>}
      </ul>
    </div>
  );
}
