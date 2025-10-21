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

WhatsApp Order Confirmation (Twilio)

- A Cloud Function `sendWhatsappOnOrder` sends a WhatsApp template message when an order is created (status `ordered`/`paid`/`completed`/`success`). It uses your approved Twilio Content Template and fills the following variables:
  1. Customer first name
  2. Order label (e.g., MGXABC123)
  3. Order date (e.g., October 10, 2025)
  4. Items summary (e.g., "Infinity Sneakers (Size 9) x1")
  5. Amount (pre-discount)
  6. Discount
  7. Payable (net + GST)

  Configure the following Firebase Functions secrets (replace with your values):

  - `firebase functions:secrets:set TWILIO_ACCOUNT_SID`
  - `firebase functions:secrets:set TWILIO_AUTH_TOKEN`
  - `firebase functions:secrets:set TWILIO_WHATSAPP_FROM`  # e.g. whatsapp:+919311939989
  - `firebase functions:secrets:set TWILIO_TEMPLATE_SID`   # e.g. HX056b7c53233e5b24148158d4d46c1679

  Notes:
  - The function formats the recipient using the order’s `billing.phone`. If a local 10‑digit Indian number is provided, it’s sent as `whatsapp:+91XXXXXXXXXX`.
  - If any Twilio secret is missing, the function logs and skips sending.
  - The order doc is annotated with `waSent`, `waMessageSid`, and `waSentAt` upon success.

Shipments (XpressBees)

- A Cloud Function `createXpressbeesShipmentOnOrder` creates a shipment on XpressBees when an order is created. It mirrors Twilio’s idempotent lock pattern and only fires for:
  - COD orders immediately, or
  - Online orders after payment verification (`paymentVerified = true` or status in `paid/completed/success`).

  Configure credentials/secrets via Firebase (do not hardcode):

  - `firebase functions:secrets:set XPRESSBEES_USERNAME`  # your XpressBees login (e.g., support@megance.com)
  - `firebase functions:secrets:set XPRESSBEES_PASSWORD`  # your XpressBees password (e.g., Megance@2025)

  Optional environment variables for tuning and pickup details (set in your Functions environment):

  - `XPRESSBEES_BASE_URL`            # default: https://shipment.xpressbees.com
  - `XPRESSBEES_AUTH_URL`            # optional explicit login URL if account differs; by default tries /api/auth/login, /api/users/login
  - `XPRESSBEES_ENABLED`             # set to `false` to disable (default: true)
  - `XPRESSBEES_PICKUP_CODE`         # use saved pickup location code (preferred)
  - `XPRESSBEES_PICKUP_NAME`         # fallback explicit pickup address fields
  - `XPRESSBEES_PICKUP_PHONE`
  - `XPRESSBEES_PICKUP_EMAIL`
  - `XPRESSBEES_PICKUP_ADDRESS`
  - `XPRESSBEES_PICKUP_CITY`
  - `XPRESSBEES_PICKUP_STATE`
  - `XPRESSBEES_PICKUP_PINCODE`
  - `XPRESSBEES_DEFAULT_WEIGHT`      # kg, default: 0.7
  - `XPRESSBEES_DEFAULT_LENGTH`      # cm, default: 30
  - `XPRESSBEES_DEFAULT_BREADTH`     # cm, default: 20
  - `XPRESSBEES_DEFAULT_HEIGHT`      # cm, default: 10

  Notes:
  - The function writes shipment metadata back to the order: `xbCreated`, `xbStatus`, `xbAwb`, `xbTrackingNo`, `xbShipmentId`, and the raw provider response `xbRaw`.
  - The function logs in to XpressBees using your username/password to obtain a token, caches it (document `integrations/xpressbees`), and sends both `Authorization: Bearer <token>` and `token: <token>` headers to `shipments2`.
  - Idempotency is handled via `xbLock`; if a previous attempt is in progress or completed, re-entry is skipped.
  - The payload uses a generic `shipments2` structure. If your XpressBees account expects slightly different field names, set `XPRESSBEES_PICKUP_CODE` or we can adapt mappings.

Admin repair endpoint

- HTTP: `createXpressbeesShipment` (admin only)
  - POST with JSON `{ orderId, force?: boolean }`
  - Authorization: `Bearer <Firebase ID token>`; allowed for `OWNER_EMAIL` or users with custom claim `admin: true`.
  - Returns `{ ok, awb, tracking, shipmentId, raw }` and updates the order with `xb*` fields. `force=true` overrides an existing `xbCreated` or `xbLock`.

Onboarding & Profiles

- Phone verification is authoritative via Firebase Auth (we check `user.phoneNumber`). The client no longer sets `phoneVerified`; the server writes it based on the auth record.
- User profile writes are routed to a Firebase Function `updateUserProfile` which validates the ID token and persists the profile on the server. Set `VITE_FUNCTIONS_BASE_URL` in your environment.
- A server trigger `onUserCreated` initializes a `users/{uid}` document on first sign-in.

Coupons

- Server validates coupons through callable `previewCoupon` (auth required). It enforces active window, minimum amount, global `maxUses`, and per-user limits, and returns `{ ok, code, discount }`.
- When an order is created, redemption finalizes server-side (in both the Firestore trigger and callable `decrementStockForOrder`). It increments `coupons/{code}.totalUses` and `coupons/{code}/users/{uid}.count`, and annotates the order with `coupon = { code, discount, valid }`.
- Frontend calls `previewCoupon` on apply and includes `couponCode` in the order payload. The discount shown is the server’s computed value.

Returns uploads (Supabase)

- Returns/Refund form stores request metadata in Firestore (`refundRequests`) and uploads evidence images to Supabase Storage for efficient public delivery.
- Configure the following env vars in `.env`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_BUCKET` (defaults to `refund-requests`)
- The form saves the `publicUrl` for each uploaded file into Firestore.
