import { useEffect, useRef, useState } from "react";
import { api, fmt, API_PREFIX } from "../api.js";
import MonthlyBars from "../components/MonthlyBars.jsx";

const RANGES = [6, 12, 24];

export default function Reports() {
  const [months, setMonths] = useState(12);
  const [monthly, setMonthly] = useState(null);
  const [cats, setCats] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const fileRef = useRef(null);

  function loadAll() {
    api.get(`/api/reports/monthly?months=${months}`).then(setMonthly).catch((e) => setError(e.message));
    api.get("/api/reports/categories").then(setCats).catch((e) => setError(e.message));
  }
  useEffect(loadAll, [months]);

  async function onImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNote("");
    try {
      const text = await file.text();
      const res = await fetch(`${API_PREFIX}/api/expenses/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "text/plain" },
        body: text,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setNote(`Imported ${data.imported} expense${data.imported === 1 ? "" : "s"} ✓`);
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (error) return <div className="error">{error}</div>;
  if (!monthly || !cats) return <div className="loading">Loading…</div>;

  return (
    <div>
      <h2 className="page-title">Reports</h2>

      {/* --- Income vs expenses over time --- */}
      <div className="card">
        <div className="seg">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`seg-btn ${months === r ? "active" : ""}`}
              onClick={() => setMonths(r)}
            >
              {r} mo
            </button>
          ))}
        </div>
        <MonthlyBars data={monthly.months} format={fmt} />
      </div>

      {/* --- Spending by category --- */}
      <div className="card">
        <div className="card-head">
          <h3>Spending by category</h3>
          <span className="muted small">all time · {fmt(cats.grandTotal)}</span>
        </div>
        <div className="breakdown">
          {cats.categories.map((c) => {
            const pct = cats.grandTotal ? (c.total / cats.grandTotal) * 100 : 0;
            return (
              <div className="bd-row" key={c.category}>
                <div className="bd-top">
                  <span>{c.category}</span>
                  <span className="tabular">{fmt(c.total)} · {pct.toFixed(0)}%</span>
                </div>
                <div className="bd-track">
                  <div className="bd-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {cats.categories.length === 0 && <div className="muted">No expenses yet.</div>}
        </div>
      </div>

      {/* --- Monthly summary table --- */}
      <div className="card">
        <div className="card-head"><h3>Monthly summary</h3></div>
        <div className="table-scroll">
          <table className="summary">
            <thead>
              <tr>
                <th>Month</th>
                <th className="num">Income</th>
                <th className="num">Expenses</th>
                <th className="num">Subs</th>
                <th className="num">Net</th>
              </tr>
            </thead>
            <tbody>
              {[...monthly.months].reverse().map((m) => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td className="num">{fmt(m.income)}</td>
                  <td className="num">{fmt(m.expenses)}</td>
                  <td className="num">{fmt(m.subs)}</td>
                  <td className={`num ${m.net >= 0 ? "text-pos" : "text-neg"}`}>
                    {m.net >= 0 ? "+" : ""}{fmt(m.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CSV import / export --- */}
      <div className="card">
        <div className="card-head"><h3>Import / export</h3></div>
        <p className="muted small">
          CSV columns: <code>date,amount,category,note</code>
        </p>
        <div className="io-row">
          <a className="btn ghost" href={`${API_PREFIX}/api/expenses/export`}>Export expenses CSV</a>
          <button
            type="button"
            className="btn ghost"
            onClick={() => fileRef.current?.click()}
          >
            Import expenses CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            hidden
            onChange={onImport}
          />
        </div>
        {note && <div className="muted small">{note}</div>}
      </div>
    </div>
  );
}
