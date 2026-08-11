import { useEffect, useState } from "react";
import { api, fmt } from "../api.js";

const monthName = (m) =>
  new Date(2000, m - 1, 1).toLocaleString("en", { month: "short" });

const now = new Date();

export default function Income() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    amount: "",
    note: "",
  });
  const [error, setError] = useState("");

  const load = () => api.get("/api/income").then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/income", {
        year: Number(form.year),
        month: Number(form.month),
        amount: Number(form.amount),
        note: form.note,
      });
      setForm({ ...form, amount: "", note: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this income entry?")) return;
    await api.del(`/api/income/${id}`);
    load();
  }

  return (
    <div>
      <h2 className="page-title">Income</h2>
      <p className="muted small">
        Seasonal? Just add each month's actual amount — the dashboard uses it.
      </p>

      <form className="card form" onSubmit={add}>
        <div className="row">
          <label>
            Month
            <select
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{monthName(m)}</option>
              ))}
            </select>
          </label>
          <label>
            Year
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
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
        <label>
          Note
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="e.g. Summer job, tips…"
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary">Add income</button>
      </form>

      <ul className="list">
        {items.map((it) => (
          <li key={it.id} className="card list-item">
            <div>
              <div className="li-title">
                {monthName(it.month)} {it.year}
              </div>
              {it.note && <div className="muted small">{it.note}</div>}
            </div>
            <div className="li-right">
              <span className="amount pos">{fmt(it.amount)}</span>
              <button className="link-btn danger" onClick={() => remove(it.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="muted">No income yet.</li>}
      </ul>
    </div>
  );
}
