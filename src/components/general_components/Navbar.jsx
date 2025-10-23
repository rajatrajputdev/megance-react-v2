import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useCart } from "../../context/CartContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import Logo from "./Logo.jsx";

export default function Navbar() {
  const navRef = useRef(null);
  const location = useLocation();
  const g = new URLSearchParams(location.search).get('g') || 'all';
  const { count } = useCart();
  const { user, logout } = useAuth();
  const [bump, setBump] = useState(false);

  // Listen for cart add events to bump the badge
  useEffect(() => {
    const onAdd = () => {
      try { setBump(true); } catch {}
      const t = setTimeout(() => { try { setBump(false); } catch {} }, 320);
      return () => clearTimeout(t);
    };
    window.addEventListener('cart:add', onAdd);
    return () => window.removeEventListener('cart:add', onAdd);
  }, []);

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

  // Toggle a subtle backdrop when navbar becomes sticky
  useEffect(() => {
    const node = navRef.current;
    if (!node) return;
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      // Match the vendor sticky threshold (set in public/common/js/common_scripts.js)
      if (y > 80) node.classList.add('has-backdrop');
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
          <div className="row w-100 align-items-center">
            {/* Mobile: Logo on left, Hamburger on right */}
            <div className="col-6 d-lg-none">
              <Logo />
            </div>
            <div className="col-6 d-lg-none">
              <div className="d-flex align-items-center justify-content-end gap-10">
                <Link to="/cart" className="mobile-cart-btn" aria-label={`Cart with ${count} items`}>
                  {/* Shopping cart icon (Feather style) */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="20" r="1"/>
                    <circle cx="20" cy="20" r="1"/>
                    <path d="M1 1h4l2.2 11.5a2 2 0 0 0 2 1.5h9.5a2 2 0 0 0 2-1.6L23 6H6"/>
                  </svg>
                  {count > 0 && <span className={`badge-count${bump ? ' bump' : ''}`}>{count}</span>}
                </Link>
                <div className="menu-icon cursor-pointer" onClick={openMenu}>
                  <div className="menu-icon-surface">
                    <span className="icon ti-align-right"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: 3-column layout */}
            <div className="col-lg-4 d-none d-lg-block">
              <div className="navbar-left d-flex align-items-center">
                <ul className="navbar-nav flex-row">
                  <li className="nav-item mr-20">
                    <NavLink className="nav-link" to="/">Home</NavLink>
                  </li>
                  {/* <li className="nav-item mr-20">
                    <NavLink className="nav-link" to="/returns">Returns</NavLink>
                  </li> */}
                  <li className="nav-item dropdown">
                    <a href="#" className="nav-link" onClick={(e) => e.preventDefault()}>Shop</a>
                    <div className="dropdown-menu">
                      <Link className={`dropdown-item${g === 'men' ? ' active' : ''}`} to="/shop?g=men">Men</Link>
                      <Link className={`dropdown-item${g === 'women' ? ' active' : ''}`} to="/shop?g=women">Women</Link>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-lg-4 d-none d-lg-block text-center">
              <Logo />
            </div>
            <div className="col-lg-4 d-none d-lg-block">
              <div className="navbar-right topnav d-flex align-items-center justify-content-end">
                <Link to="/cart" className="butn nav-butn cart-butn mr-10">
                  <div className="d-flex align-items-center">
                    <span>Cart ({count})</span>
                    <span className="icon ml-10">
                      <img src="/common/imgs/icons/arrow-top-right.svg" alt="" />
                    </span>
                  </div>
                </Link>
                {user ? (
                  <>
                    <Link to="/account" className="butn nav-butn mr-10">Account</Link>
                    <Link onClick={logout} className="butn nav-butn mr-10">Logout</Link>
                    {/* <button className="butn nav-butn mr-10" onClick={logout}>Logout</button> */}
                  </>
                ) : (
                  <Link to="/login" className="butn nav-butn mr-10">Login</Link>
                )}
                
                
                <div className="menu-icon cursor-pointer" onClick={openMenu}>
                  <div className="menu-icon-surface">
                    <span className="icon ti-align-right"></span>
                  </div>
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
                  <a href="#" className="link dmenu" onClick={(e) => e.preventDefault()}>
                    <span className="fill-text" data-text="Shop">Shop</span>
                    <i></i>
                  </a>
                </div>
                <div className="sub-menu">
                  <ul>
                    <li>
                      <Link to="/shop?g=men" className={`sub-link${g === 'men' ? ' active' : ''}`} onClick={closeMenu}>Men</Link>
                    </li>
                    <li>
                      <Link to="/shop?g=women" className={`sub-link${g === 'women' ? ' active' : ''}`} onClick={closeMenu}>Women</Link>
                    </li>
                  </ul>
                </div>
              </li>
              {/* <li>
                <div className="o-hidden">
                  <NavLink to="/" className="link" onClick={closeMenu}>
                    <span className="fill-text" data-text="Contact Us">
                      Contact Us
                    </span>
                  </NavLink>
                </div>
              </li> */}
              {user && (
                <li>
                  <div className="o-hidden">
                    <NavLink to="/account" className="link" onClick={closeMenu}>
                      <span className="fill-text" data-text="Account">
                        Account
                      </span>
                    </NavLink>
                  </div>
                </li>
              )}
              {!user && (
                <li>
                  <div className="o-hidden">
                    <NavLink to="/login" className="link" onClick={closeMenu}>
                      <span className="fill-text" data-text="Login">Login</span>
                    </NavLink>
                  </div>
                </li>
              )}
               <li><NavLink to="/contact-us" className="link" onClick={closeMenu}>
                      <span className="fill-text" data-text="Contact Us">Contact Us</span>
                    </NavLink></li>
              {/* <li>
                <div className="o-hidden">
                  <NavLink to="/returns" className="link" onClick={closeMenu}>
                    <span className="fill-text" data-text="Returns">
                      Returns
                    </span>
                  </NavLink>
                </div>
              </li> */}
            </ul>
          </div>
          {/* <div className="cont-info valign">
            <div className="text-center full-width">
              <div className="logo">
                <img src="/assets/imgs/megance_logo_w.png" alt="" />
              </div>
              <div className="social-icon mt-40">
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <i className="fab fa-x-twitter"></i>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <i className="fab fa-linkedin-in"></i>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()}>
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
                  <a href="mailto:Hello@email.com">Hello@email.com</a>
                </h5>
                <h5 className="underline">
                  <a href="tel:+18408412569">+1 840 841 25 69</a>
                </h5>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </>
  );
}
