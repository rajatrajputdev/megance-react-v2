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

Security & Payments

- Coupons in `src/data/coupons.js` are for demo only. Do not rely on client-side validation for discounts in production. Validate coupon codes and eligibility on your server, then compute and return the final discount that the client should apply.

- Razorpay best practice is to create orders and verify signatures on the server. This repo includes two Firebase Functions to support that flow:
  - `createRazorpayOrder` (HTTP): creates a Razorpay order using server secrets and returns `{ order, keyId }`.
  - `verifyRazorpaySignature` (HTTP): validates the HMAC signature from Razorpay and marks the Firestore order as `paid`.

  Configure secrets (once) via Firebase:

  - `firebase functions:secrets:set RAZORPAY_KEY_ID`
  - `firebase functions:secrets:set RAZORPAY_KEY_SECRET`

  Client flow (high level):
  1. Call `createRazorpayOrder` with amount and receipt to get an `order.id` and `keyId`.
  2. Pass `keyId` and `order.id` to Razorpay Checkout (client).
  3. On success, post `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDocId }` to `verifyRazorpaySignature`.
  4. Only after successful verification, treat the order as paid in your UI and back office.

  The existing Checkout flow still supports a simplified client-only payment for development. Transition to the server flow before going live.

Onboarding & Profiles

- Phone verification is authoritative via Firebase Auth (we check `user.phoneNumber`). The client no longer sets `phoneVerified`; the server writes it based on the auth record.
- User profile writes are routed to a Firebase Function `updateUserProfile` which validates the ID token and persists the profile on the server. Set `VITE_FUNCTIONS_BASE_URL` in your environment.
- A server trigger `onUserCreated` initializes a `users/{uid}` document on first sign-in.

Coupons

- Server validates coupons through callable `previewCoupon` (auth required). It enforces active window, minimum amount, global `maxUses`, and per-user limits, and returns `{ ok, code, discount }`.
- When an order is created, redemption finalizes server-side (in both the Firestore trigger and callable `decrementStockForOrder`). It increments `coupons/{code}.totalUses` and `coupons/{code}/users/{uid}.count`, and annotates the order with `coupon = { code, discount, valid }`.
- Frontend calls `previewCoupon` on apply and includes `couponCode` in the order payload. The discount shown is the server’s computed value.
