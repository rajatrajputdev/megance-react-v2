import { Link, NavLink } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import Logo from "./Logo.jsx";

export default function Navbar() {
  const { count } = useCart();
  const { user, logout } = useAuth();
  return (
    <>
      <nav className="navbar navbar-expand-lg">
        <div className="container">
          <Logo />

          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav">
              <li className="nav-item">
                <NavLink className="nav-link" to="/">Home</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/shop">Shop</NavLink>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/">About Us</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/">Club</a>
              </li>
            </ul>
          </div>

          <div className="topnav d-flex align-items-center">
            <Link to="/cart" className="butn butn-rounded mr-10">
              <div className="d-flex align-items-center">
                <span>Cart ({count})</span>
                <span className="icon ml-10">
                  <img src="/common/imgs/icons/arrow-top-right.svg" alt="" />
                </span>
              </div>
            </Link>

            {user ? (
              <button className="butn butn-rounded mr-10" onClick={logout}>Logout</button>
            ) : (
              <Link to="/login" className="butn butn-rounded mr-10">Login</Link>
            )}

            <a href="/" className="butn butn-rounded">
              <div className="d-flex align-items-center">
                <span>Contact Us</span>
                <span className="icon ml-10">
                  <img src="/common/imgs/icons/arrow-top-right.svg" alt="" />
                </span>
              </div>
            </a>

            <div className="menu-icon cursor-pointer">
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  color: "#000",
                  padding: "2px 5px",
                  borderRadius: "10%",
                  marginLeft: 15,
                }}
              >
                <span className="icon ti-align-right"></span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="hamenu">
        <div className="close-menu cursor-pointer ti-close"></div>
        <div className="container-fluid rest d-flex">
          <div className="menu-links">
            <ul className="main-menu rest">
              <li></li>
              <li>
                <div className="o-hidden">
                  <a href="/" className="link">
                    <span className="fill-text" data-text="Home">
                      Home
                    </span>
                  </a>
                </div>
              </li>
              <li>
                <div className="o-hidden">
                  <a href="/inner_pages/contact.html" className="link">
                    <span className="fill-text" data-text="Shop">
                      Shop
                    </span>
                  </a>
                </div>
              </li>
              <li>
                <div className="o-hidden">
                  <a href="/inner_pages/contact.html" className="link">
                    <span className="fill-text" data-text="About Us">
                      About Us
                    </span>
                  </a>
                </div>
              </li>
              <li>
                <div className="o-hidden">
                  <a href="/inner_pages/contact.html" className="link">
                    <span className="fill-text" data-text="Club">
                      Club
                    </span>
                  </a>
                </div>
              </li>
              <li>
                <div className="o-hidden">
                  <a href="/inner_pages/contact.html" className="link">
                    <span className="fill-text" data-text="Contact Us">
                      Contact Us
                    </span>
                  </a>
                </div>
              </li>
            </ul>
          </div>
          <div className="cont-info valign">
            <div className="text-center full-width">
              <div className="logo">
                <img src="/assets/imgs/megance_logo_w.png" alt="" />
              </div>
              <div className="social-icon mt-40">
                <a href="#">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="#">
                  <i className="fab fa-x-twitter"></i>
                </a>
                <a href="#">
                  <i className="fab fa-linkedin-in"></i>
                </a>
                <a href="#">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
              <div className="item mt-30">
                <h5>
                  541 Melville Geek, <br /> Palo Alto, CA 94301
                </h5>
              </div>
              <div className="item mt-10">
                <h5>
                  <a href="#0">Hello@email.com</a>
                </h5>
                <h5 className="underline">
                  <a href="#0">+1 840 841 25 69</a>
                </h5>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
