import { useEffect, useState } from "react";
import { api, fmt } from "../api.js";

const CYCLES = ["weekly", "monthly", "quarterly", "yearly"];

// Mirror of server-side normalization for a live per-month preview.
function toMonthly(amount, cycle) {
  const a = Number(amount) || 0;
  if (cycle === "weekly") return (a * 52) / 12;
  if (cycle === "quarterly") return a / 3;
  if (cycle === "yearly") return a / 12;
  return a;
}

export default function Subscriptions() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", amount: "", cycle: "monthly" });
  const [error, setError] = useState("");

  const load = () =>
    api.get("/api/subscriptions").then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/subscriptions", {
        name: form.name,
        amount: Number(form.amount),
        cycle: form.cycle,
      });
      setForm({ name: "", amount: "", cycle: "monthly" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(it) {
    await api.put(`/api/subscriptions/${it.id}`, { ...it, active: !it.active });
    load();
  }

  async function remove(id) {
    if (!confirm("Delete this subscription?")) return;
    await api.del(`/api/subscriptions/${id}`);
    load();
  }

  const totalMonthly = items
    .filter((s) => s.active)
    .reduce((sum, s) => sum + toMonthly(s.amount, s.cycle), 0);

  return (
    <div>
      <h2 className="page-title">Subscriptions</h2>
      <div className="card highlight">
        <span className="muted">Total per month (active)</span>
        <span className="big">{fmt(totalMonthly)}</span>
      </div>

      <form className="card form" onSubmit={add}>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Netflix, gym, insurance…"
            required
          />
        </label>
        <div className="row">
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
          <label>
            Billing
            <select
              value={form.cycle}
              onChange={(e) => setForm({ ...form, cycle: e.target.value })}
            >
              {CYCLES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        {form.amount && (
          <div className="muted small">
            ≈ {fmt(toMonthly(form.amount, form.cycle))} / month
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <button className="btn primary">Add subscription</button>
      </form>

      <ul className="list">
        {items.map((it) => (
          <li key={it.id} className={`card list-item ${it.active ? "" : "dim"}`}>
            <div>
              <div className="li-title">{it.name}</div>
              <div className="muted small">
                {fmt(it.amount)} / {it.cycle} · {fmt(toMonthly(it.amount, it.cycle))}/mo
              </div>
            </div>
            <div className="li-right">
              <button className="link-btn" onClick={() => toggle(it)}>
                {it.active ? "Pause" : "Resume"}
              </button>
              <button className="link-btn danger" onClick={() => remove(it.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="muted">No subscriptions yet.</li>}
      </ul>
    </div>
  );
}
