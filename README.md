# Megance React

Project structure overview after cleanup:

- src/components/general_components: Shared UI used across pages (Navbar, Logo, Loader, RequireAuth)
- src/components/homepage_components: Components used only on the home page (HeaderHero, Intro, USP, Marquee, ZellerSection, GalleryYellow, Testimonials, FAQ, Newsletter, Footer)
- src/pages: Route views (Home, Shop, Product, Cart, Checkout, Login, OrderSuccess)
- src/context: React contexts (AuthContext, CartContext)
- src/data: Static data (products, coupons, indian-states)
- src/styles: Local CSS overrides and loader styles
- src/utils: Utilities (e.g. Razorpay integration)
- public/assets, public/common: Static assets from the template and site

Notes:

- Removed unused dev artifacts: src/data/test, src/data/test.cpp, src/components/ProductCard.jsx
- Fixed a broken logo path in Navbar hamenu (now uses /assets/imgs/megance_logo_w.png)
- Archived unused static pages by removal: public/login.html, public/register.html
- Kept vendor assets and CSS in public/ intact to avoid breaking legacy styles/scripts
