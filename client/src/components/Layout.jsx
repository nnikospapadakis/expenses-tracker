import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api.js";

const tabs = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/income", label: "Income", icon: "💶" },
  { to: "/subscriptions", label: "Subs", icon: "🔁" },
  { to: "/expenses", label: "Expenses", icon: "🧾" },
  { to: "/projection", label: "Forecast", icon: "📈" },
  { to: "/reports", label: "Reports", icon: "📅" },
];

export default function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();

  async function logout() {
    await api.post("/api/auth/logout");
    onLogout();
    navigate("/login");
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Expenses Tracker</span>
        <span className="topbar-right">
          <span className="username">{user.username}</span>
          <button className="link-btn" onClick={logout}>Logout</button>
        </span>
      </header>

      <main className="content">{children}</main>

      <nav className="bottomnav">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className="navitem">
            <span className="navicon">{t.icon}</span>
            <span className="navlabel">{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
