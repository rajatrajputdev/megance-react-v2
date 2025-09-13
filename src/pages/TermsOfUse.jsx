import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";

export default function TermsOfUsePage() {
  return (
    <>
      <SEO title="Terms of Use" description="Megance Terms of Use for website access and content." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <main>
        <section className="container page-section">
          <div className="row">
            <div className="col-lg-10 col-xl-8">
              <h1 className="section-title">Terms of Use</h1>
              <p className="mt-10 opacity-7">Last updated: September 2025</p>

              <h4 className="mt-30">1. Acceptance of Terms</h4>
              <p>
                By accessing or using the Megance website, you agree to these Terms of Use. If you do not agree, please
                discontinue use.
              </p>

              <h4 className="mt-20">2. User Conduct</h4>
              <p>
                You will not use the site for unlawful purposes, attempt to gain unauthorized access, or disrupt
                operations. You are responsible for maintaining the confidentiality of your account.
              </p>

              <h4 className="mt-20">3. Intellectual Property</h4>
              <p>
                All content, trademarks, and assets on this site are owned by Megance or its licensors and protected by
                applicable laws. You may not copy, distribute, or create derivative works without permission.
              </p>

              <h4 className="mt-20">4. Third‑Party Links</h4>
              <p>
                External links are provided for convenience. We are not responsible for the content or practices of
                third‑party sites.
              </p>

              <h4 className="mt-20">5. Disclaimers</h4>
              <p>
                This site is provided on an "as is" basis without warranties of any kind. See our Terms & Conditions for
                purchase‑related terms.
              </p>

              <h4 className="mt-20">6. Termination</h4>
              <p>
                We may suspend or terminate access for violations of these Terms of Use or where required by law.
              </p>

              <h4 className="mt-20">7. Changes</h4>
              <p>
                We may modify these Terms of Use. Continued use after changes means you accept the updated terms.
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

