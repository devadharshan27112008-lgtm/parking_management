import { useEffect, useState } from "react";

function LoginForm({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (res.ok) onLoggedIn();
    else setError("Invalid username or password.");
  };

  return (
    <form className="login" onSubmit={submit}>
      <h1>Admin login</h1>
      <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <style jsx>{`
        .login {
          max-width: 320px;
          margin: 80px auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0 20px;
        }
        h1 { color: #f2f5f8; font-size: 20px; margin-bottom: 8px; }
        input {
          padding: 10px 12px;
          border-radius: 7px;
          border: 1px solid #232b35;
          background: #12181f;
          color: #f2f5f8;
          font-size: 14px;
        }
        button {
          padding: 11px;
          border-radius: 7px;
          border: none;
          background: #3b82f6;
          color: white;
          font-weight: 600;
          cursor: pointer;
        }
        button:disabled { opacity: 0.6; cursor: default; }
        .error { color: #f87171; font-size: 13px; margin: 0; }
      `}</style>
    </form>
  );
}

function PricingForm() {
  const [form, setForm] = useState({ base: "", mintime: "", rate: "", unit: "min" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.pricing) {
          setForm({
            base: d.pricing.base,
            mintime: d.pricing.mintime,
            rate: d.pricing.rate,
            unit: d.pricing.unit,
          });
        }
      });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    const res = await fetch("/api/admin/setprice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base: Number(form.base),
        mintime: Number(form.mintime),
        rate: Number(form.rate),
        unit: form.unit,
      }),
    });
    if (res.ok) setSaved(true);
  };

  return (
    <form className="pricing" onSubmit={submit}>
      <h2>Pricing</h2>
      <label>
        Base fee (₹)
        <input type="number" value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} />
      </label>
      <label>
        Minimum time included
        <input type="number" value={form.mintime} onChange={(e) => setForm({ ...form, mintime: e.target.value })} />
      </label>
      <label>
        Rate per unit (₹)
        <input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
      </label>
      <label>
        Unit
        <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
          <option value="sec">seconds</option>
          <option value="min">minutes</option>
          <option value="hr">hours</option>
        </select>
      </label>
      <button>Save pricing</button>
      {saved && <p className="ok">Saved.</p>}
      <style jsx>{`
        .pricing { display: flex; flex-direction: column; gap: 12px; max-width: 320px; }
        h2 { color: #f2f5f8; font-size: 16px; margin: 0; }
        label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #9aa7b5; }
        input, select {
          padding: 9px 10px;
          border-radius: 6px;
          border: 1px solid #232b35;
          background: #0a0d11;
          color: #f2f5f8;
          font-size: 14px;
        }
        button {
          padding: 10px;
          border-radius: 7px;
          border: none;
          background: #3b82f6;
          color: white;
          font-weight: 600;
          cursor: pointer;
        }
        .ok { color: #4ade80; font-size: 13px; margin: 0; }
      `}</style>
    </form>
  );
}

function History() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetch("/api/admin/history")
      .then((r) => r.json())
      .then((d) => setEntries(d.history || []));
  }, []);

  return (
    <div className="history">
      <h2>Recent payments</h2>
      {entries.length === 0 && <p className="empty">No payments recorded yet.</p>}
      {entries.map((e, i) => (
        <div className="entry" key={i}>
          <span>Slot {e.slot}</span>
          <span>₹{e.amount}</span>
          <span className="time">{e.paidAt ? new Date(e.paidAt).toLocaleString() : "-"}</span>
        </div>
      ))}
      <style jsx>{`
        .history { margin-top: 32px; }
        h2 { color: #f2f5f8; font-size: 16px; margin: 0 0 12px; }
        .empty { color: #6b7784; font-size: 13px; }
        .entry {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #1a2029;
          font-size: 13px;
          color: #d5dce3;
        }
        .time { color: #6b7784; }
      `}</style>
    </div>
  );
}

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(null); // null = checking

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setLoggedIn(d.loggedIn));
  }, []);

  const logout = async () => {
    await fetch("/api/admin/logout");
    setLoggedIn(false);
  };

  if (loggedIn === null) return null;

  return (
    <div className="page">
      {!loggedIn ? (
        <LoginForm onLoggedIn={() => setLoggedIn(true)} />
      ) : (
        <div className="dashboard">
          <div className="top">
            <h1>Owner dashboard</h1>
            <button className="logout" onClick={logout}>Log out</button>
          </div>
          <PricingForm />
          <History />
        </div>
      )}

      <style jsx global>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #0a0d11;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
      `}</style>
      <style jsx>{`
        .page { min-height: 100vh; padding: 40px 20px; }
        .dashboard { max-width: 480px; margin: 0 auto; }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        h1 { color: #f2f5f8; font-size: 20px; margin: 0; }
        .logout {
          background: none;
          border: 1px solid #232b35;
          color: #9aa7b5;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
