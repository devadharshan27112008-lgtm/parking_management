import { useEffect, useState, useCallback } from "react";

const SLOT_META = {
  1: { label: "Slot A" },
  2: { label: "Slot B" },
};

function useStatus() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("status fetch failed");
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, error, refresh };
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function PaymentModal({ slotNumber, amount, orderId, onClose, onResult }) {
  const [method, setMethod] = useState("card");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [upiId, setUpiId] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [stage, setStage] = useState("form");

  const validate = () => {
    if (method === "card") {
      const digits = card.number.replace(/\s/g, "");
      if (digits.length !== 16) return "Enter a valid 16-digit card number.";
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return "Enter expiry as MM/YY.";
      if (!/^\d{3,4}$/.test(card.cvv)) return "Enter a valid CVV.";
      if (!card.name.trim()) return "Enter the name on the card.";
    } else {
      if (!/^[\w.\-]{2,}@[a-zA-Z]{3,}$/.test(upiId.trim())) {
        return "Enter a valid UPI ID, e.g. name@okhdfcbank.";
      }
    }
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError("");
    setStage("processing");

    await new Promise((r) => setTimeout(r, 1400));

    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "confirm" }),
      });
      const data = await res.json();
      setStage(data.status === "success" ? "success" : "failed");
      onResult(data.status);
    } catch {
      setStage("failed");
      onResult("failed");
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && stage !== "processing" && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span>Slot {slotNumber} · ₹{amount}</span>
          <span className="test-tag">TEST MODE</span>
        </div>

        {stage === "processing" && (
          <div className="status-block">
            <div className="spinner" />
            <p>Processing payment…</p>
          </div>
        )}

        {stage === "success" && (
          <div className="status-block">
            <p className="ok">✓ Payment approved</p>
            <p className="small">Gate will open shortly.</p>
            <button className="close-btn" onClick={onClose}>Close</button>
          </div>
        )}

        {stage === "failed" && (
          <div className="status-block">
            <p className="bad">✕ Payment declined</p>
            <p className="small">No money was involved — this is a simulated result.</p>
            <button className="close-btn" onClick={onClose}>Close</button>
          </div>
        )}

        {stage === "form" && (
          <>
            <div className="tabs">
              <button type="button" className={method === "card" ? "tab active" : "tab"} onClick={() => setMethod("card")}>
                Card
              </button>
              <button type="button" className={method === "upi" ? "tab active" : "tab"} onClick={() => setMethod("upi")}>
                UPI
              </button>
            </div>

            <form onSubmit={submit}>
              {method === "card" ? (
                <>
                  <label>
                    Card number
                    <input
                      inputMode="numeric"
                      placeholder="4111 1111 1111 1111"
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                    />
                  </label>
                  <div className="split">
                    <label>
                      Expiry
                      <input
                        placeholder="MM/YY"
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                      />
                    </label>
                    <label>
                      CVV
                      <input
                        inputMode="numeric"
                        placeholder="123"
                        value={card.cvv}
                        onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      />
                    </label>
                  </div>
                  <label>
                    Name on card
                    <input
                      placeholder="A. Driver"
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value })}
                    />
                  </label>
                </>
              ) : (
                <label>
                  UPI ID
                  <input placeholder="name@okhdfcbank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                </label>
              )}

              {fieldError && <p className="field-error">{fieldError}</p>}

              <button className="submit-btn">Pay ₹{amount}</button>
              <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            </form>
          </>
        )}
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 7, 10, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 20px;
        }
        .modal {
          background: #12181f;
          border: 1px solid #232b35;
          border-radius: 12px;
          padding: 22px;
          width: 100%;
          max-width: 340px;
        }
        .modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          color: #d5dce3;
          margin-bottom: 16px;
        }
        .test-tag {
          font-size: 10px;
          background: #2a2410;
          color: #eab308;
          padding: 2px 8px;
          border-radius: 999px;
          letter-spacing: 0.05em;
          font-weight: 700;
        }
        .tabs {
          display: flex;
          gap: 4px;
          background: #0a0d11;
          border-radius: 8px;
          padding: 3px;
          margin-bottom: 16px;
        }
        .tab {
          flex: 1;
          padding: 8px;
          border: none;
          background: transparent;
          color: #6b7784;
          font-size: 13px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
        }
        .tab.active {
          background: #232b35;
          color: #f2f5f8;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: #9aa7b5;
        }
        input {
          padding: 10px;
          border-radius: 7px;
          border: 1px solid #232b35;
          background: #0a0d11;
          color: #f2f5f8;
          font-size: 14px;
        }
        .split {
          display: flex;
          gap: 10px;
        }
        .split label {
          flex: 1;
        }
        .field-error {
          color: #f87171;
          font-size: 12px;
          margin: 0;
        }
        .submit-btn {
          padding: 11px;
          border-radius: 7px;
          border: none;
          background: #3b82f6;
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }
        .cancel-btn {
          padding: 9px;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: #6b7784;
          font-size: 13px;
          cursor: pointer;
        }
        .status-block {
          text-align: center;
          padding: 20px 0 6px;
        }
        .status-block p {
          margin: 6px 0;
        }
        .ok { color: #4ade80; font-size: 16px; font-weight: 600; }
        .bad { color: #f87171; font-size: 16px; font-weight: 600; }
        .small { color: #6b7784; font-size: 13px; }
        .close-btn {
          margin-top: 12px;
          padding: 9px 18px;
          border-radius: 7px;
          border: 1px solid #232b35;
          background: transparent;
          color: #d5dce3;
          font-size: 13px;
          cursor: pointer;
        }
        .spinner {
          width: 28px;
          height: 28px;
          margin: 0 auto 12px;
          border: 3px solid #232b35;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function SlotCard({ slotNumber, slot, onPaid }) {
  const [modalOrder, setModalOrder] = useState(null);
  const [opening, setOpening] = useState(false);

  const openCheckout = async () => {
    setOpening(true);
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: slotNumber }),
      });
      const data = await res.json();
      setModalOrder(data);
    } finally {
      setOpening(false);
    }
  };

  const occupied = slot.occupied;
  const due = slot.price || 0;
  const needsPayment = occupied && !slot.paid && due > 0;

  return (
    <div className="card">
      <div className="card-head">
        <span className="slot-label">{SLOT_META[slotNumber].label}</span>
        <span className={`badge ${occupied ? "occupied" : "free"}`}>
          {occupied ? "Occupied" : "Free"}
        </span>
      </div>

      <div className="row">
        <span className="row-label">Entry</span>
        <span className="row-value">{slot.entryTime || "-"}</span>
      </div>
      <div className="row">
        <span className="row-label">Exit</span>
        <span className="row-value">{slot.exitTime || "-"}</span>
      </div>
      <div className="row">
        <span className="row-label">Gate</span>
        <span className="row-value">{slot.gateOpen ? "Open" : "Closed"}</span>
      </div>

      <div className="due">
        <span className="due-label">Amount due</span>
        <span className="due-value">₹{due}</span>
      </div>

      {needsPayment && (
        <button className="pay-btn" disabled={opening} onClick={openCheckout}>
          {opening ? "Loading…" : "Pay now (test mode)"}
        </button>
      )}

      {modalOrder && (
        <PaymentModal
          slotNumber={slotNumber}
          amount={modalOrder.amount}
          orderId={modalOrder.orderId}
          onClose={() => setModalOrder(null)}
          onResult={(status) => {
            if (status === "success") onPaid();
          }}
        />
      )}

      <style jsx>{`
        .card {
          background: #12181f;
          border: 1px solid #232b35;
          border-radius: 10px;
          padding: 20px;
          flex: 1;
          min-width: 240px;
        }
        .card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .slot-label {
          font-size: 15px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #9aa7b5;
          font-weight: 600;
        }
        .badge {
          font-size: 12px;
          padding: 3px 10px;
          border-radius: 999px;
          font-weight: 600;
        }
        .badge.free {
          background: #103a2a;
          color: #4ade80;
        }
        .badge.occupied {
          background: #3a1f10;
          color: #fb923c;
        }
        .row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 13px;
        }
        .row-label {
          color: #6b7784;
        }
        .row-value {
          color: #d5dce3;
          font-variant-numeric: tabular-nums;
        }
        .due {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #232b35;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .due-label {
          font-size: 13px;
          color: #6b7784;
        }
        .due-value {
          font-size: 24px;
          font-weight: 700;
          color: #f2f5f8;
        }
        .pay-btn {
          margin-top: 14px;
          width: 100%;
          padding: 11px;
          border-radius: 7px;
          border: none;
          background: #3b82f6;
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }
        .pay-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .msg {
          margin-top: 10px;
          font-size: 13px;
          text-align: center;
        }
        .msg.success {
          color: #4ade80;
        }
        .msg.failed {
          color: #f87171;
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  const { data, error, refresh } = useStatus();

  return (
    <div className="page">
      <header>
        <h1>Smart Parking</h1>
        <p className="sub">Live slot status · test-mode payments</p>
      </header>

      {error && <p className="error">Couldn't reach the server. Retrying…</p>}

      {data ? (
        <div className="grid">
          <SlotCard slotNumber={1} slot={data.slot1} onPaid={refresh} />
          <SlotCard slotNumber={2} slot={data.slot2} onPaid={refresh} />
        </div>
      ) : (
        !error && <p className="loading">Loading status…</p>
      )}

      <footer>
        <a href="/admin">Owner admin →</a>
      </footer>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #0a0d11;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
      `}</style>
      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 40px 20px 60px;
          max-width: 720px;
          margin: 0 auto;
        }
        header {
          margin-bottom: 32px;
        }
        h1 {
          color: #f2f5f8;
          font-size: 26px;
          margin: 0 0 4px;
        }
        .sub {
          color: #6b7784;
          font-size: 14px;
          margin: 0;
        }
        .grid {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .loading, .error {
          color: #6b7784;
          font-size: 14px;
        }
        .error {
          color: #f87171;
        }
        footer {
          margin-top: 40px;
          text-align: center;
        }
        footer a {
          color: #6b7784;
          font-size: 13px;
          text-decoration: none;
        }
        footer a:hover {
          color: #9aa7b5;
        }
      `}</style>
    </div>
  );
}
