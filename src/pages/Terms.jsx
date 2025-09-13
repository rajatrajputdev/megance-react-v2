import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";

export default function TermsPage() {
  return (
    <>
      <SEO title="Terms & Conditions" description="Megance Terms & Conditions for purchases and site use." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <main>
        <section className="container page-section">
          <div className="row">
            <div className="col-lg-10 col-xl-8">
              <h1 className="section-title">Terms & Conditions</h1>
              <p className="mt-10 opacity-7">Last updated: September 2025</p>

              <h4 className="mt-30">1. Overview</h4>
              <p>
                These Terms & Conditions ("Terms") govern your purchase of products and use of the Megance website.
                By placing an order or using this site, you agree to these Terms.
              </p>

              <h4 className="mt-20">2. Orders & Pricing</h4>
              <p>
                All prices are listed in INR and inclusive of applicable taxes unless stated otherwise. We reserve the
                right to cancel or refuse any order in cases of suspected fraud or pricing errors.
              </p>

              <h4 className="mt-20">3. Shipping & Delivery</h4>
              <p>
                Estimated delivery timelines are shown at checkout. Delays may occur due to courier or regional issues.
                Title and risk pass to you upon delivery.
              </p>

              <h4 className="mt-20">4. Returns & Refunds</h4>
              <p>
                Unused items in original packaging may be returned within 7 days of delivery. Refunds are processed to
                the original payment method after inspection. Certain items may be non‑returnable for hygiene reasons.
              </p>

              <h4 className="mt-20">5. Warranty</h4>
              <p>
                Products are covered by a limited manufacturing warranty for defects under normal use. Damage due to
                misuse or wear and tear is not covered.
              </p>

              <h4 className="mt-20">6. Use of Site</h4>
              <p>
                You agree not to misuse the site, attempt unauthorized access, or interfere with security measures. See
                also our separate Terms of Use.
              </p>

              <h4 className="mt-20">7. Limitation of Liability</h4>
              <p>
                To the fullest extent permitted by law, Megance is not liable for indirect, incidental, or consequential
                damages arising from your use of the site or products.
              </p>

              <h4 className="mt-20">8. Changes</h4>
              <p>
                We may update these Terms periodically. Continued use of the site after changes constitutes acceptance.
              </p>

              <p className="mt-30 opacity-7">
                This content is provided for general information only and does not constitute legal advice.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

