// src/pages/ContactUs.jsx

import React from "react";
import "./contact-us.css"; // ✅ Create this CSS file for styling
import Footer from "../components/homepage_components/Footer";

export default function ContactUs() {
  return (<>
    <section className="contact-wrapper">
      <div className="contact-container">
        <h1 className="contact-title">Get in Touch</h1>
        <p className="contact-sub">We’re here to help and answer any questions you might have.</p>

        <div className="contact-card">
          <h3>📩 Email Support</h3>
          <p>support@megance.com</p>
        </div>

        <div className="contact-card">
          <h3>📞 WhatsApp / Call</h3>
          <p>+91 93119 39989</p>
        </div>

        <div className="contact-card">
          <h3>⏰ Support Hours</h3>
          <p>Monday – Saturday | 10:00 AM – 6:00 PM IST</p>
        </div>

        <div className="contact-socials">
          <h3>Connect with us</h3>
          
          <div className="social-links">
                        <a href="https://www.instagram.com/megance_official" target="_blank" rel="noreferrer noopener" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                        <a href="https://www.facebook.com/share/1C2xE3PYgh/" target="_blank" rel="noreferrer noopener" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
                        <a href="https://x.com/meganceofficial" target="_blank" rel="noreferrer noopener" aria-label="Twitter"><i className="fab fa-x-twitter"></i></a>
                        <a href="https://pin.it/1gcfbasEq" target="_blank" rel="noreferrer noopener" aria-label="Pinterest"><i className="fab fa-pinterest"></i></a>
          </div>
        </div>
      </div>
    </section>
    <Footer/>
  </>
  );
}
