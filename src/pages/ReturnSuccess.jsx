import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";

export default function ReturnSuccess() {
  const loc = useLocation();
  const params = useMemo(() => new URLSearchParams(loc.search || ''), [loc.search]);
  const awb = (params.get('awb') || '').trim();
  const orderId = (params.get('orderId') || '').trim();
  const trackUrl = awb ? `https://www.xpressbees.com/track?awb=${encodeURIComponent(awb)}` : '';
  return (
    <>
      <SEO title="Return Scheduled" description="Your return pickup is scheduled." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="container page-section white-navbar-page">
        <div className="row justify-content-center">
          <div className="col-lg-7">
            <div className="p-20 card-like" role="status" aria-live="polite">
              <h3 className="mb-6">Return Request Submitted</h3>
              <p className="opacity-7">We have scheduled a reverse pickup for your order. Our courier partner will contact you on your phone number for pickup at your address.</p>
              {awb ? (
                <div className="mt-10">
                  <div>Return AWB: <strong>{awb}</strong></div>
                  <div className="mt-6">
                    <a className="underline" href={trackUrl} target="_blank" rel="noreferrer">Track on XpressBees</a>
                  </div>
                </div>
              ) : (
                <div className="mt-10">AWB will appear soon after confirmation.</div>
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
