import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { db } from "../firebase.js";
import { doc, getDoc } from "firebase/firestore";
import SEO from "../components/general_components/SEO.jsx";
import "./invoice.css";

export default function InvoicePage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const qty = Math.max(1, parseInt(search.get("qty") || "1", 10));
  const gstPercent = (() => {
    const val = parseFloat(search.get("gst") || "18");
    return Number.isFinite(val) ? Math.max(0, val) : 18;
  })();
  const discount = (() => {
    const val = parseFloat(search.get("discount") || "0");
    return Number.isFinite(val) ? Math.max(0, val) : 0;
  })();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const ref = doc(db, "products", id);
        const snap = await getDoc(ref);
        if (!mounted) return;
        if (snap.exists()) {
          setProduct({ id: snap.id, ...snap.data() });
        } else {
          setProduct(null);
          setError("Product not found");
        }
      } catch (e) {
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const fmtINR = (n) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(Number(n || 0));
    } catch {
      const val = (Number(n || 0)).toFixed(2);
      return `₹ ${val}`;
    }
  };

  const calc = useMemo(() => {
    const mrp = Number(product?.price) || 0;
    const sub = mrp * qty;
    const disc = Math.min(Math.max(0, discount), sub);
    const taxable = Math.max(0, sub - disc);
    const gstAmount = Math.round((taxable * (gstPercent / 100)) * 100) / 100;
    const shipping = 0; // Free shipping
    const total = taxable + gstAmount + shipping;
    return { mrp, sub, disc, taxable, gstAmount, shipping, total };
  }, [product?.price, qty, discount, gstPercent]);

  const today = new Date();
  const invoiceNo = useMemo(() => {
    const y = today.getFullYear().toString().slice(-2);
    const m = (today.getMonth() + 1).toString().padStart(2, "0");
    const d = today.getDate().toString().padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `MG-${y}${m}${d}-${rand}`;
  }, []);

  return (
    <>
      <SEO title="Invoice" description="Megance invoice preview" image="/assets/imgs/megance_logo_b.svg" />
      <section className="container pt-60 pb-60">
        <div className="invoice-wrap" role="document" aria-label="Invoice">
          <div className="invoice-header">
            <div className="brand">
              <img src="/assets/imgs/megance_logo_b.svg" alt="Megance" className="brand-logo" />
              <div className="brand-meta">
                <div className="brand-name">Megance</div>
                <div className="brand-sub">megance.com</div>
              </div>
            </div>
            <div className="invoice-meta">
              <div><span className="meta-k">Invoice No</span><span className="meta-v">{invoiceNo}</span></div>
              <div><span className="meta-k">Date</span><span className="meta-v">{today.toLocaleDateString()}</span></div>
            </div>
          </div>

          <div className="invoice-body">
            {loading && (
              <div className="inv-note">Loading product…</div>
            )}
            {!loading && error && (
              <div className="inv-error" role="alert">{error}</div>
            )}
            {!loading && !error && product && (
              <>
                <div className="bill-to card-like">
                  <div className="bill-h">Product</div>
                  <div className="bill-row">
                    <div className="bill-k">Name</div>
                    <div className="bill-v">{product.name}</div>
                  </div>
                  <div className="bill-row">
                    <div className="bill-k">Quantity</div>
                    <div className="bill-v">{qty}</div>
                  </div>
                </div>

                <div className="inv-table card-like mt-20">
                  <div className="inv-tr inv-th">
                    <div>Field</div>
                    <div>Amount</div>
                  </div>
                  <div className="inv-tr">
                    <div>Subtotal</div>
                    <div>{fmtINR(Math.max(0, (calc.total || 0) - (calc.gstAmount || 0)))}</div>
                  </div>
                  <div className="inv-tr">
                    <div>Discount</div>
                    <div>- {fmtINR(calc.disc)}{calc.disc === 0 ? " (optional)" : ""}</div>
                  </div>
                  <div className="inv-tr">
                    <div>GST ({gstPercent}%)</div>
                    <div>{fmtINR(calc.gstAmount)}</div>
                  </div>
                  <div className="inv-tr">
                    <div>Shipping</div>
                    <div>Free</div>
                  </div>
                  <div className="inv-tr inv-total">
                    <div>Total</div>
                    <div>{fmtINR(calc.total)}</div>
                  </div>
                </div>

                <div className="inv-actions no-print mt-20">
                  <button className="butn" onClick={() => window.print()}>Print / Save PDF</button>
                  <Link className="butn ghost" to={`/product/${product.id}`}>Back to Product</Link>
                </div>

                <div className="inv-terms mt-20">
                  <div className="t">Notes</div>
                  <ul>
                    <li>GST shown here is a placeholder (dummy) for now.</li>
                    <li>Shipping is free on all orders.</li>
                    <li>Discount is optional and may be 0.</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
