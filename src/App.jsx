import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/general_components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import ProductPage from "./pages/Product.jsx";
import CartPage from "./pages/Cart.jsx";
import CheckoutPage from "./pages/Checkout.jsx";
import LoginPage from "./pages/Login.jsx";
import OrderSuccess from "./pages/OrderSuccess.jsx";
import TermsPage from "./pages/Terms.jsx";
import PrivacyPage from "./pages/Privacy.jsx";
import TermsOfUsePage from "./pages/TermsOfUse.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import RequireAuth from "./components/general_components/RequireAuth.jsx";
import "./styles/app-overrides.css";
import Loader from "./components/general_components/Loader.jsx";
import Analytics from "./components/general_components/Analytics.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Loader />
          <Analytics />
          {/* Global elements expected by legacy scripts */}
          <div className="loader-wrap">
            <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
              <path id="svg" d="M0,1005S175,995,500,995s500,5,500,5V0H0Z" />
            </svg>
            <div className="loader-wrap-heading">
              <div className="logo-blink">
                <img src="/assets/imgs/megance_logo_w.png" style={{ width: 400 }} alt="logo" />
              </div>
            </div>
          </div>

          <div className="cursor"></div>

          <div className="progress-wrap cursor-pointer">
            <svg className="progress-circle svg-content" width="100%" height="100%" viewBox="-1 -1 102 102">
              <path d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" />
            </svg>
          </div>

          <Navbar />
          <div id="smooth-wrapper">
            <div id="smooth-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route
                  path="/checkout"
                  element={
                    <RequireAuth>
                      <CheckoutPage />
                    </RequireAuth>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms-of-use" element={<TermsOfUsePage />} />
              </Routes>
            </div>
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
