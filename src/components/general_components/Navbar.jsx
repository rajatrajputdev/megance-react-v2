import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useCart } from "../../context/CartContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import Logo from "./Logo.jsx";

export default function Navbar() {
  const navRef = useRef(null);
  const location = useLocation();
  const { count } = useCart();
  const { user, logout } = useAuth();
  const openMenu = () => {
    try {
      const hm = document.querySelector('.hamenu');
      if (hm) {
        hm.classList.add('open');
        hm.style.left = '0';
      }
    } catch {}
  };
  
  // Close the hamenu on any route change (e.g., clicking a link)
  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Toggle a subtle backdrop when scrolling past the hero/into busy content
  useEffect(() => {
    const node = navRef.current;
    if (!node) return;
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      if (y > 20) node.classList.add('has-backdrop');
      else node.classList.remove('has-backdrop');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const closeMenu = () => {
    try {
      const hm = document.querySelector('.hamenu');
      if (hm) {
        hm.classList.remove('open');
        hm.style.left = '-100%';
      }
    } catch {}
  };
  return (
    <>
      <nav ref={navRef} className="navbar navbar-expand-lg">
        <div className="container">
          <div
            className="w-100"
            style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}
          >
            {/* Left: primary links (desktop) */}
            <div className="navbar-left d-none d-lg-flex align-items-center">
              <ul className="navbar-nav flex-row">
                <li className="nav-item mr-20">
                  <NavLink className="nav-link" to="/">Home</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/shop">Shop</NavLink>
                </li>
              </ul>
            </div>

            {/* Center: logo (adaptive visibility) */}
            <div className="navbar-center" style={{ justifySelf: 'center' }}>
              <Logo />
            </div>

            {/* Right: cart, auth, hamburger */}
            <div className="navbar-right topnav d-flex align-items-center" style={{ justifySelf: 'end' }}>
              {/* Hide cart/login on small screens; show from lg and up */}
              <Link to="/cart" className="butn nav-butn cart-butn mr-10 d-none d-lg-inline-flex">
                <div className="d-flex align-items-center">
                  <span>Cart ({count})</span>
                  <span className="icon ml-10">
                    <img src="/common/imgs/icons/arrow-top-right.svg" alt="" />
                  </span>
                </div>
              </Link>

              {user ? (
                <button className="butn nav-butn mr-10 d-none d-lg-inline-flex" onClick={logout}>Logout</button>
              ) : (
                <Link to="/login" className="butn nav-butn mr-10 d-none d-lg-inline-flex">Login</Link>
              )}

              <div className="menu-icon cursor-pointer" onClick={openMenu}>
                <div className="menu-icon-surface">
                  <span className="icon ti-align-right"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="hamenu">
        <div className="close-menu cursor-pointer ti-close" onClick={closeMenu}></div>
        <div className="container-fluid rest d-flex">
          <div className="menu-links">
            <ul className="main-menu rest">
              <li></li>
              <li>
                <div className="o-hidden">
                  <NavLink to="/" className="link" onClick={closeMenu}>
                    <span className="fill-text" data-text="Home">
                      Home
                    </span>
                  </NavLink>
                </div>
              </li>
              <li>
                <div className="o-hidden">
                  <NavLink to="/shop" className="link" onClick={closeMenu}>
                    <span className="fill-text" data-text="Shop">
                      Shop
                    </span>
                  </NavLink>
                </div>
              </li>
              <li>
                <div className="o-hidden">
                  <NavLink to="/" className="link" onClick={closeMenu}>
                    <span className="fill-text" data-text="Contact Us">
                      Contact Us
                    </span>
                  </NavLink>
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
