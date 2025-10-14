import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/general_components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import ProductPage from "./pages/Product.jsx";
import CartPage from "./pages/Cart.jsx";
import CheckoutPage from "./pages/Checkout.jsx";
import LoginPage from "./pages/Login.jsx";
import Account from "./pages/Account.jsx";
import Setup from "./pages/Setup.jsx";
import OrderDetails from "./pages/OrderDetails.jsx";
import OrderSuccess from "./pages/OrderSuccess.jsx";
import TermsPage from "./pages/Terms.jsx";
import PrivacyPage from "./pages/Privacy.jsx";
import TermsOfUsePage from "./pages/TermsOfUse.jsx";
import About from "./pages/About.jsx";
import ReturnsPage from "./pages/Returns.jsx";
import ReturnSuccess from "./pages/ReturnSuccess.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import RequireAuth from "./components/general_components/RequireAuth.jsx";
import RequireProfile from "./components/general_components/RequireProfile.jsx";
import "./styles/app-overrides.css";
import Loader from "./components/general_components/Loader.jsx";
import Analytics from "./components/general_components/Analytics.jsx";
import ErrorBoundary from "./components/general_components/ErrorBoundary.jsx";
import { ToastProvider } from "./components/general_components/ToastProvider.jsx";
import RecaptchaHost from "./components/general_components/RecaptchaHost.jsx";
import { useEffect } from "react";
import { loadRazorpay } from "./utils/razorpay";

export default function App() {
  // Optionally preload Razorpay in production to reduce checkout delay
  useEffect(() => {
    try {
      const shouldPreload = import.meta.env.MODE === 'production' && (import.meta.env.VITE_PRELOAD_RAZORPAY ?? 'true') !== 'false';
      if (shouldPreload) loadRazorpay().catch(() => {});
    } catch {}
  }, []);
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Loader />
          <Analytics />
          <div className="cursor"></div>

          <div className="progress-wrap cursor-pointer">
            <svg className="progress-circle svg-content" width="100%" height="100%" viewBox="-1 -1 102 102">
              <path d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" />
            </svg>
          </div>

          <Navbar />
          <ErrorBoundary>
          <ToastProvider>
          <RecaptchaHost />
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
                      <RequireProfile>
                        <CheckoutPage />
                      </RequireProfile>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/setup"
                  element={
                    <RequireAuth>
                      <Setup />
                    </RequireAuth>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms-of-use" element={<TermsPage />} />
                <Route path="/about-us" element={<About />} />
                <Route
                  path="/returns"
                  element={
                    <RequireAuth>
                      <ReturnsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/return-success"
                  element={
                    <RequireAuth>
                      <ReturnSuccess />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <RequireAuth>
                      <Account />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/account/orders/:id"
                  element={
                    <RequireAuth>
                      <OrderDetails />
                    </RequireAuth>
                  }
                />
              </Routes>
            </div>
          </div>
          </ToastProvider>
          </ErrorBoundary>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
