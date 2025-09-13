import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";

export default function PrivacyPage() {
  return (
    <>
      <SEO title="Privacy Policy" description="Megance Privacy Policy explaining how we collect and use data." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <main>
        <section className="container page-section">
          <div className="row">
            <div className="col-lg-10 col-xl-8">
              <h1 className="section-title">Privacy Policy</h1>
              <p className="mt-10 opacity-7">Last updated: September 2025</p>

              <h4 className="mt-30">1. Information We Collect</h4>
              <p>
                We collect information you provide (such as name, email, address, payment details) and technical data
                (such as IP address, device, and analytics cookies) to process orders and improve our services.
              </p>

              <h4 className="mt-20">2. How We Use Information</h4>
              <p>
                To fulfill orders, provide customer support, personalize content, prevent fraud, and comply with legal
                obligations. We may send you transactional emails and, with consent where required, promotional updates.
              </p>

              <h4 className="mt-20">3. Sharing</h4>
              <p>
                We share data with trusted processors (payments, shipping, analytics) under agreements that protect your
                information. We do not sell personal data.
              </p>

              <h4 className="mt-20">4. Cookies</h4>
              <p>
                We use necessary cookies for core functionality and analytics cookies to understand usage. You can
                manage preferences in your browser settings.
              </p>

              <h4 className="mt-20">5. Security</h4>
              <p>
                We implement reasonable technical and organizational measures to safeguard data. No method of
                transmission or storage is 100% secure.
              </p>

              <h4 className="mt-20">6. Your Rights</h4>
              <p>
                Subject to local law, you may request access, correction, deletion, or restriction of your personal
                data. Contact us using the details in the footer to exercise these rights.
              </p>

              <h4 className="mt-20">7. Children</h4>
              <p>
                Our services are not directed to children under 13. We do not knowingly collect data from children.
              </p>

              <h4 className="mt-20">8. Changes</h4>
              <p>
                We may update this Policy periodically. Material changes will be indicated by updating the date above.
              </p>

              <p className="mt-30 opacity-7">
                This policy is informational and not legal advice. Please consult counsel for compliance guidance.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

