import { useLocation, Link } from "react-router-dom";
import SEO from "../components/general_components/SEO.jsx";

export default function OrderSuccess() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const pid = params.get("pid");

  return (
    <>
      <SEO title="Order Successful" description="Your Megance payment was successful." image="/assets/logo.svg" type="website" twitterCard="summary" />
    <section className="container pt-60 pb-60 text-center">
      <h2>Thank you!</h2>
      <p className="mt-10">Your payment was successful.</p>
      {pid && <p className="mt-10">Payment ID: <strong>{pid}</strong></p>}
      <div className="mt-20">
        <Link to="/shop" className="butn mr-10">Continue Shopping</Link>
        <Link to="/" className="underline">Go Home</Link>
      </div>
    </section>
    </>
  );
}
