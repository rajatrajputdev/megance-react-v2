// ===== File: src/pages/CartPage.jsx =====
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";
import { useEffect, useMemo, useState, useCallback } from "react";
import { fetchProductById } from "../services/products";
import "./cart-page.css";

export default function CartPage() {
  const { items, updateQty, removeItem, amount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEmpty = items.length === 0;

  const [limits, setLimits] = useState({});

  const parseCartId = useCallback(
    (id) => {
      const item = items.find((x) => x.id === id);
      const size = item?.meta?.size || (id.includes("-s") ? id.split("-s").pop() : "");
      const gender =
        item?.meta?.gender ||
        (/-men-?s|\-men\-s/.test(id)
          ? "men"
          : /-women-?s|\-women\-s/.test(id)
          ? "women"
          : null);
      const baseId = (() => {
        if (!size) return id;
        const idx = id.lastIndexOf(`-s${size}`);
        if (idx === -1) return id;
        return id.slice(0, idx);
      })();
      return { baseId, size, gender };
    },
    [items]
  );

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      const map = {};
      const byBase = new Map();
      for (const it of items) {
        const parsed = parseCartId(it.id);
        if (!byBase.has(parsed.baseId)) byBase.set(parsed.baseId, []);
        byBase.get(parsed.baseId).push({ it, parsed });
      }
      for (const [baseId, group] of byBase.entries()) {
        try {
          const p = await fetchProductById(baseId);
          for (const { it, parsed } of group) {
            let available = Infinity;
            if (parsed.size) {
              if (parsed.gender && Array.isArray(p?.sizeQuantities?.[parsed.gender])) {
                const row = p.sizeQuantities[parsed.gender].find(
                  (r) => String(r.size) === String(parsed.size)
                );
                available = Number(row?.quantity) || 0;
              } else if (Array.isArray(p?.sizes) && p.sizes.length && typeof p.sizes[0] === "object") {
                const row = p.sizes.find((r) => String(r.size) === String(parsed.size));
                available = Number(row?.quantity) || 0;
              }
            }
            map[it.id] = Number.isFinite(available) ? Math.max(0, available) : Infinity;
          }
        } catch {
          for (const { it } of group) map[it.id] = Infinity;
        }
      }
      if (!disposed) setLimits(map);
    };
    load();
    return () => {
      disposed = true;
    };
  }, [items, parseCartId]);

  const clamp = useCallback(
    (id, val) => {
      const lim = limits[id];
      if (!Number.isFinite(lim)) return Math.max(0, val); // allow 0 for removal
      return Math.max(0, Math.min(lim, val));
    },
    [limits]
  );

  const subtotal = amount;
  const shippingFee = 0;
  const total = useMemo(() => Math.max(0, subtotal + shippingFee), [subtotal, shippingFee]);

  const handleCheckout = () => {
    if (user) {
      navigate("/checkout");
    } else {
      navigate("/login?from=/checkout");
    }
  };

  const closeDrawer = () => document.body.classList.remove("show-cart-drawer");

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <>
      <SEO
        title="Your Cart"
        description="Review items and proceed to checkout on Megance."
        image="/assets/logo.svg"
        type="website"
        twitterCard="summary"
      />

      <section className="cart-page container-narrow">
        <header className="cart-header" style={{ paddingTop: "80px" }}>
          <div className="cart-title-wrap">
            <h1 className="cart-title">My Cart ({items.length})</h1>
            <div className="reserve-note">Items in your cart are reserved temporarily</div>
          </div>
        </header>

        {isEmpty ? (
          <div className="empty-state">
            <p className="empty-title">Your cart is empty.</p>
            <Link to="/shop" className="btn btn-dark mt-10">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items">
              {items.map((it) => (
                <div key={it.id} className="cart-item-card glass-surface">
                  <button
                    className="item-remove"
                    aria-label="Remove item"
                    onClick={() => removeItem(it.id)}
                    title="Remove"
                  >
                    ×
                  </button>

                  <div className="item-thumb" style={{ height: "100px", width: "150px" }}>
                    <img src={it.image || it.imageUrl || "/assets/logo.svg"} alt={it.name} />
                  </div>

                  <div className="item-info">
                    <div className="item-name-row">
                      <div>
                        <div className="item-name">{it.name}</div>
                        <div className="variant-row">
                          {it?.meta?.color && (
                            <span className="variant-pill glow-on-hover">{it.meta.color}</span>
                          )}
                          {it?.meta?.size && (
                            <span className="variant-pill glow-on-hover">Size {it.meta.size}</span>
                          )}
                        </div>
                      </div>
                      <div className="item-price">₹ {it.price}</div>
                    </div>

                    <div className="qty-row">
                      <div className="qty-label">Quantity</div>
                      <div className="qty-control large glow-on-hover">
                        <button
                          style={{ color: "#111" }}
                          onClick={() => {
                            const newQty = clamp(it.id, it.qty - 1);
                            if (newQty <= 0) return removeItem(it.id);
                            updateQty(it.id, newQty);
                          }}
                          aria-label="Decrease"
                        >
                          –
                        </button>

                        <input
                          type="number"
                          min={0}
                          value={clamp(it.id, it.qty)}
                          onChange={(e) => {
                            const newQty = clamp(it.id, parseInt(e.target.value || 0));
                            if (newQty <= 0) return removeItem(it.id);
                            updateQty(it.id, newQty);
                          }}
                        />

                        <button
                          style={{ color: "#111" }}
                          onClick={() => {
                            const newQty = clamp(it.id, it.qty + 1);
                            updateQty(it.id, newQty);
                          }}
                          aria-label="Increase"
                          disabled={Number.isFinite(limits[it.id]) && it.qty >= limits[it.id]}
                          title={
                            Number.isFinite(limits[it.id]) && it.qty >= limits[it.id]
                              ? "Reached available stock"
                              : "Increase"
                          }
                        >
                          +
                        </button>
                      </div>

                      {Number.isFinite(limits[it.id]) && (
                        <span className="stock-hint">
                          Only {Math.max(0, limits[it.id] - (it.qty - 0))} left
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: Sticky Summary */}
            <aside className="summary">
              <div className="summary-box glass-surface strong-elevation">
                <div className="summary-title">Summary</div>

                <div className="summary-line">
                  <span>Subtotal</span>
                  <span>₹ {subtotal}</span>
                </div>

                <div className="summary-line">
                  <span>Shipping</span>
                  <span className="text-success">FREE</span>
                </div>

                <hr className="summary-divider" />

                <div className="summary-total">
                  <span>Total</span>
                  <span>₹ {total}</span>
                </div>

                <button className="checkout-btn glow-primary" onClick={handleCheckout}>
                  Place Order
                </button>
              </div>

              <div className="benefit-cards">
                <div className="benefit-card glass-surface">
                  <div className="benefit-content">
                    <div className="benefit-title">Free Shipping</div>
                    <div className="benefit-text">Enjoy complimentary delivery on all orders.</div>
                  </div>
                </div>
                <div className="benefit-card glass-surface">
                  <div className="benefit-content">
                    <div className="benefit-title">Delivery in 3 - 7 Days</div>
                    <div className="benefit-text">Enjoy Superfast delivery in 3 to 7 days</div>
                  </div>
                </div>
                <div className="benefit-card glass-surface">
                  <div className="benefit-content">
                    <div className="benefit-title">5 Days Return policy</div>
                    <div className="benefit-text">Enjoy a super easy return policy</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      <Footer />
    </>
  );
}
