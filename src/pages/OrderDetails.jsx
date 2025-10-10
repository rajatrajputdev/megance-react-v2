import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { db } from "../firebase.js";
import { collection, doc, getDoc, onSnapshot, query, where, limit, getDocs } from "firebase/firestore";
import SEO from "../components/general_components/SEO.jsx";
import { auth, app } from "../firebase.js";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function OrderDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    setErr("");

    // Prefer user subcollection doc by id
    const subDocRef = doc(db, "users", user.uid, "orders", id);
    const unsub = onSnapshot(subDocRef, async (snap) => {
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() });
        setLoading(false);
        return;
      }
      // Fallback: try top-level by id and ensure it belongs to user
      try {
        const top = await getDoc(doc(db, "orders", id));
        if (top.exists() && top.data()?.userId === user.uid) {
          setOrder({ id: top.id, ...top.data() });
        } else {
          // Fallback: query by orderId field in subcollection (newly created orders)
          const q = query(collection(db, "users", user.uid, "orders"), where("orderId", "==", id), limit(1));
          const qs = await getDocs(q);
          if (!qs.empty) {
            const d = qs.docs[0];
            setOrder({ id: d.id, ...d.data() });
          } else {
            setErr("Order not found");
          }
        }
      } catch (e) {
        setErr(e.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    }, (e) => {
      setErr(e.message || "Failed to load order");
      setLoading(false);
    });
    return () => unsub();
  }, [user, id]);

  const totals = useMemo(() => {
    if (!order) return { items: 0, amount: 0, discount: 0, payable: 0 };
    const items = Array.isArray(order.items) ? order.items.reduce((a, b) => a + (b.qty || 0), 0) : 0;
    return {
      items,
      amount: order.amount || 0,
      discount: order.discount || 0,
      payable: order.payable || 0,
      gst: typeof order.gst === 'number' ? order.gst : Math.round(Math.max(0, (order.amount || 0) - (order.discount || 0)) * 0.18),
    };
  }, [order]);

  const openInvoicePdf = async () => {
    try {
      const region = (import.meta.env.VITE_FUNCTIONS_REGION || '').trim() || undefined;
      const fns = getFunctions(app, region);
      const call = httpsCallable(fns, 'getOrderInvoicePdfCallable');
      const oid = order?.orderId || order?.id || id;
      const res = await call({ orderId: oid });
      const { contentType, data, filename } = res.data || {};
      if (!data) return;
      const blob = await (await fetch(`data:${contentType||'application/pdf'};base64,${data}`)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `invoice-${oid}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch {}
  };

  return (
    <>
      <SEO title="Order Details" description="Your Megance order details." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="container page-section white-navbar-page">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="p-20 card-like">
              <div className="d-flex justify-content-between align-items-center">
                <h3 className="mb-0">Order Details</h3>
                <Link to="/account" className="underline">Back to Orders</Link>
              </div>
              {loading ? (
                <p className="opacity-7 mt-10">Loading…</p>
              ) : err ? (
                <div className="alert error mt-10">{err}</div>
              ) : order ? (
                <div className="mt-10">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-600">Order #{(order.orderId || order.id || "").toString().slice(0,6).toUpperCase()}</div>
                      <div className="opacity-7 small">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : ""}</div>
                    </div>
                    <div>
                      <span className={`badge status status-${(order.status || 'ordered').toLowerCase()}`}>{order.status || 'Ordered'}</span>
                    </div>
                  </div>

                  <hr className="mt-15 mb-15" />

                  <h6>Items</h6>
                  <ul className="mt-10" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(order.items || []).map((it, idx) => (
                      <li key={idx} className="d-flex justify-content-between mb-6">
                        <span>{it.name} × {it.qty}</span>
                        <span>₹ {(it.price || 0) * (it.qty || 0)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="d-flex justify-content-between mt-10">
                    <span>Total</span>
                    <span>₹ {totals.amount}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="d-flex justify-content-between" style={{ color: '#1aa34a' }}>
                      <span>Discount</span>
                      <span>- ₹ {totals.discount}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between">
                    <span>GST (18%)</span>
                    <span>₹ {totals.gst}</span>
                  </div>
                  {order?.coupon?.code && (
                    <div className="d-flex justify-content-between" style={{ fontSize: 13 }}>
                      <span>Coupon</span>
                      <span>
                        <strong>{order.coupon.code}</strong>
                        {order.coupon.valid === false && <span className="inline-error" style={{ marginLeft: 6 }}>invalid</span>}
                      </span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-600 mt-6">
                    <span>Payable</span>
                    <span>₹ {totals.payable}</span>
                  </div>

                  <div className="mt-15">
                    <button className="butn" onClick={openInvoicePdf}>Download Invoice PDF</button>
                  </div>

                  <hr className="mt-15 mb-15" />

                  <h6>Billing</h6>
                  <div className="mt-6">
                    <div className="small fw-600">{order.billing?.name}</div>
                    <div className="small">{order.billing?.email}</div>
                    <div className="small">{order.billing?.phone}</div>
                    <div className="small mt-4">{order.billing?.address}, {order.billing?.city}, {order.billing?.state} {order.billing?.zip}</div>
                  </div>
                </div>
              ) : (
                <p className="opacity-7 mt-10">Order not found.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
