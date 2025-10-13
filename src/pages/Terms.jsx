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
              <h2 className="mt-75">Terms and Conditions - Megance</h2>
              <p className="mt-10 opacity-7">Effective Date:- October 2025</p>

              <h4 className="mt-30">Overview</h4>
              <p>
                Welcome to Megance! By using our website (www.megance.com) and purchasing our products, you agree to the following Terms and Conditions. Please review them carefully before placing an order.</p>

              <h4 className="mt-20">Products</h4>
              <p>
                All Megance products are crafted with care and undergo strict quality checks. Please note, product colors may vary slightly based on lighting and screen settings.
              </p>

              <h4 className="mt-20">Pricing & Payment</h4>
              <p>
                All prices on Megance.com are inclusive of all applicable taxes. Payment methods include Credit/Debit Cards, UPI, Net Banking, and Cash on Delivery (COD), processed securely via Razorpay.</p>

              <h4 className="mt-20">Shipping & Delivery</h4>
              <p>
                <ul>
                  <li>

                    •	Free shipping on all orders across India.
                  </li>
                  <li>
                    •	Delivery typically within 3–7 working days.
                  </li>
                  <li>
                    •	Live shipping updates are provided via SMS/WhatsApp.

                  </li>
                </ul>
              </p>

              <h4 className="mt-20">Cash on Delivery (COD)</h4>
              <p>COD is available in most serviceable Indian pin codes. Repeated refusals or cancellations may restrict future COD eligibility.
              </p>
              <h4 className="mt-20">Return & Refund Policy</h4>
              <p>
                <ul>
                  1.	Orders once placed cannot be modified. You may request cancellation before shipping via WhatsApp support.
                  <li>

                    •	2.	Returns accepted within 5 days of delivery if products are unused, unworn, and in original packaging.
                  </li>
                  <li>
                    •3.	Start your return/refund via the official form on our website.</li>
                  <li>
                    •		Refund amount will be order value minus ₹450 handling fee.


                  </li>
                </ul>
              </p>

              <h4 className="mt-20">Intellectual Property</h4>
              <p>
                All website content—including logos, images, text, and graphics—belongs to Megance Lifestyle OPC Private Limited. Unauthorized use or reproduction is prohibited.</p>

              <h4 className="mt-20">Prohibited Uses</h4>
              <p>
                Do not use Megance.com for:
                <ul>
                  <li>
                    •	Fraudulent activity or false orders
                  </li>
                  <li>
                    •	Resale, duplication, or copying of our products/content
                  </li>
                  <li>
                    •	Uploading malware or abusive code
                  </li>
                  <li>
                    •	Law or regulation violations
                  </li>
                </ul>
              </p>
              <h4 className="mt-20">Limitation of Liability</h4>
              <p>

                <ul>
                  <li>
                    •	Megance is not responsible for indirect or consequential damages from website use, product purchase, or order delay.
                  </li>
                  <li>
                    •	Unforeseen delays due to weather, courier issues, or logistics strikes are outside Megance’s control.
                  </li>
                  <li>
                    •	Customers must record unboxing video for return claims in case of damage claims.

                  </li>

                </ul>
              </p>

              <h4 className="mt-20">Governing Law</h4>
              <p>
                These terms are governed by Indian law, with jurisdiction in New Delhi, India.

              </p>

              <h4 className="mt-20">              Privacy Policy
              </h4>
              <p>
                Megance collects personal, payment, and communication data only as needed for orders, delivery, and support—details in our full Privacy Policy

              </p>

              <h4 className="mt-20">           Contact Information

              </h4>
              <p>
                Questions? Contact support at support@megance.com or WhatsApp +91 9311939989.

              </p>

              <h4 className="mt-20">                           Acknowledgement

              </h4>
              <p>
                By placing an order, you acknowledge that you have read and accepted these terms.

              </p>


            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

