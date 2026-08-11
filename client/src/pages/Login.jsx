import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function Login({ onLogin }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    // Google hands us a signed credential (ID token); send it to the server,
    // which verifies it and sets our login cookie.
    async function handleCredential(response) {
      setError("");
      setBusy(true);
      try {
        await api.post("/api/auth/google", { credential: response.credential });
        await onLogin();
        navigate("/");
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setBusy(false);
        }
      }
    }

    async function init() {
      let clientId;
      try {
        ({ googleClientId: clientId } = await api.get("/api/auth/config"));
      } catch {
        if (!cancelled) setError("Couldn't reach the server. Please try again.");
        return;
      }
      if (!clientId) {
        if (!cancelled) setError("Google sign-in isn't configured yet.");
        return;
      }

      // The GSI script loads async (see index.html); wait for it to be ready.
      const start = Date.now();
      while (!window.google?.accounts?.id) {
        if (cancelled) return;
        if (Date.now() - start > 10000) {
          setError("Google sign-in failed to load. Check your connection.");
          return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      if (cancelled || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
      });
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "filled_blue",
        size: "large",
        text: "signin_with",
        shape: "pill",
        width: 320,
      });
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [onLogin, navigate]);

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>Expenses Tracker</h1>
        <p className="muted">Sign in to continue</p>
        <div ref={buttonRef} className="google-btn" />
        {busy && <p className="muted signing-in">Signing in…</p>}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
