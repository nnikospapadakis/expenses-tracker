import { useEffect, useMemo, useState } from "react";
import { api, fmt } from "../api.js";
import NetWorthChart from "../components/NetWorthChart.jsx";

const HORIZONS = [6, 12, 24];
const monthLabel = (d) =>
  d.toLocaleString("en", { month: "short", year: "2-digit" });

export default function Projection() {
  const [base, setBase] = useState(null);
  const [error, setError] = useState("");

  // Adjustable assumptions (seeded from historical averages once loaded).
  const [startBalance, setStartBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [horizon, setHorizon] = useState(12);
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    api
      .get("/api/projection")
      .then((b) => {
        setBase(b);
        setStartBalance(round(b.startingBalance));
        setIncome(round(b.avgMonthlyIncome));
        setExpenses(round(b.avgMonthlyExpenses));
      })
      .catch((e) => setError(e.message));
  }, []);

  const subs = base?.monthlySubscriptions || 0;
  const monthlyNet = income - expenses - subs;

  const series = useMemo(() => {
    const out = [];
    const now = new Date();
    for (let m = 0; m <= horizon; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
      out.push({ label: monthLabel(d), value: startBalance + m * monthlyNet });
    }
    return out;
  }, [startBalance, monthlyNet, horizon]);

  const endBalance = series[series.length - 1]?.value ?? startBalance;

  async function saveNetWorth() {
    setError("");
    try {
      await api.post("/api/projection/networth", { balance: Number(startBalance) });
      setSavedNote("Saved as current net worth ✓");
      setTimeout(() => setSavedNote(""), 2500);
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="error">{error}</div>;
  if (!base) return <div className="loading">Loading…</div>;

  return (
    <div>
      <h2 className="page-title">Net-worth projection</h2>

      <div className="card">
        <NetWorthChart data={series} format={fmt} />
      </div>

      <div className="grid">
        <div className="card stat">
          <div className="stat-label">Monthly net</div>
          <div className={`stat-value ${monthlyNet >= 0 ? "text-pos" : "text-neg"}`}>
            {monthlyNet >= 0 ? "+" : ""}{fmt(monthlyNet)}
          </div>
          <div className="muted small">income − expenses − subs</div>
        </div>
        <div className="card stat">
          <div className="stat-label">In {horizon} months</div>
          <div className={`stat-value ${endBalance >= startBalance ? "text-pos" : "text-neg"}`}>
            {fmt(endBalance)}
          </div>
          <div className="muted small">
            {endBalance >= startBalance ? "+" : ""}{fmt(endBalance - startBalance)}
          </div>
        </div>
      </div>

      <div className="card form">
        <div className="seg">
          {HORIZONS.map((hh) => (
            <button
              key={hh}
              type="button"
              className={`seg-btn ${horizon === hh ? "active" : ""}`}
              onClick={() => setHorizon(hh)}
            >
              {hh} mo
            </button>
          ))}
        </div>

        <Slider
          label="Current net worth"
          value={startBalance}
          onChange={setStartBalance}
          min={roundDown(Math.min(0, base.startingBalance))}
          max={Math.max(20000, Math.round(base.startingBalance * 2))}
          step={100}
        />
        <div className="save-row">
          <button type="button" className="link-btn" onClick={saveNetWorth}>
            Save this as my current net worth
          </button>
          {savedNote && <span className="muted small">{savedNote}</span>}
        </div>

        <Slider
          label="Assumed monthly income"
          hint={`avg of your data: ${fmt(base.avgMonthlyIncome)} · ${base.monthsOfIncomeData} mo`}
          value={income}
          onChange={setIncome}
          min={0}
          max={Math.max(5000, Math.round(base.avgMonthlyIncome * 2))}
          step={50}
        />
        <Slider
          label="Assumed monthly expenses"
          hint={`avg of your data: ${fmt(base.avgMonthlyExpenses)} · ${base.monthsOfExpenseData} mo`}
          value={expenses}
          onChange={setExpenses}
          min={0}
          max={Math.max(3000, Math.round(base.avgMonthlyExpenses * 2))}
          step={50}
        />

        <div className="muted small subs-line">
          + fixed subscriptions {fmt(subs)}/mo (from your Subscriptions list)
        </div>
      </div>
    </div>
  );
}

function Slider({ label, hint, value, onChange, min, max, step }) {
  return (
    <label className="slider">
      <div className="slider-top">
        <span>{label}</span>
        <input
          type="number"
          className="slider-num"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(value, min, max)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <div className="muted small">{hint}</div>}
    </label>
  );
}

const round = (n) => Math.round(n);
const roundDown = (n) => Math.floor(n / 100) * 100;
const clamp = (n, a, b) => Math.min(Math.max(n, a), b);
