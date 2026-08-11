import { useEffect, useState } from "react";
import { api, fmt } from "../api.js";

const monthName = (m) =>
  new Date(2000, m - 1, 1).toLocaleString("en", { month: "long" });

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/dashboard").then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="loading">Loading…</div>;

  const netPositive = data.currentMonthNetAfterSubs >= 0;

  return (
    <div>
      <h2 className="page-title">
        {monthName(data.period.month)} {data.period.year}
      </h2>

      <div className="grid">
        <Stat label="Income this month" value={fmt(data.currentMonthIncome)} />
        <Stat
          label="Expenses this month"
          value={fmt(data.currentMonthExpenses)}
        />
        <Stat
          label="Subscriptions / mo"
          value={fmt(data.monthlySubscriptionCost)}
          sub={`${data.subscriptionCount} active`}
        />
        <Stat
          label="Net worth"
          value={data.currentNetWorth == null ? "—" : fmt(data.currentNetWorth)}
        />
      </div>

      <div className={`card balance ${netPositive ? "good" : "bad"}`}>
        <div className="muted">Left after expenses + subscriptions</div>
        <div className="balance-value">
          {fmt(data.currentMonthNetAfterSubs)}
        </div>
        <div className="muted small">
          {fmt(data.currentMonthIncome)} income −{" "}
          {fmt(data.currentMonthExpenses)} expenses −{" "}
          {fmt(data.monthlySubscriptionCost)} subscriptions
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}
