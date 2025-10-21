import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";

export default function ReturnSuccess() {
  const loc = useLocation();
  const params = useMemo(() => new URLSearchParams(loc.search || ''), [loc.search]);
  const requestId = (params.get('requestId') || '').trim();
  const orderId = (params.get('orderId') || '').trim();
  return (
    <>
      <SEO title="Return Submitted" description="Your return request has been submitted." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="container page-section white-navbar-page">
        <div className="row justify-content-center">
          <div className="col-lg-7">
            <div className="p-20 card-like" role="status" aria-live="polite">
              <h3 className="mb-6">Return Request Submitted</h3>
              <p className="opacity-7">Thank you. We’ve received your request and our team will review it soon. You’ll be notified with the next steps.</p>
              {requestId && (
                <div className="mt-10">Reference: <strong>#{requestId.slice(0,6).toUpperCase()}</strong></div>
              )}
              <div className="mt-15">
                <Link className="butn" to={orderId ? `/account/orders/${encodeURIComponent(orderId)}` : '/account'}>View Order</Link>
                <Link className="butn ml-10" to="/account">Back to Orders</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
