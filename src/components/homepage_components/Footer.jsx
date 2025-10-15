import { useState } from "react";
import { Link } from "react-router-dom";
import "./footer.css";
import { subscribeNewsletter } from "../../services/newsletter.js";
import { currentScrollY, restoreScroll, pauseSmoother } from "../../utils/scroll.js";

export default function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    const prevY = currentScrollY();
    pauseSmoother(true);
    const val = String(email || "").trim();
    if (!val || !val.includes("@")) { setErr("Enter a valid email"); requestAnimationFrame(() => { restoreScroll(prevY); pauseSmoother(false); }); return; }
    setLoading(true);
    try {
      await subscribeNewsletter({ email: val, source: "footer" });
      setMsg("Thanks for subscribing!");
      setEmail("");
    } catch (e) {
      setErr(e?.message || "Could not subscribe. Try again.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => { restoreScroll(prevY); pauseSmoother(false); });
    }
  };

  return (
    <footer className="rh-footer">
      <div className="rh-container">
        {/* Brand */}
        <div className="rh-brand">
          <Link to="/" aria-label="Megance home" className="rh-logo-group">
                      <img src="/assets/logo.svg" alt="Megance M" style={{paddingBottom:"20px"}} className="rh-m-logo" />
            <img src="/assets/imgs/megance_logo_b.svg" alt="Megance" className="rh-big-logo" />
          </Link>
        </div>
        <div className="rh-divider" />

        {/* Newsletter */}
        <div className="rh-newsletter">
          <div className="rh-news-text">
            <h4>Be the first to know</h4>
            <p>Sign up to receive updates on drops, restocks and more.</p>
          </div>
          <form className="rh-news-form" onSubmit={onSubmit} aria-label="Newsletter signup">
            <input
              type="email"
              placeholder="Enter your email"
              aria-label="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => pauseSmoother(true)}
              onBlur={() => pauseSmoother(false)}
              aria-invalid={!!err}
              aria-describedby={err ? "footer-newsletter-error" : undefined}
            />
            <button type="submit" aria-label="Subscribe" disabled={loading}
              onMouseDown={(ev) => { ev.preventDefault(); }}
            >
              <span>{loading ? "Subscribing…" : "Subscribe"}</span>
            </button>
          </form>
          {msg && <div role="status" style={{ color: '#1aa34a', marginTop: 8 }}>{msg}</div>}
          {err && <div id="footer-newsletter-error" role="alert" style={{ color: '#d33', marginTop: 8 }}>{err}</div>}
          <div className="rh-news-legal">
            <small>By subscribing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</small>
          </div>
        </div>

        {/* Links grid */}
        <div className="rh-links">
          <div className="rh-col">
            <h6>Shop</h6>
            <ul>
              <li><Link to="/shop">All</Link></li>
              <li><Link to="/shop?g=men">Men</Link></li>
              <li><Link to="/shop?g=women">Women</Link></li>
            </ul>
          </div>
          <div className="rh-col">
            <h6>Help</h6>
            <ul>
              <li><a href="#faq2">FAQs</a></li>
              <li><Link to="/terms">Shipping</Link></li>
              <li><Link to="/terms">Returns</Link></li>
              <li><a href="mailto:support@megance.com">Contact (support@megance.com)</a></li>
            </ul>
          </div>
          <div className="rh-col">
            <h6>Company</h6>
            <ul>
              <li><Link to="/about-us">About</Link></li>
              <li><Link to="/terms">Terms of Use</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
          <div className="rh-col rh-social">
            <h6>Follow</h6>
            <div className="rh-social-row">
              <Link to="https://www.instagram.com/megance_official"><a href="https://www.instagram.com/megance_official" target="_blank" aria-label="Instagram"><i className="fab fa-instagram"></i></a></Link>
              <Link to="https://www.facebook.com/share/1C2xE3PYgh/"> <a href="https://www.facebook.com/share/1C2xE3PYgh/" target="_blank" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
             </Link>
              <Link to="https://www.instagram.com/megance_official"> <a href="https://www.instagram.com/megance_official" target="_blank" aria-label="Twitter"><i className="fab fa-x-twitter"></i></a></Link>
              <Link to="https://pin.it/1gcfbasEq"><a href="https://pin.it/1gcfbasEq" target="_blank" aria-label="Pinterest"><i className="fab fa-pinterest"></i></a></Link>
          
              
             
              
            </div>
          </div>
        </div>

        {/* Sub footer */}
        <div className="rh-sub">
          <div className="rh-left">
            <span>© {year} Megance</span>
          </div>
          <div className="rh-right">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Returns</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
