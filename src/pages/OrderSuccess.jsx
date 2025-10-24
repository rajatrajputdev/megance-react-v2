import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import SEO from "../components/general_components/SEO.jsx";
import { decrementStockForOrder } from "../services/orders.js";

export default function OrderSuccess() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const pid = params.get("pid");
  const oid = params.get("oid");

  useEffect(() => {
    if (!oid) return;
    let alive = true;
    (async () => {
      try { await decrementStockForOrder(oid); } catch {}
    })();
    return () => { alive = false; };
  }, [oid]);

  return (
    <>
      <SEO title="Order Successful" description="Your Megance payment was successful." image="/assets/logo.svg" type="website" twitterCard="summary" />
    <section className="container pt-60 pb-60 white-navbar-page">
      <div className="row justify-content-center">
        <div className="col-lg-7">
          <div className="p-30  mt-50 card-like text-center">
            <div style={{fontSize: 42, lineHeight: 1}}>🎉</div>
            <h2 className="mt-10">Thank you for your order!</h2>
            <p className="mt-10 opacity-7">We’ve received your order and sent a confirmation to your email.</p>
            <div className="mt-20">
              {oid && <div className="mb-6">Order ID: <strong>#{oid.slice(0,6).toUpperCase()}</strong></div>}
              {pid && <div className="mb-6">Payment ID: <strong>{pid}</strong></div>}
              <div className="mt-10">
                <span className="badge status status-ordered">Ordered</span>
              </div>
            </div>
            <div className="mt-30">
              <Link to="/account" className="butn mr-10">View Orders</Link>
              <Link to="/shop" className="underline">Continue Shopping</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
