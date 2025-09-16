import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer-sa pb-80">
      <div className="container section-padding">
        <div className="sec-head mb-80">
          <div className="row">
            <div className="col-lg-5">
              <a href="#" className="logo md-mb50">
                <img src="/assets/imgs/megance_logo_w.png" alt="" />
              </a>
            </div>
            <div className="col-lg-6">
              <h4>
                We hope to empower user and simplify
                <span className="sub-color inline">their everyday lives.</span>
              </h4>
            </div>
          </div>
        </div>
        <div className="contact-info">
          <div className="row">
            <div className="col-lg-6 offset-lg-5">
              <div className="row">
                <div className="col-md-12 d-flex justify-content-between align-items-center">
                  <div className="item">
                    <span className="sub-color">inquiry</span>
                    <p>hello@megance.in</p>
                  </div>
                  <div className="social-icon">
                    <a href="#0">
                      <i className="fa-brands fa-instagram"></i>
                    </a>
                    <a href="#0">
                      <i className="fa-brands fa-facebook-f"></i>
                    </a>
                    <a href="#0">
                      <i className="fa-brands fa-x-twitter"></i>
                    </a>
                    <a href="#0">
                      <i className="fa-brands fa-pinterest-p"></i>
                    </a>
                    <a href="#0">
                      <i className="fa-brands fa-linkedin-in"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="sub-footer">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="copy sub-color md-mb30">
                <p>
                  © 2025 - 2026 <a href="#0">Megance</a>. All Right Reserved
                </p>
              </div>
            </div>
            <div className="col-lg-4 d-flex justify-content-end">
              <div className="links sub-color d-flex justify-content-between">
                <Link to="/" className="active">Home</Link>
                <Link to="/shop">Shop</Link>
                <Link to="/terms">Terms</Link>
                <Link to="/privacy">Privacy</Link>
                <Link to="/terms-of-use">Terms of Use</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
