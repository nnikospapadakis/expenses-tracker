import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { api } from "./api.js";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Income from "./pages/Income.jsx";
import Subscriptions from "./pages/Subscriptions.jsx";
import Expenses from "./pages/Expenses.jsx";
import Projection from "./pages/Projection.jsx";
import Reports from "./pages/Reports.jsx";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const location = useLocation();

  async function refreshUser() {
    try {
      const { user } = await api.get("/api/auth/me");
      setUser(user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  if (user === undefined) return <div className="loading">Loading…</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={refreshUser} />} />
        <Route
          path="*"
          element={<Navigate to="/login" replace state={{ from: location }} />}
        />
      </Routes>
    );
  }

  return (
    <Layout user={user} onLogout={() => setUser(null)}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/income" element={<Income />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/projection" element={<Projection />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
