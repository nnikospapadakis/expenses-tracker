import { useEffect, useState } from "react";
import { api, fmt } from "../api.js";

const monthName = (m) =>
  new Date(2000, m - 1, 1).toLocaleString("en", { month: "short" });

const now = new Date();

export default function Income() {
  const [items, setItems] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [form, setForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    amount: "",
    note: "",
    repeat: false,
    day: now.getDate(),
  });
  const [error, setError] = useState("");

  const load = () =>
    api.get("/api/income").then(setItems).catch((e) => setError(e.message));
  const loadRecurring = () =>
    api.get("/api/recurring-income").then(setRecurring).catch(() => {});
  useEffect(() => {
    load();
    loadRecurring();
  }, []);

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      if (form.repeat) {
        await api.post("/api/recurring-income", {
          amount: Number(form.amount),
          day: Number(form.day),
          note: form.note,
        });
      } else {
        await api.post("/api/income", {
          year: Number(form.year),
          month: Number(form.month),
          amount: Number(form.amount),
          note: form.note,
        });
      }
      setForm({ ...form, amount: "", note: "" });
      load();
      loadRecurring();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this income entry?")) return;
    await api.del(`/api/income/${id}`);
    load();
  }

  async function toggleRecurring(r) {
    await api.put(`/api/recurring-income/${r.id}`, { active: !r.active });
    loadRecurring();
    load();
  }

  async function removeRecurring(id) {
    if (!confirm("Stop this recurring income? Entries it already added stay.")) return;
    await api.del(`/api/recurring-income/${id}`);
    loadRecurring();
  }

  return (
    <div>
      <h2 className="page-title">Income</h2>
      <p className="muted small">
        Seasonal? Just add each month's actual amount — the dashboard uses it.
      </p>

      <form className="card form" onSubmit={add}>
        {!form.repeat && (
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
          </div>
        )}
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
          {form.repeat && (
            <label>
              Day of month
              <input
                type="number"
                min="1"
                max="31"
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}
                required
              />
            </label>
          )}
        </div>
        <label>
          Note
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="e.g. Salary, rent income…"
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={form.repeat}
            onChange={(e) => setForm({ ...form, repeat: e.target.checked })}
          />
          🔁 Repeat every month
        </label>
        {form.repeat && (
          <div className="muted small">
            Adds {form.amount ? fmt(Number(form.amount)) : "the amount"}{" "}
            automatically on day {form.day} each month (applied whenever the app
            is opened).
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <button className="btn primary">
          {form.repeat ? "Add recurring income" : "Add income"}
        </button>
      </form>

      {recurring.length > 0 && (
        <>
          <div className="muted small section-label">Recurring</div>
          <ul className="list">
            {recurring.map((r) => (
              <li key={r.id} className={`card list-item ${r.active ? "" : "dim"}`}>
                <div>
                  <div className="li-title">{r.note || "Recurring income"}</div>
                  <div className="muted small">
                    {fmt(r.amount)} · day {r.dayOfMonth} each month
                  </div>
                </div>
                <div className="li-right">
                  <button className="link-btn" onClick={() => toggleRecurring(r)}>
                    {r.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    className="link-btn danger"
                    onClick={() => removeRecurring(r.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ul className="list">
        {items.map((it) => (
          <li key={it.id} className="card list-item">
            <div>
              <div className="li-title">
                {it.date
                  ? new Date(it.date).toLocaleDateString()
                  : `${monthName(it.month)} ${it.year}`}
              </div>
              {(it.note || it.recurringId) && (
                <div className="muted small">
                  {it.note}
                  {it.recurringId ? (it.note ? " · 🔁" : "🔁 Recurring") : ""}
                </div>
              )}
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
