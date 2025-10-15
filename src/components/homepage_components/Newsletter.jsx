import { useState } from "react";
import { subscribeNewsletter } from "../../services/newsletter.js";
import { currentScrollY, restoreScroll, pauseSmoother } from "../../utils/scroll.js";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    const prevY = currentScrollY();
    pauseSmoother(true);
    const val = String(email || "").trim();
    if (!val || !val.includes("@")) {
      setErr("Enter a valid email");
      requestAnimationFrame(() => { restoreScroll(prevY); pauseSmoother(false); });
      return;
    }
    setLoading(true);
    try {
      await subscribeNewsletter({ email: val, source: "newsletter-section" });
      setMsg("Subscribed! Check your inbox for updates.");
      setEmail("");
    } catch (e) {
      setErr(e?.message || "Subscription failed. Try again.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => { restoreScroll(prevY); pauseSmoother(false); });
    }
  };

  return (
    <section className="newsletter-section" style={{ overflowAnchor: 'none' }}>
      <div className="newsletter-container">
        <div className="newsletter-left"></div>
        <div className="newsletter-right">
          <h2>Subscribe for exclusive products, new arrivals and to be first on limited Drops</h2>
          <form className="newsletter-form" onSubmit={onSubmit}>
            <input
              type="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => pauseSmoother(true)}
              onBlur={() => pauseSmoother(false)}
              aria-invalid={!!err}
              aria-describedby={err ? "newsletter-error" : undefined}
            />
            <button type="submit" disabled={loading}
              onMouseDown={(ev) => { /* prevent anchor scroll jump on some browsers */ ev.preventDefault(); }}
            >{loading ? "Subscribing…" : "Subscribe"}</button>
          </form>
          {msg && <p role="status" style={{ color: '#1aa34a', marginTop: 8 }}>{msg}</p>}
          {err && <p id="newsletter-error" role="alert" style={{ color: '#d33', marginTop: 8 }}>{err}</p>}
          <p>Get the latest updates and exclusive offers.</p>
        </div>
      </div>
    </section>
  );
}
