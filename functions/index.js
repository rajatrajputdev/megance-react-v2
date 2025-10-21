const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const {
  onRequest,
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
// Lazy/guarded import to avoid local analyzer crash if deps not installed yet
let PDFDocument;
try {
  PDFDocument = require("pdfkit");
} catch (_) {
  /* will load inside handler */
}

try {
  admin.initializeApp();
} catch (_) {}

const REGION = process.env.FUNCTIONS_REGION || "asia-south2";
// Company constants for invoices
const MEGANCE_GSTIN = process.env.MEGANCE_GSTIN || "27AAACB2230M1Z5"; // dummy-format GSTIN
const MEGANCE_LOGO_URL = process.env.MEGANCE_LOGO_URL ||
  "https://megance.in/assets/imgs/megance_logo_w.png";
// Hardcoded warehouse address for outbound and reverse delivery
const MEGANCE_WAREHOUSE_ADDRESS = (process.env.MEGANCE_WAREHOUSE_ADDRESS ||
  "A-51, First floor, Meera Bagh, Paschim Vihar, New Delhi 110087").trim();

// Owner email to receive order copies
const OWNER_EMAIL = "megancetech@gmail.com";

// Secrets
const MAIL_USER = defineSecret("MAIL_USER");
const MAIL_PASS = defineSecret("MAIL_PASS");
const MAIL_FROM = defineSecret("MAIL_FROM");

// Twilio WhatsApp (use Firebase secrets; do NOT hardcode credentials)
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_FROM = defineSecret("TWILIO_WHATSAPP_FROM"); // e.g. whatsapp:+14155238886 or approved sender ID
const TWILIO_TEMPLATE_SID = defineSecret("TWILIO_TEMPLATE_SID"); // e.g. HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

// XpressBees shipment creation (use secrets; do NOT hardcode credentials)
const XPRESSBEES_USERNAME = defineSecret("XPRESSBEES_USERNAME");
const XPRESSBEES_PASSWORD = defineSecret("XPRESSBEES_PASSWORD");

// Helper: robust env boolean
function envBool(name, def = true) {
  const v = String(process.env[name] || "")
    .trim()
    .toLowerCase();
  if (!v) return !!def;
  return ["1", "true", "yes", "y", "on"].includes(v);
}

// Hardcoded XpressBees configuration (requested)
const XB_ORIGIN = 'https://shipment.xpressbees.com';
const XB_LOGIN_URL = 'https://shipment.xpressbees.com/api/users/login';
const XB_HC_EMAIL = 'support@megance.com';
const XB_HC_PASSWORD = 'Megance@2025';

// Always login and return a fresh XpressBees token (no caching)
async function getXpressbeesToken({ username, password }) {
  const email = (username || XB_HC_EMAIL).trim();
  const pass = (password || XB_HC_PASSWORD).trim();
  const resp = await fetch(XB_LOGIN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  let json = null;
  try { json = await resp.json(); } catch { json = null; }
  if (!resp.ok) {
    const err = (json && (json.message || json.error)) || `HTTP ${resp.status}`;
    throw new Error(err);
  }
  let tok = null;
  if (json) {
    // Handle 'data' as a raw token string
    if (typeof json.data === 'string') tok = json.data;
    if (!tok) tok = json.token || json.access_token || (json.data && (json.data.token || json.data.access_token)) || null;
  }
  if (!tok) throw new Error('Login ok but no token');
  return tok;
}

function pickEmail(...candidates) {
  const isValid = (s) => {
    try {
      const v = String(s || "").trim();
      return !!v && v.includes("@") && v.length <= 190;
    } catch {
      return false;
    }
  };
  for (const c of candidates) {
    if (isValid(c)) return String(c).trim();
  }
  return "support@megance.com";
}

function onlyDigits(s) {
  try {
    return String(s || "").replace(/[^\d]/g, "");
  } catch {
    return "";
  }
}
function phone10(s) {
  const d = onlyDigits(s);
  if (d.length >= 10) return d.slice(-10);
  return d;
}
function pin6(s) {
  const d = onlyDigits(s);
  return d.length >= 6 ? d.slice(0, 6) : d;
}
function trunc(str, n) {
  try {
    const s = String(str || "");
    return s.length > n ? s.slice(0, n) : s;
  } catch {
    return "";
  }
}
function splitAddress(addr) {
  try {
    const s = String(addr || "").trim();
    if (!s) return { address: "", address_2: "" };
    const parts = s.split(/,\s*/);
    const a1 = trunc(parts.slice(0, 2).join(", "), 200) || trunc(s, 200);
    const a2 = trunc(parts.slice(2).join(", "), 200);
    return { address: a1, address_2: a2 };
  } catch {
    return { address: "", address_2: "" };
  }
}
function kgToGrams(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return 500;
  return Math.max(1, Math.round(n * 1000));
}

function buildXbShipmentPayload({ orderId, orderLabel, data, isCOD }) {
  const billing = data.billing || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const amount = Math.round(Number(data.amount) || 0);
  const discount = Math.round(Number(data.discount) || 0);
  const base = Math.max(0, amount - discount);
  const gst = Number.isFinite(Number(data.gst))
    ? Math.round(Number(data.gst))
    : Math.round(base * 0.18);
  const payable = Math.round(Number(data.payable) || base + gst);
  // Some courier integrations validate collectable_amount against their computed
  // "order amount" (often derived from items) and may subtract the provided
  // discount again. To avoid "collectable amount should be <= order amount"
  // for COD when GST is added client-side, set invoice/order amount high enough
  // to cover the payable + discount (i.e., base + GST).
  const invoiceValue = Math.max(0, payable + discount); // equals amount + gst

  const dwKg = Number(process.env.XPRESSBEES_DEFAULT_WEIGHT || 0.7);
  const grams = kgToGrams(dwKg);
  const dl = Number(process.env.XPRESSBEES_DEFAULT_LENGTH || 30);
  const dbt = Number(process.env.XPRESSBEES_DEFAULT_BREADTH || 20);
  const dh = Number(process.env.XPRESSBEES_DEFAULT_HEIGHT || 10);

  // Hardcode pickup (our warehouse) for forward shipments
  const pickupPhone = phone10(process.env.XPRESSBEES_PICKUP_PHONE || "9999999999");
  const shipPhone = phone10(billing.phone || "");
  const shipPin = pin6(billing.zip || "");
  const whNameRaw = "Megance Warehouse";
  const warehouse_name = trunc(whNameRaw, 20) || "MeganceWH1";
  // Parse the hardcoded warehouse address
  const whAddrStr = MEGANCE_WAREHOUSE_ADDRESS;
  const pinMatch = whAddrStr.match(/(\d{6})(?!.*\d)/);
  const pickupPin = pinMatch ? pin6(pinMatch[1]) : pin6(process.env.XPRESSBEES_PICKUP_PINCODE || "");
  const whAddrNoPin = whAddrStr.replace(/\d{6}(?!.*\d)/, '').replace(/,\s*$/, '').trim();
  const { address: pickupAddr1, address_2: pickupAddr2 } = splitAddress(whAddrNoPin);
  const { address: shipAddr1, address_2: shipAddr2 } = splitAddress(
    billing.address || ""
  );
  const gstNo = (
    process.env.XPRESSBEES_PICKUP_GST ||
    process.env.XPRESSBEES_GST_NUMBER ||
    ""
  ).trim();

  const order_items = items.map((it) => ({
    name: String(it.name || ""),
    qty: String(Number(it.qty) || 1),
    price: String(Number(it.price) || 0),
    sku: String(it.id || ""),
  }));

  const collectable = isCOD ? payable : 0;
  const payment_type = isCOD ? "cod" : "prepaid";
  const autoPickup =
    (process.env.XPRESSBEES_AUTO_PICKUP || "yes").toLowerCase() === "yes"
      ? "yes"
      : "no";

  return {
    order_number: trunc(orderLabel, 20),
    payment_type,
    order_amount: invoiceValue,
    // Discount already reflected in invoiceValue; avoid double subtracting
    discount: 0,
    shipping_charges: Number(process.env.XPRESSBEES_SHIPPING_CHARGES || 0),
    cod_charges: Number(process.env.XPRESSBEES_COD_CHARGES || 0),
    ...(process.env.XPRESSBEES_COURIER_ID
      ? { courier_id: String(process.env.XPRESSBEES_COURIER_ID).trim() }
      : {}),
    package_weight: grams,
    package_length: dl,
    package_breadth: dbt,
    package_height: dh,
    request_auto_pickup: autoPickup,
    consignee: {
      name: trunc(billing.name || "", 200),
      company_name: trunc(process.env.XPRESSBEES_CONSIGNEE_COMPANY || "", 200),
      address: shipAddr1,
      address_2: shipAddr2,
      city: trunc(billing.city || "", 40),
      state: trunc(billing.state || "", 40),
      pincode: shipPin,
      phone: shipPhone,
    },
    pickup: {
      warehouse_name,
      name: trunc("Megance", 200),
      address: pickupAddr1,
      address_2: pickupAddr2,
      city: trunc("New Delhi", 40),
      state: trunc("Delhi", 40),
      pincode: pickupPin,
      phone: pickupPhone,
      ...(gstNo ? { gst_number: gstNo, gst_umber: gstNo } : {}),
    },
    order_items,
    collectable_amount: collectable,
  };
}

// Build a reverse-pickup shipment payload: pickup from buyer, deliver back to warehouse
function buildXbReversePayload({ orderLabel, data, pickupOverride }) {
  const billing = data.billing || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const amount = Math.round(Number(data.amount) || 0);
  const discount = Math.round(Number(data.discount) || 0);
  const base = Math.max(0, amount - discount);
  const gst = Number.isFinite(Number(data.gst))
    ? Math.round(Number(data.gst))
    : Math.round(base * 0.18);
  const payable = Math.round(Number(data.payable) || base + gst);

  const dwKg = Number(process.env.XPRESSBEES_DEFAULT_WEIGHT || 0.7);
  const grams = kgToGrams(dwKg);
  const dl = Number(process.env.XPRESSBEES_DEFAULT_LENGTH || 30);
  const dbt = Number(process.env.XPRESSBEES_DEFAULT_BREADTH || 20);
  const dh = Number(process.env.XPRESSBEES_DEFAULT_HEIGHT || 10);

  // In reverse, pickup is buyer (allow override from returns form)
  const pName = pickupOverride?.name || billing.name || "";
  const pPhone = phone10(pickupOverride?.phone || billing.phone || "");
  const pZipRaw = pickupOverride?.zip || pickupOverride?.pincode || pickupOverride?.pin || "";
  const pickupPin = pin6(pZipRaw || billing.zip || "");
  const pickupAddressRaw = pickupOverride?.address || billing.address || "";
  const { address: pickupAddr1, address_2: pickupAddr2 } = splitAddress(pickupAddressRaw);
  const pickupCity = trunc(pickupOverride?.city || billing.city || "", 40);
  const pickupState = trunc(pickupOverride?.state || billing.state || "", 40);

  // Consignee is warehouse (where it originally came from)
  // Hardcode consignee (warehouse) for reverse deliveries
  const whNameRaw = "Megance Warehouse";
  const warehouse_name = trunc(whNameRaw, 20);
  // Parse the hardcoded address
  const whAddrStr = MEGANCE_WAREHOUSE_ADDRESS;
  const pinMatch = whAddrStr.match(/(\d{6})(?!.*\d)/);
  const consigneePin = pinMatch ? pin6(pinMatch[1]) : pin6(process.env.XPRESSBEES_PICKUP_PINCODE || "");
  // Remove pincode from end for cleaner split
  const whAddrNoPin = whAddrStr.replace(/\d{6}(?!.*\d)/, '').replace(/,\s*$/, '').trim();
  const { address: consAddr1, address_2: consAddr2 } = splitAddress(whAddrNoPin);
  // Derive city/state – default to New Delhi / Delhi
  const cityGuess = (() => {
    const parts = whAddrNoPin.split(/,\s*/);
    return parts[parts.length - 1] || 'New Delhi';
  })();
  const consigneePhone = phone10(process.env.XPRESSBEES_PICKUP_PHONE || "");
  const gstNo = (
    process.env.XPRESSBEES_PICKUP_GST ||
    process.env.XPRESSBEES_GST_NUMBER ||
    ""
  ).trim();

  const order_items = items.map((it) => ({
    name: String(it.name || ""),
    qty: String(Number(it.qty) || 1),
    price: String(Number(it.price) || 0),
    sku: String(it.id || ""),
  }));

  // Return shipments are prepaid by us; buyer pays nothing on pickup
  const collectable = 0;
  const payment_type = "prepaid";
  const autoPickup =
    (process.env.XPRESSBEES_AUTO_PICKUP || "yes").toLowerCase() === "yes"
      ? "yes"
      : "no";

  return {
    order_number: trunc(orderLabel, 20),
    payment_type,
    order_amount: payable,
    discount: discount || 0,
    shipping_charges: Number(process.env.XPRESSBEES_SHIPPING_CHARGES || 0),
    cod_charges: 0,
    ...(process.env.XPRESSBEES_COURIER_ID
      ? { courier_id: String(process.env.XPRESSBEES_COURIER_ID).trim() }
      : {}),
    package_weight: grams,
    package_length: dl,
    package_breadth: dbt,
    package_height: dh,
    request_auto_pickup: autoPickup,
    // Swap roles: buyer as pickup, our warehouse as consignee
    pickup: {
      warehouse_name: trunc((pName || "Buyer").toString(), 20),
      name: trunc(pName || "", 200),
      address: pickupAddr1,
      address_2: pickupAddr2,
      city: pickupCity,
      state: pickupState,
      pincode: pickupPin,
      phone: pPhone,
    },
    consignee: {
      name: trunc("Megance", 200),
      company_name: trunc(warehouse_name, 200),
      address: consAddr1,
      address_2: consAddr2,
      city: trunc(cityGuess || "New Delhi", 40),
      state: trunc("Delhi", 40),
      pincode: consigneePin,
      phone: consigneePhone || "9999999999",
      ...(gstNo ? { gst_number: gstNo, gst_umber: gstNo } : {}),
    },
    order_items,
    collectable_amount: collectable,
    // Some integrations require a hint for reverse
    is_reverse: true,
  };
}

function buildTransporter(env) {
  const user = env.MAIL_USER || "";
  const pass = env.MAIL_PASS || "";
  const host = env.MAIL_HOST || "";
  const port = parseInt(env.MAIL_PORT || "0", 10);

  if (host && port) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  // Default to Gmail service via app password
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function currencyINR(n) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  } catch {
    return `₹ ${n || 0}`;
  }
}

function renderOrderEmail({ orderId, data, enrichedItems = [] }) {
  const created =
    data.createdAt && data.createdAt.toDate
      ? data.createdAt.toDate().toLocaleString()
      : "";
  const items =
    Array.isArray(enrichedItems) && enrichedItems.length
      ? enrichedItems
      : Array.isArray(data.items)
      ? data.items
      : [];
  const totalQty = items.reduce((a, b) => a + (b.qty || 0), 0);
  const rows = items
    .map((it) => {
      const unit = Number(it.price) || 0;
      const qty = Number(it.qty) || 0;
      const amount = unit * qty;
      const img = it.imageUrl
        ? `<img src="${it.imageUrl}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px;border:1px solid #eee;margin-right:10px" />`
        : "";
      const desc = it.description
        ? `<div style="color:#555;font-size:12px;margin-top:2px;max-width:520px">${String(
            it.description
          ).slice(0, 140)}</div>`
        : "";
      return `
      <tr>
        <td style="padding:8px 0">
          <div style="display:flex;align-items:center">
            ${img}
            <div>
              <div style="font-weight:600">${(it.name || "").toString()}</div>
              ${desc}
            </div>
          </div>
        </td>
        <td align="right" style="padding:8px 0">${qty}</td>
        <td align="right" style="padding:8px 0">${currencyINR(amount)}</td>
      </tr>`;
    })
    .join("");
  const billing = data.billing || {};
  const paymentMethod = (
    data.paymentMethod || (data.paymentId ? "online" : "cod")
  )
    .toString()
    .toUpperCase();
  const title = `Order #${(orderId || "")
    .toString()
    .slice(0, 6)
    .toUpperCase()}`;

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#111">
      <h2 style="margin:0 0 4px">${title}</h2>
      <div style="opacity:.7; font-size:13px;">Placed: ${created} · Payment: ${paymentMethod}${
    data.paymentId
      ? ` · <span style=\"opacity:.9\">${data.paymentId}</span>`
      : ""
  }</div>
      <div style="margin:16px 0;">
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr style="text-align:left; border-bottom:1px solid #eee">
              <th style="padding:6px 0">Item</th>
              <th style="text-align:right;padding:6px 0">Qty</th>
              <th style="text-align:right;padding:6px 0">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows ||
              '<tr><td colspan="3" style="opacity:.7;padding:8px 0">No items</td></tr>'
            }
          </tbody>
        </table>
      </div>
      <div style="margin-top:6px">
        <div><strong>Total items:</strong> ${totalQty}</div>
        <div><strong>Total:</strong> ${currencyINR(data.amount || 0)}</div>
        ${
          data.discount
            ? `<div><strong>Discount:</strong> - ${currencyINR(
                data.discount
              )}</div>`
            : ""
        }
        <div><strong>GST (18%):</strong> ${currencyINR(
          typeof data.gst === "number"
            ? data.gst
            : Math.round(
                Math.max(
                  0,
                  Number(data.amount || 0) - Number(data.discount || 0)
                ) * 0.18
              )
        )}</div>
        <div style="font-size:16px;margin-top:4px"><strong>Payable:</strong> ${currencyINR(
          data.payable || 0
        )}</div>
      </div>
      <hr style="margin:16px 0; border:none; border-top:1px solid #eee" />
      <div>
        <h3 style="margin:0 0 6px; font-size:16px">Billing</h3>
        <div>${billing.name || ""}</div>
        <div>${billing.email || ""}</div>
        <div>${billing.phone || ""}</div>
        <div style="margin-top:6px;max-width:560px">${[
          billing.address,
          billing.city,
          billing.state,
          billing.zip,
        ]
          .filter(Boolean)
          .join(", ")}</div>
      </div>
    </div>
  `;
  const text =
    `${title}\n` +
    `Placed: ${created}\nPayment: ${paymentMethod}${
      data.paymentId ? ` (${data.paymentId})` : ""
    }\n` +
    items
      .map(
        (it) =>
          ` - ${it.name} x ${it.qty} = ${
            Number(it.price || 0) * Number(it.qty || 0)
          }`
      )
      .join("\n") +
    "\n" +
    `Total: ${data.amount || 0}\n` +
    (data.discount ? `Discount: ${data.discount}\n` : "") +
    `Payable: ${data.payable || 0}\n` +
    `Billing: ${billing.name || ""}, ${billing.phone || ""}, ${
      billing.email || ""
    }\n` +
    `${[billing.address, billing.city, billing.state, billing.zip]
      .filter(Boolean)
      .join(", ")}`;
  return {
    html,
    text,
    subject: `${title} – ${currencyINR(data.payable || 0)}`,
  };
}

function formatWhatsappNumber(raw) {
  try {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (s.startsWith("whatsapp:")) return s;
    if (s.startsWith("+")) return `whatsapp:${s}`;
    const digits = s.replace(/[^\d]/g, "");
    if (!digits) return "";
    // Assume India if 10-digit local number
    if (digits.length === 10) return `whatsapp:+91${digits}`;
    if (digits.length >= 11 && digits.length <= 15)
      return `whatsapp:+${digits}`;
    return "";
  } catch (_) {
    return "";
  }
}

function summarizeItems(items) {
  try {
    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) return "-";
    const parts = arr.slice(0, 3).map((it) => {
      const name = (it?.name || "").toString();
      const qty = Number(it?.qty) || 1;
      const size = it?.meta?.size ? ` (Size ${String(it.meta.size)})` : "";
      return `${name}${size} x${qty}`;
    });
    let txt = parts.join(", ");
    if (arr.length > 3) txt += ` +${arr.length - 3} more`;
    return txt;
  } catch (_) {
    return "-";
  }
}

function findCaseInsensitiveKey(obj, key) {
  if (!obj || typeof obj !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return key;
  const low = String(key || "").toLowerCase();
  for (const k of Object.keys(obj)) {
    if (String(k).toLowerCase() === low) return k;
  }
  return null;
}

function isCouponActive(c, now = Date.now()) {
  if (!c) return false;
  if (c.isActive === false) return false;
  const start =
    c.startAt && c.startAt.toDate
      ? c.startAt.toDate().getTime()
      : c.startAt
      ? new Date(c.startAt).getTime()
      : 0;
  const end =
    c.endAt && c.endAt.toDate
      ? c.endAt.toDate().getTime()
      : c.endAt
      ? new Date(c.endAt).getTime()
      : 0;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function computeCouponDiscount(coupon, amount) {
  if (!coupon || !amount || amount <= 0) return 0;
  const minAmount = Number(coupon.minAmount) || 0;
  if (minAmount && amount < minAmount) return 0;
  const type = String(coupon.type || "").toLowerCase();
  const value = Number(coupon.value) || 0;
  let d = 0;
  if (type === "flat") d = Math.min(amount, value);
  else if (type === "percent") d = Math.floor((amount * value) / 100);
  const cap = Number(coupon.maxDiscount) || 0;
  if (cap && d > cap) d = cap;
  return Math.max(0, Math.min(amount, d));
}

async function validateCouponForUser({ db, code, uid, amount }) {
  const codeUp = String(code || "")
    .trim()
    .toUpperCase();
  if (!codeUp) return { ok: false, reason: "invalid_code" };
  const ref = db.doc(`coupons/${codeUp}`);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, reason: "not_found" };
  const c = snap.data() || {};
  if (!isCouponActive(c)) return { ok: false, reason: "inactive" };
  const amountNum = Math.round(Number(amount) || 0);
  const discount = computeCouponDiscount(c, amountNum);
  if (!discount) return { ok: false, reason: "amount_not_eligible" };
  // Limits
  const maxUses = Number(c.maxUses) || 0;
  const totalUses = Number(c.totalUses) || 0;
  if (maxUses && totalUses >= maxUses)
    return { ok: false, reason: "max_uses_reached" };
  const perUserLimit = Number(c.perUserLimit) || 1;
  if (uid && perUserLimit) {
    try {
      const us = await db.doc(`coupons/${codeUp}/users/${uid}`).get();
      const used = us.exists ? Number(us.data()?.count || 0) : 0;
      if (used >= perUserLimit)
        return { ok: false, reason: "user_limit_reached" };
    } catch (_) {}
  }
  return { ok: true, code: codeUp, discount, coupon: c };
}

exports.sendOwnerEmailOnOrder = onDocumentCreated(
  {
    document: "orders/{orderId}",
    region: REGION,
    secrets: [MAIL_USER, MAIL_PASS, MAIL_FROM],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    if (!data) return;

    const env = {
      MAIL_USER: MAIL_USER.value(),
      MAIL_PASS: MAIL_PASS.value(),
      MAIL_FROM: MAIL_FROM.value(),
      MAIL_HOST: process.env.MAIL_HOST || "",
      MAIL_PORT: process.env.MAIL_PORT || "",
    };

    if (!env.MAIL_USER || !env.MAIL_PASS) {
      console.warn(
        "[sendOwnerEmailOnOrder] MAIL_USER/MAIL_PASS not set; skipping email"
      );
      return;
    }

    // Enrich items with product images/descriptions
    const db = admin.firestore();
    const baseIds = new Map();
    const items = Array.isArray(data.items) ? data.items : [];
    for (const it of items) {
      try {
        const meta = it.meta || {};
        let size = meta.size ? String(meta.size) : "";
        let gender = meta.gender || null;
        let id = String(it.id || "");
        let base = id;
        if (size) {
          const idx = base.lastIndexOf(`-s${size}`);
          base = idx !== -1 ? base.slice(0, idx) : base;
        }
        if (gender && base.endsWith(`-${gender}`))
          base = base.slice(0, -`-${gender}`.length);
        else if (!gender) {
          if (base.endsWith("-men")) {
            base = base.slice(0, -4);
          } else if (base.endsWith("-women")) {
            base = base.slice(0, -6);
          }
        }
        if (base && !baseIds.has(base)) baseIds.set(base, null);
      } catch {}
    }
    const entries = Array.from(baseIds.keys());
    for (const pid of entries) {
      try {
        const ps = await db.doc(`products/${pid}`).get();
        baseIds.set(pid, ps.exists ? ps.data() || {} : null);
      } catch {
        baseIds.set(pid, null);
      }
    }
    const enriched = items.map((it) => {
      try {
        const meta = it.meta || {};
        let size = meta.size ? String(meta.size) : "";
        let gender = meta.gender || null;
        let id = String(it.id || "");
        let base = id;
        if (size) {
          const idx = base.lastIndexOf(`-s${size}`);
          base = idx !== -1 ? base.slice(0, idx) : base;
        }
        if (gender && base.endsWith(`-${gender}`))
          base = base.slice(0, -`-${gender}`.length);
        else if (!gender) {
          if (base.endsWith("-men")) {
            base = base.slice(0, -4);
          } else if (base.endsWith("-women")) {
            base = base.slice(0, -6);
          }
        }
        const pd = baseIds.get(base) || {};
        return {
          ...it,
          imageUrl: pd.imageUrl || it.imageUrl || null,
          description: pd.description || it.description || "",
        };
      } catch {
        return it;
      }
    });

    const transporter = buildTransporter(env);
    const from = env.MAIL_FROM || env.MAIL_USER;
    const { html, text, subject } = renderOrderEmail({
      orderId: event.params.orderId,
      data,
      enrichedItems: enriched,
    });

    // Send to owner
    await transporter.sendMail({ from, to: OWNER_EMAIL, subject, text, html });
    // Send to buyer if email present
    const buyer =
      data.billing && data.billing.email
        ? String(data.billing.email).trim()
        : "";
    if (buyer) {
      try {
        await transporter.sendMail({ from, to: buyer, subject, text, html });
      } catch (e) {
        console.warn(
          "[sendOwnerEmailOnOrder] buyer email failed",
          e?.message || e
        );
      }
    }
  }
);

// HTTP: Fulfill order (WhatsApp first, then XpressBees), and persist order
exports.fulfillOrder = onRequest({
  region: REGION,
  cors: true,
  secrets: [XPRESSBEES_USERNAME, XPRESSBEES_PASSWORD, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_TEMPLATE_SID],
}, async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // Validate payload
    const errors = [];
    const billing = body.billing || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const pm = String(body.paymentMethod || '').toLowerCase();
    const paymentMethod = pm === 'cod' ? 'cod' : (pm === 'prepaid' || pm === 'online' ? 'online' : '');
    if (!paymentMethod) errors.push('paymentMethod must be "cod" or "prepaid"');
    if (!billing || !billing.name) errors.push('billing.name required');
    if (!billing || !billing.phone) errors.push('billing.phone required');
    if (!billing || !billing.address) errors.push('billing.address required');
    if (!billing || !billing.city) errors.push('billing.city required');
    if (!billing || !billing.state) errors.push('billing.state required');
    if (!billing || !billing.zip) errors.push('billing.zip required');
    if (!items.length) errors.push('items array required');
    for (const [i, it] of items.entries()) {
      if (!it || typeof it !== 'object') { errors.push(`items[${i}] invalid`); continue; }
      if (!it.id) errors.push(`items[${i}].id required`);
      if (!it.name) errors.push(`items[${i}].name required`);
      if (!(Number(it.price) >= 0)) errors.push(`items[${i}].price required`);
      if (!(Number(it.qty) > 0)) errors.push(`items[${i}].qty required`);
    }
    if (errors.length) { res.status(400).json({ error: 'invalid_payload', details: errors }); return; }

    // Compute amounts
    const amount = items.reduce((a, it) => a + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
    const discount = Math.max(0, Number(body.discount || 0));
    const net = Math.max(0, amount - discount);
    const gst = Number.isFinite(Number(body.gst)) ? Math.round(Number(body.gst)) : Math.round(net * 0.18);
    const payable = Math.round(Number(body.payable || (net + gst)));

    const db = admin.firestore();
    // Create order doc first (authoritative record)
    const orderData = {
      userId: String(body.userId || '' ) || null,
      items: items.map((x) => ({ id: String(x.id), name: String(x.name), price: Number(x.price), qty: Number(x.qty), meta: x.meta || null })),
      amount, discount, gst, payable,
      couponCode: body.couponCode ? String(body.couponCode).toUpperCase() : null,
      status: 'ordered',
      paymentMethod,
      paymentId: paymentMethod === 'cod' ? 'COD' : String(body.paymentId || ''),
      billing: {
        name: String(billing.name), email: String(billing.email || ''), phone: String(billing.phone),
        address: String(billing.address), city: String(billing.city), state: String(billing.state), zip: String(billing.zip),
      },
      fulfillmentLock: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      via: 'http-fulfill',
    };
    const ref = await db.collection('orders').add(orderData);
    const orderId = ref.id;
    const orderLabel = `MGX${orderId.slice(0,6).toUpperCase()}`;

    // Send WhatsApp
    let twilioResult = { ok: false, sid: null, error: null };
    try {
      const accountSid = TWILIO_ACCOUNT_SID.value() || process.env.TWILIO_ACCOUNT_SID || '';
      const authToken = TWILIO_AUTH_TOKEN.value() || process.env.TWILIO_AUTH_TOKEN || '';
      const from = TWILIO_WHATSAPP_FROM.value() || process.env.TWILIO_WHATSAPP_FROM || '';
      const templateSid = TWILIO_TEMPLATE_SID.value() || process.env.TWILIO_TEMPLATE_SID || '';
      const to = formatWhatsappNumber(billing.phone);
      if (accountSid && authToken && from && templateSid && to) {
        const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
        const itemsSummary = summarizeItems(items);
        const contentVariables = JSON.stringify({ '1': String(billing.name).split(/\s+/)[0] || 'there', '2': String(orderLabel), '3': String(dateStr), '4': String(itemsSummary), '5': String(amount), '6': String(discount), '7': String(payable) });
        const bodyForm = new URLSearchParams({ From: from, To: to, ContentSid: templateSid, ContentVariables: contentVariables }).toString();
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `Basic ${auth}` }, body: bodyForm });
        if (resp.ok) { const msg = await resp.json().catch(()=>({})); twilioResult = { ok: true, sid: msg?.sid || null, error: null }; await ref.set({ waSent: true, waMessageSid: msg?.sid || null, waSentAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }); }
        else { const txt = await resp.text().catch(()=> ''); twilioResult = { ok: false, sid: null, error: txt || `HTTP ${resp.status}` }; }
      } else { twilioResult = { ok: false, sid: null, error: 'Twilio not configured or invalid phone' }; }
    } catch (e) { twilioResult = { ok: false, sid: null, error: e?.message || String(e) }; }

    // Create shipment
    let xbResult = { ok: false, awb: null, shipmentId: null, error: null };
    try {
      const username = XPRESSBEES_USERNAME.value() || process.env.XPRESSBEES_USERNAME || '';
      const password = XPRESSBEES_PASSWORD.value() || process.env.XPRESSBEES_PASSWORD || '';
      if (!username || !password) throw new Error('XpressBees credentials not configured');
      if (String(process.env.XPRESSBEES_ENABLED || 'true').toLowerCase() === 'false') throw new Error('XpressBees disabled');
      const token = await getXpressbeesToken({ username, password });
      const payload = buildXbShipmentPayload({ orderId, orderLabel, data: orderData, isCOD: paymentMethod === 'cod' });
      const url = `${XB_ORIGIN}/api/shipments2`;
      let resp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (resp.status === 401 || resp.status === 403) { const fresh = await getXpressbeesToken({ username, password }); resp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${fresh}` }, body: JSON.stringify(payload) }); }
      const ok = resp.ok; let raw = null; try { raw = await resp.json(); } catch { try { raw = await resp.text(); } catch { raw = null; } }
      let awb = null, shipmentId = null; try { const s = raw && typeof raw === 'object' ? (raw.data || raw || {}) : {}; awb = s?.awb_number || s?.awb || s?.awbno || null; shipmentId = s?.shipment_id || s?.order_id || s?.id || null; } catch {}
      xbResult = { ok, awb, shipmentId, error: ok ? null : (typeof raw === 'string' ? raw : (raw?.message || `HTTP ${resp.status}`)) };
      await ref.set({ xbCreated: !!ok, xbStatus: ok ? 'created' : 'failed', xbAwb: awb || null, xbShipmentId: shipmentId || null, xbRaw: raw || null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (e) { xbResult = { ok: false, awb: null, shipmentId: null, error: e?.message || String(e) }; }

    // Discord log
    try {
      const webhook = (process.env.DISCORD_WEBHOOK_URL || 'https://discordapp.com/api/webhooks/1427366532794810488/A8ixxfB6YTIRjnY4cTMiVVxm9bOq33biY3E3NhYMhjytAmP89_y_S_9s28NTPJ5GxFX1').trim();
      const content = `Order ${orderLabel} (${paymentMethod==='cod'?'COD':'Prepaid'})\nTwilio: ${twilioResult.ok ? 'OK' : 'ERR'}${twilioResult.sid ? ' sid=' + twilioResult.sid : ''}${twilioResult.error ? ' • ' + twilioResult.error : ''}\nXpressBees: ${xbResult.ok ? 'OK' : 'ERR'}${xbResult.awb ? ' awb=' + xbResult.awb : ''}${xbResult.error ? ' • ' + xbResult.error : ''}`;
      await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content }) });
    } catch {}

    await ref.set({ fulfillmentDone: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    res.status(200).json({ ok: true, orderId, amounts: { amount, discount, gst, payable }, wa: twilioResult, xb: xbResult });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Internal error' });
  }
});
// Decrement product stock when an order is created.
// Idempotent via an order flag `stockDeducted` in the same transaction.
exports.decrementStockOnOrder = onDocumentCreated(
  {
    document: "orders/{orderId}",
    region: REGION,
  },
  async (event) => {
    const db = admin.firestore();
    const orderId = event.params.orderId;
    const orderRef = db.doc(`orders/${orderId}`);
    console.log("[decrementStockOnOrder] Triggered for order", orderId);

    function parseItem(it) {
      try {
        const meta = it.meta || {};
        let size = meta.size ? String(meta.size) : "";
        let gender = meta.gender || null;
        let id = String(it.id || "");
        let base = id;
        if (size) {
          const idx = base.lastIndexOf(`-s${size}`);
          base = idx !== -1 ? base.slice(0, idx) : base;
        }
        // Strip gender suffix from base id if present (regardless of whether meta.gender exists)
        if (gender && base.endsWith(`-${gender}`)) {
          base = base.slice(0, -`-${gender}`.length);
        } else if (!gender) {
          if (base.endsWith("-men")) {
            gender = "men";
            base = base.slice(0, -4);
          } else if (base.endsWith("-women")) {
            gender = "women";
            base = base.slice(0, -6);
          }
        }
        return { productId: base, size, gender, qty: Number(it.qty) || 0 };
      } catch (_) {
        return null;
      }
    }

    await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        console.log("[decrementStockOnOrder] No order snapshot");
        return;
      }
      // Proceed for typical success statuses; be lenient to support test flows
      const status = String(orderSnap.get("status") || "").toLowerCase();
      if (
        status &&
        !["ordered", "paid", "completed", "success"].includes(status)
      ) {
        console.log("[decrementStockOnOrder] Ignoring status", status);
        return;
      }

      const items = Array.isArray(orderSnap.get("items"))
        ? orderSnap.get("items")
        : [];
      const uid = orderSnap.get("userId") || null;
      const amount = Number(orderSnap.get("amount") || 0);
      const couponCodeRaw = orderSnap.get("couponCode") || "";
      const couponCode = String(couponCodeRaw || "")
        .trim()
        .toUpperCase();
      const stockAlready = orderSnap.get("stockDeducted") === true;
      const couponAlready =
        orderSnap.get("couponRedeemed") === true ||
        orderSnap.get("coupon")?.valid === true;
      const grouped = new Map();
      for (const it of items) {
        const p = parseItem(it);
        if (!p || !p.productId) continue;
        if (!grouped.has(p.productId)) grouped.set(p.productId, []);
        grouped.get(p.productId).push(p);
      }

      if (!stockAlready) {
        for (const [productId, parts] of grouped.entries()) {
          const ref = db.doc(`products/${productId}`);
          const snap = await tx.get(ref);
          if (!snap.exists) {
            console.log("[decrementStockOnOrder] Product missing:", productId);
            continue;
          }
          const data = snap.data() || {};

          let updates = {};
          let topQty = Number(data.quantity) || 0;
          let applied = false;

          if (data.sizeQuantities && typeof data.sizeQuantities === "object") {
            const sq = { ...data.sizeQuantities };
            for (const p of parts) {
              if (!p.size || !p.gender) continue;
              const gkey = findCaseInsensitiveKey(sq, p.gender);
              const arr = gkey && Array.isArray(sq[gkey]) ? [...sq[gkey]] : [];
              const idx = arr.findIndex(
                (r) => String(r.size) === String(p.size)
              );
              if (idx !== -1) {
                const cur = Number(arr[idx].quantity) || 0;
                arr[idx] = { ...arr[idx], quantity: Math.max(0, cur - p.qty) };
                if (gkey) sq[gkey] = arr;
              }
            }
            updates.sizeQuantities = sq;
            // recompute total
            topQty = 0;
            for (const g of Object.keys(sq)) {
              const arr = Array.isArray(sq[g]) ? sq[g] : [];
              topQty += arr.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
            }
            applied = true;
          } else if (
            Array.isArray(data.sizes) &&
            data.sizes.length &&
            typeof data.sizes[0] === "object"
          ) {
            const sizes = [...data.sizes];
            for (const p of parts) {
              if (!p.size) continue;
              const idx = sizes.findIndex(
                (r) => String(r.size) === String(p.size)
              );
              if (idx !== -1) {
                const cur = Number(sizes[idx].quantity) || 0;
                sizes[idx] = {
                  ...sizes[idx],
                  quantity: Math.max(0, cur - p.qty),
                };
              }
            }
            updates.sizes = sizes;
            topQty = sizes.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
            applied = true;
          } else if (data.sizes && typeof data.sizes === "object") {
            const smap = { ...data.sizes };
            for (const p of parts) {
              if (!p.size) continue;
              const gkey = findCaseInsensitiveKey(smap, p.gender || "");
              const arr =
                gkey && Array.isArray(smap[gkey]) ? [...smap[gkey]] : [];
              const objIdx = arr.findIndex(
                (r) =>
                  r &&
                  typeof r === "object" &&
                  String(r.size) === String(p.size)
              );
              if (objIdx !== -1) {
                const cur = Number(arr[objIdx].quantity) || 0;
                arr[objIdx] = {
                  ...arr[objIdx],
                  quantity: Math.max(0, cur - p.qty),
                };
                if (gkey) smap[gkey] = arr;
              }
            }
            updates.sizes = smap;
            topQty = 0;
            for (const g of Object.keys(smap)) {
              const arr = Array.isArray(smap[g]) ? smap[g] : [];
              topQty += arr.reduce(
                (a, b) =>
                  a +
                  (b && typeof b === "object" ? Number(b.quantity) || 0 : 0),
                0
              );
            }
            applied = true;
          } else {
            // Fallback: no per-size quantities present. Decrement top-level quantity only.
            const totalQty = parts.reduce(
              (a, b) => a + (Number(b.qty) || 0),
              0
            );
            topQty = Math.max(0, topQty - totalQty);
            applied = true;
          }

          if (applied) {
            updates.quantity = topQty;
            updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            tx.set(ref, updates, { merge: true });
          }
        }
      }

      // Coupon redemption (idempotent)
      let couponApplied = null;
      if (couponCode && uid && !couponAlready) {
        try {
          const refC = db.doc(`coupons/${couponCode}`);
          const snapC = await tx.get(refC);
          if (snapC.exists) {
            const c = snapC.data() || {};
            if (isCouponActive(c)) {
              const discount = computeCouponDiscount(c, amount);
              const maxUses = Number(c.maxUses) || 0;
              const totalUses = Number(c.totalUses) || 0;
              const perUserLimit = Number(c.perUserLimit) || 1;
              let ok = discount > 0 && (!maxUses || totalUses < maxUses);
              let usedByUser = 0;
              const refU = db.doc(`coupons/${couponCode}/users/${uid}`);
              const snapU = await tx.get(refU);
              usedByUser = snapU.exists ? Number(snapU.data()?.count || 0) : 0;
              if (perUserLimit && usedByUser >= perUserLimit) ok = false;
              if (ok) {
                tx.set(
                  refC,
                  {
                    totalUses: (totalUses || 0) + 1,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  },
                  { merge: true }
                );
                tx.set(
                  refU,
                  {
                    count: usedByUser + 1,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  },
                  { merge: true }
                );
                couponApplied = { code: couponCode, discount, valid: true };
              } else {
                couponApplied = { code: couponCode, discount: 0, valid: false };
              }
            } else {
              couponApplied = { code: couponCode, discount: 0, valid: false };
            }
          } else {
            couponApplied = { code: couponCode, discount: 0, valid: false };
          }
        } catch (_) {
          couponApplied = { code: couponCode, discount: 0, valid: false };
        }
      }

      tx.set(
        orderRef,
        {
          ...(stockAlready
            ? {}
            : {
                stockDeducted: true,
                stockDeductedAt: admin.firestore.FieldValue.serverTimestamp(),
              }),
          ...(couponApplied
            ? { coupon: couponApplied, couponRedeemed: true }
            : {}),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
  }
);

// Removed separate Twilio-on-create handler; Twilio is handled inside the unified order creation function below.

exports.fulfillOrderOnCreate = onDocumentCreated(
  {
    document: "orders/{orderId}",
    region: REGION,
    secrets: [
      XPRESSBEES_USERNAME,
      XPRESSBEES_PASSWORD,
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_FROM,
      TWILIO_TEMPLATE_SID,
    ],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    if (!data) return;
    try {
      // Bail out if HTTP flow created this order or a lock is preset
      if (String(data.via || '').toLowerCase() === 'http-fulfill' || data.fulfillmentLock) {
        return;
      }
      const onCreateEnabled = String(process.env.ORDER_FULFILL_ON_CREATE || 'true').trim().toLowerCase();
      if (onCreateEnabled === 'false') { return; }
      const db = admin.firestore();
      const orderId = String(event.params.orderId || "");
      const ref = db.doc(`orders/${orderId}`);
      let proceed = false;
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        const cur = fresh.exists ? fresh.data() || {} : {};
        if (cur.fulfillmentDone || cur.fulfillmentLock) return;
        tx.set(
          ref,
          { fulfillmentLock: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
        proceed = true;
      });
      if (!proceed) {
        console.log("[fulfill] Locked or already processed; skipping");
        return;
      }

      const accountSid =
        TWILIO_ACCOUNT_SID.value() || process.env.TWILIO_ACCOUNT_SID || "";
      const authToken =
        TWILIO_AUTH_TOKEN.value() || process.env.TWILIO_AUTH_TOKEN || "";
      const from =
        TWILIO_WHATSAPP_FROM.value() || process.env.TWILIO_WHATSAPP_FROM || "";
      const templateSid =
        TWILIO_TEMPLATE_SID.value() || process.env.TWILIO_TEMPLATE_SID || "";
      const username =
        XPRESSBEES_USERNAME.value() || process.env.XPRESSBEES_USERNAME || "";
      const password =
        XPRESSBEES_PASSWORD.value() || process.env.XPRESSBEES_PASSWORD || "";

      const method = String(
        data.paymentMethod || (data.paymentId ? "online" : "")
      ).toLowerCase();
      const isCOD =
        method === "cod" ||
        String(data.paymentId || "").toUpperCase() === "COD";
      const orderLabel = `MGX${orderId.slice(0, 6).toUpperCase()}`;
      const amount = Math.round(Number(data.amount) || 0);
      const discount = Math.round(Number(data.discount) || 0);
      const base = Math.max(0, amount - discount);
      const gst = Number.isFinite(Number(data.gst))
        ? Math.round(Number(data.gst))
        : Math.round(base * 0.18);
      const payable = Math.round(Number(data.payable) || base + gst);

      let twilioResult = { ok: false, sid: null, error: null };
      let xbResult = { ok: false, awb: null, shipmentId: null, error: null };

      // 1) WhatsApp first
      try {
        if (accountSid && authToken && from && templateSid) {
          const to = formatWhatsappNumber(data?.billing?.phone || "");
          if (to) {
            const nameRaw = data?.billing?.name || "";
            const firstName =
              String(nameRaw || "there")
                .split(/\s+/)
                .filter(Boolean)[0] || "there";
            const created =
              data.createdAt && data.createdAt.toDate
                ? data.createdAt.toDate()
                : new Date();
            const dateStr = created.toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            const itemsSummary = summarizeItems(
              Array.isArray(data.items) ? data.items : []
            );
            const contentVariables = JSON.stringify({
              1: String(firstName),
              2: String(orderLabel),
              3: String(dateStr),
              4: String(itemsSummary),
              5: String(amount),
              6: String(discount),
              7: String(payable),
            });
            const body = new URLSearchParams({
              From: from,
              To: to,
              ContentSid: templateSid,
              ContentVariables: contentVariables,
            }).toString();
            const auth = Buffer.from(`${accountSid}:${authToken}`).toString(
              "base64"
            );
            const resp = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  "content-type": "application/x-www-form-urlencoded",
                  authorization: `Basic ${auth}`,
                },
                body,
              }
            );
            if (resp.ok) {
              const msg = await resp.json().catch(() => ({}));
              twilioResult = { ok: true, sid: msg?.sid || null, error: null };
              await ref.set(
                {
                  waSent: true,
                  waMessageSid: msg?.sid || null,
                  waSentAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            } else {
              const txt = await resp.text().catch(() => "");
              twilioResult = {
                ok: false,
                sid: null,
                error: txt || `HTTP ${resp.status}`,
              };
            }
          } else {
            twilioResult = {
              ok: false,
              sid: null,
              error: "Invalid recipient phone",
            };
          }
        } else {
          twilioResult = {
            ok: false,
            sid: null,
            error: "Twilio not configured",
          };
        }
      } catch (e) {
        twilioResult = { ok: false, sid: null, error: e?.message || String(e) };
      }

      // 2) Create shipment
      try {
        if (!username || !password)
          throw new Error("XpressBees credentials not configured");
        if (
          String(process.env.XPRESSBEES_ENABLED || "true").toLowerCase() ===
          "false"
        )
          throw new Error("XpressBees disabled");
        const token = await getXpressbeesToken({ username, password });

        const payload = buildXbShipmentPayload({
          orderId,
          orderLabel,
          data,
          isCOD,
        });
        const url = `${XB_ORIGIN}/api/shipments2`;

        let resp = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (resp.status === 401 || resp.status === 403) {
          const fresh = await getXpressbeesToken({ username, password });
          resp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${fresh}` }, body: JSON.stringify(payload) });
        }
        const ok = resp.ok;
        let raw = null;
        try {
          raw = await resp.json();
        } catch {
          try {
            raw = await resp.text();
          } catch {
            raw = null;
          }
        }
        let awb = null,
          shipmentId = null;
        try {
          const s = raw && typeof raw === "object" ? raw.data || raw || {} : {};
          awb = s?.awb_number || s?.awb || s?.awbno || null;
          shipmentId = s?.shipment_id || s?.order_id || s?.id || null;
        } catch {}
        xbResult = {
          ok,
          awb,
          shipmentId,
          error: ok
            ? null
            : typeof raw === "string"
            ? raw
            : raw?.message || `HTTP ${resp.status}`,
        };
        await ref.set(
          {
            xbCreated: !!ok,
            xbStatus: ok ? "created" : "failed",
            xbAwb: awb || null,
            xbShipmentId: shipmentId || null,
            xbRaw: raw || null,
          },
          { merge: true }
        );
      } catch (e) {
        xbResult = {
          ok: false,
          awb: null,
          shipmentId: null,
          error: e?.message || String(e),
        };
      }

      // 3) Discord log
      try {
        const webhook = (
          process.env.DISCORD_WEBHOOK_URL ||
          "https://discordapp.com/api/webhooks/1427366532794810488/A8ixxfB6YTIRjnY4cTMiVVxm9bOq33biY3E3NhYMhjytAmP89_y_S_9s28NTPJ5GxFX1"
        ).trim();
        const content = `Order ${orderLabel} (${
          isCOD ? "COD" : "Prepaid"
        })\nTwilio: ${twilioResult.ok ? "OK" : "ERR"}${
          twilioResult.sid ? " sid=" + twilioResult.sid : ""
        }${twilioResult.error ? " • " + twilioResult.error : ""}\nXpressBees: ${
          xbResult.ok ? "OK" : "ERR"
        }${xbResult.awb ? " awb=" + xbResult.awb : ""}${
          xbResult.error ? " • " + xbResult.error : ""
        }`;
        await fetch(webhook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content }),
        });
      } catch {}

      await ref.set(
        {
          fulfillmentDone: true,
          fulfillmentLock: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("[fulfill] error", e?.message || e);
      try {
        const db = admin.firestore();
        const orderId = String(event.params.orderId || "");
        await db.doc(`orders/${orderId}`).set(
          {
            fulfillmentLock: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch {}
    }
  }
);

// (Removed) createXpressbeesShipmentOnPayment — merged into fulfillOrderOnCreate

// (Removed) createXpressbeesShipment manual endpoint — merged into unified flow

// Test helper: create a dummy order (triggers shipment). Intended for QA.
// If env TEST_ENDPOINT_KEY is set, require header 'x-test-key' to match.
exports.createDummyOrder = onRequest(
  { region: REGION, cors: true },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }
      const key = (process.env.TEST_ENDPOINT_KEY || "").trim();
      if (key) {
        const hdr = String(req.headers["x-test-key"] || "").trim();
        if (hdr !== key) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }

      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};
      const pm = String(body.paymentMethod || "").toLowerCase();
      const paymentMethod =
        pm === "cod" ? "cod" : pm === "prepaid" ? "online" : "cod";

      const itemsIn = Array.isArray(body.items) ? body.items : [];
      const items = itemsIn.length
        ? itemsIn
        : [
            {
              id: "test-shoe-black-s9-men",
              name: "Test Shoe",
              price: 1499,
              qty: 1,
              meta: { size: "9", gender: "men" },
            },
          ];
      const amount = items.reduce(
        (a, b) => a + (Number(b.price) || 0) * (Number(b.qty) || 0),
        0
      );
      const discount = Math.max(0, Number(body.discount || 0));
      const net = Math.max(0, amount - discount);
      const gst = Math.round(net * 0.18);
      const payable = net + gst;

      const billingIn = body.billing || {};
      const billing = {
        name: String(billingIn.name || "Dummy Buyer"),
        email: String(billingIn.email || "buyer+dummy@megance.com"),
        phone: String(billingIn.phone || "8888888888"),
        address: String(billingIn.address || "221B Baker Street, Near Park"),
        city: String(billingIn.city || "New Delhi"),
        state: String(billingIn.state || "Delhi"),
        zip: String(billingIn.zip || "110063"),
      };

      const db = admin.firestore();
      const payload = {
        userId: null,
        items,
        amount,
        discount,
        gst,
        couponCode: null,
        payable,
        status: "ordered",
        paymentMethod,
        paymentId: paymentMethod === "cod" ? "COD" : "",
        billing,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const ref = await db.collection("orders").add(payload);
      res
        .status(200)
        .json({ ok: true, orderId: ref.id, amount, payable, paymentMethod });
    } catch (e) {
      res.status(500).json({ error: e?.message || "Internal error" });
    }
  }
);

// Razorpay Order endpoints (require secrets to be set)
const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");
exports.createRazorpayOrder = onRequest(
  {
    region: REGION,
    cors: true,
    secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET],
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};
      const rupees = Number(body.amount) || 0; // allow rupees for convenience
      const amount = Number.isFinite(rupees) ? Math.round(rupees * 100) : 0; // paise
      const currency = (body.currency || "INR").toUpperCase();
      // Razorpay requires receipt length <= 40. Sanitize/truncate safely.
      const rawReceipt = String(body.receipt || "").trim();
      let receipt = rawReceipt && rawReceipt.length <= 40 ? rawReceipt : "";
      if (!receipt) {
        // Short unique fallback like r-k5yo9f-a1b2c3
        receipt = `r-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
      } else if (receipt.length > 40) {
        receipt = receipt.slice(0, 40);
      }
      if (!amount || amount < 100) {
        res.status(400).json({ error: "Invalid amount" });
        return;
      }

      const keyId = RAZORPAY_KEY_ID.value();
      const keySecret = RAZORPAY_KEY_SECRET.value();
      if (!keyId || !keySecret) {
        console.warn("[createRazorpayOrder] Secrets missing");
        res.status(500).json({ error: "Razorpay secrets not configured" });
        return;
      }

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({ amount, currency, receipt, payment_capture: 1 }),
      });
      if (!rpRes.ok) {
        const text = await rpRes.text();
        console.error(
          "[createRazorpayOrder] Razorpay error",
          rpRes.status,
          text
        );
        res.status(502).json({
          error: "Failed to create order",
          status: rpRes.status,
          details: text,
        });
        return;
      }
      const data = await rpRes.json();
      res.status(200).json({ order: data, keyId }); // return public keyId to client
    } catch (e) {
      console.error("[createRazorpayOrder] exception", e?.message || e);
      res.status(500).json({ error: e?.message || "Internal error" });
    }
  }
);

// Verify Razorpay signature and mark order as paid
exports.verifyRazorpaySignature = onRequest(
  {
    region: REGION,
    cors: true,
    secrets: [
      RAZORPAY_KEY_SECRET,
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_FROM,
      TWILIO_TEMPLATE_SID,
    ],
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};
      const orderId = String(body.razorpay_order_id || "");
      const paymentId = String(body.razorpay_payment_id || "");
      const signature = String(body.razorpay_signature || "");
      const orderDocId = String(body.orderDocId || "");
      if (!orderId || !paymentId || !signature || !orderDocId) {
        res.status(400).json({ error: "Missing fields" });
        return;
      }

      const keySecret = RAZORPAY_KEY_SECRET.value();
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
      const valid = expected === signature;
      if (!valid) {
        res.status(400).json({ ok: false, valid: false });
        return;
      }

      const db = admin.firestore();
      const ref = db.doc(`orders/${orderDocId}`);
      await ref.update({
        status: "paid",
        paymentVerified: true,
        razorpay: { orderId, paymentId, signature },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Attempt to send WhatsApp confirmation here (online payments only)
      try {
        const [accountSid, authToken, from, templateSid] = [
          TWILIO_ACCOUNT_SID.value() || process.env.TWILIO_ACCOUNT_SID || "",
          TWILIO_AUTH_TOKEN.value() || process.env.TWILIO_AUTH_TOKEN || "",
          TWILIO_WHATSAPP_FROM.value() ||
            process.env.TWILIO_WHATSAPP_FROM ||
            "",
          TWILIO_TEMPLATE_SID.value() || process.env.TWILIO_TEMPLATE_SID || "",
        ];
        if (accountSid && authToken && from && templateSid) {
          // Idempotency lock for online send
          let proceed = false;
          await db.runTransaction(async (tx) => {
            const fresh = await tx.get(ref);
            const cur = fresh.exists ? fresh.data() || {} : {};
            if (cur.waSent || cur.waLock) return;
            tx.set(
              ref,
              { waLock: admin.firestore.FieldValue.serverTimestamp() },
              { merge: true }
            );
            proceed = true;
          });
          if (proceed) {
            const snap = await ref.get();
            const data = snap.exists ? snap.data() || {} : {};
            const to = formatWhatsappNumber(data?.billing?.phone || "");
            if (to) {
              const nameRaw = (data.billing && data.billing.name) || "";
              const firstName =
                String(nameRaw || "there")
                  .split(/\s+/)
                  .filter(Boolean)[0] || "there";
              const orderLabel = `MGX${orderDocId.slice(0, 6).toUpperCase()}`;
              const created =
                data.createdAt && data.createdAt.toDate
                  ? data.createdAt.toDate()
                  : new Date();
              const dateStr = created.toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              const itemsSummary = summarizeItems(
                Array.isArray(data.items) ? data.items : []
              );
              const amount = Math.round(Number(data.amount) || 0);
              const discount = Math.round(Number(data.discount) || 0);
              const base = Math.max(0, amount - discount);
              const gst = Number.isFinite(Number(data.gst))
                ? Math.round(Number(data.gst))
                : Math.round(base * 0.18);
              const payable = Math.round(Number(data.payable) || base + gst);

              const contentVariables = JSON.stringify({
                1: String(firstName),
                2: String(orderLabel),
                3: String(dateStr),
                4: String(itemsSummary),
                5: String(amount),
                6: String(discount),
                7: String(payable),
              });

              const bodyForm = new URLSearchParams({
                From: from,
                To: to,
                ContentSid: templateSid,
                ContentVariables: contentVariables,
              }).toString();
              const auth = Buffer.from(`${accountSid}:${authToken}`).toString(
                "base64"
              );
              const resp2 = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                {
                  method: "POST",
                  headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    authorization: `Basic ${auth}`,
                  },
                  body: bodyForm,
                }
              );
              if (resp2.ok) {
                const msg = await resp2.json().catch(() => ({}));
                await ref.set(
                  {
                    waSent: true,
                    waMessageSid: msg?.sid || null,
                    waSentAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  },
                  { merge: true }
                );
              } else {
                const txt = await resp2.text().catch(() => "");
                console.warn(
                  "[verifyRazorpaySignature] Twilio send failed",
                  resp2.status,
                  txt
                );
                try {
                  await ref.set(
                    {
                      waLock: admin.firestore.FieldValue.delete(),
                      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                  );
                } catch {}
              }
            } else {
              console.warn(
                "[verifyRazorpaySignature] No valid recipient phone; skipping WhatsApp"
              );
              try {
                await ref.set(
                  {
                    waLock: admin.firestore.FieldValue.delete(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  },
                  { merge: true }
                );
              } catch {}
            }
          } else {
            console.log(
              "[verifyRazorpaySignature] Locked or already sent; skipping"
            );
          }
        }
      } catch (e2) {
        console.warn(
          "[verifyRazorpaySignature] WhatsApp send error",
          e2?.message || e2
        );
        try {
          const db = admin.firestore();
          const ref = db.doc(`orders/${orderDocId}`);
          await ref.set(
            {
              waLock: admin.firestore.FieldValue.delete(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } catch {}
      }

      res.status(200).json({ ok: true, valid: true });
    } catch (e) {
      res.status(500).json({ error: e?.message || "Internal error" });
    }
  }
);

// Generate a simple invoice PDF for a given order (auth required)
exports.getOrderInvoicePdf = onRequest(
  { region: REGION, cors: true },
  async (req, res) => {
    try {
      const db = admin.firestore();
      const orderId = String(req.query.orderId || "").trim();
      const token = String(
        req.query.token ||
          (req.headers.authorization || "").replace(/^Bearer\s+/i, "")
      ).trim();
      if (!orderId || !token) {
        res.status(401).send("Unauthorized");
        return;
      }
      let decoded;
      try {
        decoded = await admin.auth().verifyIdToken(token);
      } catch {
        res.status(401).send("Unauthorized");
        return;
      }
      const uid = decoded.uid;
      const snap = await db.doc(`orders/${orderId}`).get();
      if (!snap.exists) {
        res.status(404).send("Not found");
        return;
      }
      const data = snap.data() || {};
      if (data.userId && data.userId !== uid && decoded.email !== OWNER_EMAIL) {
        res.status(403).send("Forbidden");
        return;
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const billing = data.billing || {};
      const created =
        data.createdAt && data.createdAt.toDate
          ? data.createdAt.toDate()
          : new Date();

      // Build professional invoice
      res.setHeader("content-type", "application/pdf");
      res.setHeader(
        "content-disposition",
        `inline; filename=invoice-${orderId}.pdf`
      );
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      doc.pipe(res);

      // Header with dark bar + logo
      const pageWidth = doc.page.width;
      const headerH = 54;
      const headerX = 40;
      const headerY = 40;
      const headerW = pageWidth - 80;
      doc.save();
      doc.rect(headerX, headerY, headerW, headerH).fill("#111");
      doc.fillColor("#fff").fontSize(18).text("Megance", headerX + 16, headerY + 16);
      try {
        const resp = await fetch(MEGANCE_LOGO_URL);
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          const imgW = 140;
          const imgH = 36;
          doc.image(buf, headerX + headerW - imgW - 12, headerY + (headerH - imgH) / 2, {
            width: imgW,
            height: imgH,
          });
        }
      } catch (_) {}
      doc.restore();

      // Invoice meta and company info
      const invDate = created;
      const invNo = `MG-${invDate.getFullYear().toString().slice(-2)}${String(
        invDate.getMonth() + 1
      ).padStart(2, "0")}${String(invDate.getDate()).padStart(2, "0")}-${orderId
        .slice(0, 4)
        .toUpperCase()}`;
      const y0 = headerY + headerH + 16;
      doc.fillColor("#111").fontSize(12).text("Invoice", headerX, y0);
      doc.fontSize(10).fillColor("#666");
      doc.text(`Invoice No: ${invNo}`, headerX, y0 + 18);
      doc.text(`Date: ${invDate.toLocaleDateString()}`, headerX, y0 + 34);
      doc.text(`GSTIN: ${MEGANCE_GSTIN}`, headerX, y0 + 50);

      // Payment meta
      const pm = String(
        data.paymentMethod || (data.paymentId ? "online" : "cod")
      ).toUpperCase();
      doc.text(`Payment: ${pm}`, headerX + 220, y0 + 18);
      doc.text(`Order: #${orderId.slice(0, 8).toUpperCase()}`, headerX + 220, y0 + 34);

      // Bill To
      const cardY = y0 + 70;
      const pageW = headerW;
      doc.roundedRect(headerX, cardY, pageW, 74, 8).stroke("#e5e5e5");
      doc.fontSize(12).fillColor("#111").text("Bill To", headerX + 12, cardY + 10);
      doc.fontSize(10).fillColor("#111").text(`${billing.name || ""}`, headerX + 12, cardY + 30);
      if (billing.email) doc.fillColor("#666").text(`${billing.email}`, headerX + 12, cardY + 44);
      const addr = [billing.address, billing.city, billing.state, billing.zip]
        .filter(Boolean)
        .join(", ");
      if (addr) doc.fillColor("#666").text(addr, headerX + 220, cardY + 30, { width: pageW - 240 });

      // Items table header
      let ty = cardY + 90;
      const rowH = 20;
      const col1 = headerX + 12; // item name
      const colQty = headerX + pageW - 220; // qty
      const colAmt = headerX + pageW - 120; // amount
      doc
        .roundedRect(headerX, ty, pageW, rowH, 6)
        .fillAndStroke("#fafafa", "#eaeaea");
      doc.fillColor("#111").fontSize(11).text("Item", col1, ty + 5);
      doc.text("Qty", colQty, ty + 5);
      doc.text("Amount", colAmt, ty + 5);
      ty += rowH + 6;

      // Items
      let subtotal = 0;
      items.forEach((it) => {
        const unit = Number(it.price) || 0;
        const qty = Number(it.qty) || 0;
        const amt = unit * qty;
        subtotal += amt;
        doc
          .fontSize(10)
          .fillColor("#111")
          .text(String(it.name || ""), col1, ty, { width: pageW - 260 });
        doc.text(String(qty), colQty, ty);
        doc.text(`₹ ${amt.toFixed(2)}`, colAmt, ty);
        ty += rowH;
        if (it.description) {
          doc
            .fillColor("#666")
            .fontSize(9)
            .text(String(it.description).slice(0, 140), col1, ty - 6, {
              width: pageW - 40,
            });
          ty += 4;
        }
      });

      // Divider
      ty += 2;
      doc.moveTo(headerX, ty).lineTo(headerX + pageW, ty).stroke("#eaeaea");
      ty += 10;

      // Totals
      const discount = Number(data.discount || 0);
      const net = Math.max(0, subtotal - discount);
      const shippingCharge = Number(
        data.shipping || data.shippingCharge || data.shipping_charges || 0
      );
      const tax =
        typeof data.gst === "number"
          ? Number(data.gst)
          : Math.round(net * 0.18);
      const payable = Number(
        data.payable || net + tax + (Number.isFinite(shippingCharge) ? shippingCharge : 0)
      );
      // Show lines
      const rightX = colAmt;
      const line = (label, value, opts = {}) => {
        doc.fontSize(11).fillColor("#111").text(label, colQty - 120, ty);
        doc.text(value, rightX, ty);
        ty += rowH - 2;
      };
      // Subtotal should be Total (amount) minus GST
      const displaySubtotal = Math.max(0, payable - tax);
      line("Subtotal", `₹ ${displaySubtotal.toFixed(2)}`);
      if (discount > 0) line("Discount", `- ₹ ${discount.toFixed(2)}`);
      const gstPercentDisp = data.gstPercent
        ? `${Number(data.gstPercent)}%`
        : "18%";
      line(`GST (${gstPercentDisp})`, `₹ ${tax.toFixed(2)}`);
      line("Shipping", shippingCharge ? `₹ ${shippingCharge.toFixed(2)}` : "Free");
      // Total accent row
      ty += 2;
      doc
        .roundedRect(headerX, ty - 6, pageW, rowH, 6)
        .fillAndStroke("#111", "#111");
      doc.fillColor("#fff").fontSize(12).text("Total", colQty - 120, ty);
      doc.text(`₹ ${payable.toFixed(2)}`, rightX, ty);
      ty += rowH + 8;

      // Notes
      doc.fillColor("#666").fontSize(9).text("Notes:", headerX, ty);
      ty += 14;
      doc
        .fontSize(9)
        .fillColor("#666")
        .text("GST shown here may be dummy for now.", headerX, ty);
      ty += 12;
      doc.fontSize(9).fillColor("#666").text("Shipping is free on all orders.", headerX, ty);
      ty += 12;
      doc.fontSize(9).fillColor("#666").text("Discount is optional and may be 0.", headerX, ty);

      doc.end();
    } catch (e) {
      try {
        console.error("getOrderInvoicePdf error", e?.message || e);
      } catch {}
      res.status(500).send("Internal error");
    }
  }
);

// Callable variant that returns a base64 PDF (auth required)
exports.getOrderInvoicePdfCallable = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid;
  const email = req.auth?.token?.email || "";
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required");
  const db = admin.firestore();
  const orderId = String(req.data?.orderId || "").trim();
  if (!orderId) throw new HttpsError("invalid-argument", "orderId is required");
  const snap = await db.doc(`orders/${orderId}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found");
  const data = snap.data() || {};
  if (data.userId && data.userId !== uid && email !== OWNER_EMAIL)
    throw new HttpsError("permission-denied", "Forbidden");

  const items = Array.isArray(data.items) ? data.items : [];
  const billing = data.billing || {};
  const created =
    data.createdAt && data.createdAt.toDate
      ? data.createdAt.toDate()
      : new Date();

  // Lazy load to avoid analyzer crash
  let _PDF = PDFDocument;
  if (!_PDF) {
    try {
      _PDF = require("pdfkit");
    } catch (e) {
      throw new HttpsError("internal", "PDF engine missing");
    }
  }
  const doc = new _PDF({ size: "A4", margin: 40 });
  const chunks = [];
  return await new Promise(async (resolve, reject) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("error", (e) =>
      reject(new HttpsError("internal", e?.message || "PDF error"))
    );
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const b64 = buffer.toString("base64");
      resolve({
        contentType: "application/pdf",
        filename: `invoice-${orderId}.pdf`,
        data: b64,
      });
    });

    // Header with dark bar + logo
    const pageWidth = doc.page.width;
    const headerH = 54;
    const headerX = 40;
    const headerY = 40;
    const headerW = pageWidth - 80;
    doc.save();
    doc.rect(headerX, headerY, headerW, headerH).fill("#111");
    doc.fillColor("#fff").fontSize(18).text("Megance", headerX + 16, headerY + 16);
    try {
      const resp = await fetch(MEGANCE_LOGO_URL);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        const imgW = 140;
        const imgH = 36;
        doc.image(buf, headerX + headerW - imgW - 12, headerY + (headerH - imgH) / 2, {
          width: imgW,
          height: imgH,
        });
      }
    } catch (_) {}
    doc.restore();

    // Invoice meta
    const invNo = `MG-${created.getFullYear().toString().slice(-2)}${String(
      created.getMonth() + 1
    ).padStart(2, "0")}${String(created.getDate()).padStart(2, "0")}-${orderId
      .slice(0, 4)
      .toUpperCase()}`;
    const y0 = headerY + headerH + 16;
    doc.fillColor("#111").fontSize(12).text("Invoice", headerX, y0);
    doc.fontSize(10).fillColor("#666");
    doc.text(`Invoice No: ${invNo}`, headerX, y0 + 18);
    doc.text(`Date: ${created.toLocaleDateString()}`, headerX, y0 + 34);
    doc.text(`GSTIN: ${MEGANCE_GSTIN}`, headerX, y0 + 50);
    const pm = String(
      data.paymentMethod || (data.paymentId ? "online" : "cod")
    ).toUpperCase();
    doc.text(`Payment: ${pm}`, headerX + 220, y0 + 18);
    doc.text(`Order: #${orderId.slice(0, 8).toUpperCase()}`, headerX + 220, y0 + 34);

    // Bill To
    const cardY = y0 + 70;
    const pageW = headerW;
    doc.roundedRect(headerX, cardY, pageW, 74, 8).stroke("#e5e5e5");
    doc.fontSize(12).fillColor("#111").text("Bill To", headerX + 12, cardY + 10);
    doc.fontSize(10).fillColor("#111").text(`${billing.name || ""}`, headerX + 12, cardY + 30);
    if (billing.email) doc.fillColor("#666").text(`${billing.email}`, headerX + 12, cardY + 44);
    const addr = [billing.address, billing.city, billing.state, billing.zip]
      .filter(Boolean)
      .join(", ");
    if (addr) doc.fillColor("#666").text(addr, headerX + 220, cardY + 30, { width: pageW - 240 });

    // Table header
    let ty = cardY + 90;
    const rowH = 20;
    const col1 = headerX + 12;
    const colQty = headerX + pageW - 220;
    const colAmt = headerX + pageW - 120;
    doc
      .roundedRect(headerX, ty, pageW, rowH, 6)
      .fillAndStroke("#fafafa", "#eaeaea");
    doc.fillColor("#111").fontSize(11).text("Item", col1, ty + 5);
    doc.text("Qty", colQty, ty + 5);
    doc.text("Amount", colAmt, ty + 5);
    ty += rowH + 6;

    // Items
    let subtotal = 0;
    items.forEach((it) => {
      const unit = Number(it.price) || 0;
      const qty = Number(it.qty) || 0;
      const amt = unit * qty;
      subtotal += amt;
      doc
        .fontSize(10)
        .fillColor("#111")
        .text(String(it.name || ""), col1, ty, { width: pageW - 260 });
      doc.text(String(qty), colQty, ty);
      doc.text(`₹ ${amt.toFixed(2)}`, colAmt, ty);
      ty += rowH;
      if (it.description) {
        doc
          .fillColor("#666")
          .fontSize(9)
          .text(String(it.description).slice(0, 140), col1, ty - 6, {
            width: pageW - 40,
          });
        ty += 4;
      }
    });

    // Divider
    ty += 2;
    doc.moveTo(headerX, ty).lineTo(headerX + pageW, ty).stroke("#eaeaea");
    ty += 10;

    // Totals
    const discount = Number(data.discount || 0);
    const net = Math.max(0, subtotal - discount);
    const shippingCharge = Number(
      data.shipping || data.shippingCharge || data.shipping_charges || 0
    );
    const tax =
      typeof data.gst === "number" ? Number(data.gst) : Math.round(net * 0.18);
    const payable = Number(
      data.payable || net + tax + (Number.isFinite(shippingCharge) ? shippingCharge : 0)
    );
    const rightX = colAmt;
    const line = (label, value) => {
      doc.fontSize(11).fillColor("#111").text(label, colQty - 120, ty);
      doc.text(value, rightX, ty);
      ty += rowH - 2;
    };
    // Subtotal should be Total (amount) minus GST
    const displaySubtotal = Math.max(0, payable - tax);
    line("Subtotal", `₹ ${displaySubtotal.toFixed(2)}`);
    if (discount > 0) line("Discount", `- ₹ ${discount.toFixed(2)}`);
    const gstPercentDisp = data.gstPercent
      ? `${Number(data.gstPercent)}%`
      : "18%";
    line(`GST (${gstPercentDisp})`, `₹ ${tax.toFixed(2)}`);
    line("Shipping", shippingCharge ? `₹ ${shippingCharge.toFixed(2)}` : "Free");
    ty += 2;
    doc
      .roundedRect(headerX, ty - 6, pageW, rowH, 6)
      .fillAndStroke("#111", "#111");
    doc.fillColor("#fff").fontSize(12).text("Total", colQty - 120, ty);
    doc.text(`₹ ${payable.toFixed(2)}`, rightX, ty);
    ty += rowH + 8;

    // Notes
    doc.fillColor("#666").fontSize(9).text("Notes:", headerX, ty);
    ty += 14;
    doc.fontSize(9).fillColor("#666").text("Shipping is free on all orders.", headerX, ty);

    doc.end();
  });
});
// Preview a coupon (does not reserve). Requires auth.
exports.previewCoupon = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required");
  const db = admin.firestore();
  const code = req.data?.code;
  const amount = Number(req.data?.amount) || 0;
  const res = await validateCouponForUser({ db, code, uid, amount });
  if (!res.ok) return res;
  return { ok: true, code: res.code, discount: res.discount };
});

// Callable: decrement stock for a given order id (idempotent), owned by the caller
exports.decrementStockForOrder = onCall({ region: REGION }, async (req) => {
  const uid = req.auth?.uid;
  const orderId = String(req.data?.orderId || "");
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required");
  if (!orderId) throw new HttpsError("invalid-argument", "orderId is required");

  const db = admin.firestore();
  const orderRef = db.doc(`orders/${orderId}`);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found");
  const order = orderSnap.data() || {};
  if (order.userId && order.userId !== uid)
    throw new HttpsError("permission-denied", "Not your order");
  // Proceed even if stock was already deducted to allow coupon redemption idempotently

  function parseItem(it) {
    try {
      const meta = it.meta || {};
      let size = meta.size ? String(meta.size) : "";
      let gender = meta.gender || null;
      let id = String(it.id || "");
      let base = id;
      if (size) {
        const idx = base.lastIndexOf(`-s${size}`);
        base = idx !== -1 ? base.slice(0, idx) : base;
      }
      if (gender && base.endsWith(`-${gender}`)) {
        base = base.slice(0, -`-${gender}`.length);
      } else if (!gender) {
        if (base.endsWith("-men")) {
          gender = "men";
          base = base.slice(0, -4);
        } else if (base.endsWith("-women")) {
          gender = "women";
          base = base.slice(0, -6);
        }
      }
      return { productId: base, size, gender, qty: Number(it.qty) || 0 };
    } catch (_) {
      return null;
    }
  }

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(orderRef);
    if (!fresh.exists) throw new HttpsError("not-found", "Order missing");
    const alreadyStock = fresh.get("stockDeducted") === true;
    const items = Array.isArray(fresh.get("items")) ? fresh.get("items") : [];
    const amount = Number(fresh.get("amount") || 0);
    const couponCode = String(fresh.get("couponCode") || "")
      .trim()
      .toUpperCase();
    const grouped = new Map();
    for (const it of items) {
      const p = parseItem(it);
      if (!p || !p.productId) continue;
      if (!grouped.has(p.productId)) grouped.set(p.productId, []);
      grouped.get(p.productId).push(p);
    }

    if (!alreadyStock)
      for (const [productId, parts] of grouped.entries()) {
        const ref = db.doc(`products/${productId}`);
        const snap = await tx.get(ref);
        if (!snap.exists) continue;
        const data = snap.data() || {};
        let updates = {};
        let topQty = Number(data.quantity) || 0;
        let applied = false;

        if (data.sizeQuantities && typeof data.sizeQuantities === "object") {
          const sq = { ...data.sizeQuantities };
          for (const p of parts) {
            if (!p.size || !p.gender) continue;
            const gkey = findCaseInsensitiveKey(sq, p.gender);
            const arr = gkey && Array.isArray(sq[gkey]) ? [...sq[gkey]] : [];
            const idx = arr.findIndex((r) => String(r.size) === String(p.size));
            if (idx !== -1) {
              const cur = Number(arr[idx].quantity) || 0;
              arr[idx] = { ...arr[idx], quantity: Math.max(0, cur - p.qty) };
              if (gkey) sq[gkey] = arr;
            }
          }
          updates.sizeQuantities = sq;
          topQty = 0;
          for (const g of Object.keys(sq)) {
            const arr = Array.isArray(sq[g]) ? sq[g] : [];
            topQty += arr.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
          }
          applied = true;
        } else if (
          Array.isArray(data.sizes) &&
          data.sizes.length &&
          typeof data.sizes[0] === "object"
        ) {
          const sizes = [...data.sizes];
          for (const p of parts) {
            if (!p.size) continue;
            const idx = sizes.findIndex(
              (r) => String(r.size) === String(p.size)
            );
            if (idx !== -1) {
              const cur = Number(sizes[idx].quantity) || 0;
              sizes[idx] = {
                ...sizes[idx],
                quantity: Math.max(0, cur - p.qty),
              };
            }
          }
          updates.sizes = sizes;
          topQty = sizes.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
          applied = true;
        } else if (data.sizes && typeof data.sizes === "object") {
          const smap = { ...data.sizes };
          for (const p of parts) {
            if (!p.size) continue;
            const gkey = findCaseInsensitiveKey(smap, p.gender || "");
            const arr =
              gkey && Array.isArray(smap[gkey]) ? [...smap[gkey]] : [];
            const objIdx = arr.findIndex(
              (r) =>
                r && typeof r === "object" && String(r.size) === String(p.size)
            );
            if (objIdx !== -1) {
              const cur = Number(arr[objIdx].quantity) || 0;
              arr[objIdx] = {
                ...arr[objIdx],
                quantity: Math.max(0, cur - p.qty),
              };
              if (gkey) smap[gkey] = arr;
            }
          }
          updates.sizes = smap;
          topQty = 0;
          for (const g of Object.keys(smap)) {
            const arr = Array.isArray(smap[g]) ? smap[g] : [];
            topQty += arr.reduce(
              (a, b) =>
                a + (b && typeof b === "object" ? Number(b.quantity) || 0 : 0),
              0
            );
          }
          applied = true;
        } else {
          const totalQty = parts.reduce((a, b) => a + (Number(b.qty) || 0), 0);
          topQty = Math.max(0, topQty - totalQty);
          applied = true;
        }

        if (applied) {
          updates.quantity = topQty;
          updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          tx.set(ref, updates, { merge: true });
        }
      }

    // Coupon redemption (idempotent): validate again and increment counters
    let couponApplied = null;
    if (couponCode && uid) {
      try {
        const refC = db.doc(`coupons/${couponCode}`);
        const snapC = await tx.get(refC);
        if (snapC.exists) {
          const c = snapC.data() || {};
          if (isCouponActive(c)) {
            const discount = computeCouponDiscount(c, amount);
            const maxUses = Number(c.maxUses) || 0;
            const totalUses = Number(c.totalUses) || 0;
            const perUserLimit = Number(c.perUserLimit) || 1;
            let ok = discount > 0 && (!maxUses || totalUses < maxUses);
            let usedByUser = 0;
            const refU = db.doc(`coupons/${couponCode}/users/${uid}`);
            const snapU = await tx.get(refU);
            usedByUser = snapU.exists ? Number(snapU.data()?.count || 0) : 0;
            if (perUserLimit && usedByUser >= perUserLimit) ok = false;
            if (ok) {
              tx.set(
                refC,
                {
                  totalUses: (totalUses || 0) + 1,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
              tx.set(
                refU,
                {
                  count: usedByUser + 1,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
              couponApplied = { code: couponCode, discount, valid: true };
            } else {
              couponApplied = { code: couponCode, discount: 0, valid: false };
            }
          } else {
            couponApplied = { code: couponCode, discount: 0, valid: false };
          }
        } else {
          couponApplied = { code: couponCode, discount: 0, valid: false };
        }
      } catch (_) {
        couponApplied = { code: couponCode, discount: 0, valid: false };
      }
    }

    tx.update(orderRef, {
      ...(alreadyStock
        ? {}
        : {
            stockDeducted: true,
            stockDeductedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
      ...(couponApplied ? { coupon: couponApplied, couponRedeemed: true } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});
// Create or hydrate a user profile on first sign-in (optional: disabled by default)
if (process.env.IDENTITY_ENABLED === "true") {
  exports.onUserCreated = functions
    .region(REGION)
    .auth.user()
    .onCreate(async (user) => {
      if (!user || !user.uid) return;
      const { uid, displayName, email, phoneNumber } = user;
      const db = admin.firestore();
      const ref = db.doc(`users/${uid}`);
      try {
        await ref.set(
          {
            name: displayName || "",
            email: email || "",
            phone: phoneNumber || "",
            phoneVerified: !!phoneNumber,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {
        console.error(
          "[onUserCreated] failed to create profile",
          e?.message || e
        );
      }
    });
}

// Authenticated profile update (server authoritative)
exports.updateUserProfile = onRequest(
  {
    region: REGION,
    cors: true,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }
      const authHeader = String(req.headers.authorization || "");
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : "";
      if (!idToken) {
        res.status(401).json({ error: "Missing Authorization" });
        return;
      }
      let decoded;
      try {
        decoded = await admin.auth().verifyIdToken(idToken);
      } catch (e) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
      const uid = decoded.uid;

      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};
      const trim = (v, max = 240) =>
        typeof v === "string" ? v.trim().slice(0, max) : "";
      const payload = {
        name: trim(body.name, 120),
        email: trim(body.email, 200),
        address: trim(body.address, 240),
        city: trim(body.city, 120),
        state: trim(body.state, 120),
        zip: trim(body.zip, 32),
      };

      // Derive phone and verification status from auth record (authoritative)
      const userRecord = await admin.auth().getUser(uid);
      const phone = userRecord.phoneNumber || "";
      const email = userRecord.email || "";
      const profile = {
        ...payload,
        email: email || "",
        phone,
        phoneVerified: !!phone,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await admin.firestore().doc(`users/${uid}`).set(profile, { merge: true });
      res
        .status(200)
        .json({ ok: true, profile: { ...profile, updatedAt: Date.now() } });
    } catch (e) {
      res.status(500).json({ error: e?.message || "Internal error" });
    }
  }
);

// Callable variant for frontend (avoids CORS/base-URL issues)
exports.updateUserProfileCallable = onCall({ region: REGION }, async (req) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required");
    const body = req.data || {};
    const trim = (v, max = 240) =>
      typeof v === "string" ? v.trim().slice(0, max) : "";
    const payload = {
      name: trim(body.name, 120),
      email: trim(body.email, 200),
      address: trim(body.address, 240),
      city: trim(body.city, 120),
      state: trim(body.state, 120),
      zip: trim(body.zip, 32),
    };

    const userRecord = await admin.auth().getUser(uid);
    const phone = userRecord.phoneNumber || "";
    const email = userRecord.email || "";
    const profile = {
      ...payload,
      email: email || payload.email || "",
      phone,
      phoneVerified: !!phone,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().doc(`users/${uid}`).set(profile, { merge: true });
    return { ok: true };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    throw new HttpsError("internal", e?.message || "Internal error");
  }
});
// Newsletter subscription (callable): accepts { email, name?, source? }
exports.subscribeNewsletter = onCall({ region: REGION }, async (req) => {
  try {
    const data = req?.data || {};
    const raw = (data.email || "").toString().trim();
    const email = raw.toLowerCase();
    if (!email || !email.includes("@") || email.length > 190) {
      throw new HttpsError("invalid-argument", "Invalid email");
    }
    const name = (data.name || "").toString().trim().slice(0, 120);
    const source = (data.source || "web").toString().trim().slice(0, 60);
    const uid = req?.auth?.uid || null;

    const id = crypto.createHash("sha1").update(email).digest("hex");
    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = admin.firestore().doc(`newsletter_subscribers/${id}`);
    const payload = {
      email,
      ...(name ? { name } : {}),
      ...(uid ? { uid } : {}),
      sources: admin.firestore.FieldValue.arrayUnion(source || "web"),
      updatedAt: now,
    };
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({ ...payload, createdAt: now }, { merge: true });
    } else {
      await ref.set(payload, { merge: true });
    }
    return { ok: true };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    throw new HttpsError("internal", e?.message || "Internal error");
  }
});

// Public HTTP variant (no auth) for environments calling via base URL
exports.subscribeNewsletterPublic = onRequest({ region: REGION, cors: true }, async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const raw = (body.email || "").toString().trim();
    const email = raw.toLowerCase();
    if (!email || !email.includes("@") || email.length > 190) {
      res.status(400).json({ error: "Invalid email" });
      return;
    }
    const name = (body.name || "").toString().trim().slice(0, 120);
    const source = (body.source || "web").toString().trim().slice(0, 60);
    const id = crypto.createHash("sha1").update(email).digest("hex");
    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = admin.firestore().doc(`newsletter_subscribers/${id}`);
    const payload = {
      email,
      ...(name ? { name } : {}),
      sources: admin.firestore.FieldValue.arrayUnion(source || "web"),
      updatedAt: now,
    };
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({ ...payload, createdAt: now }, { merge: true });
    } else {
      await ref.set(payload, { merge: true });
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Internal error" });
  }
});
function xbOrigin(rawBase) {
  try {
    const raw = (
      rawBase ||
      process.env.XPRESSBEES_BASE_URL ||
      "https://shipment.xpressbees.com"
    ).toString();
    const u = new URL(raw);
    // If a full path was provided (e.g., https://.../api/shipments2), strip to origin
    return u.origin;
  } catch (_) {
    try {
      return String(
        rawBase ||
          process.env.XPRESSBEES_BASE_URL ||
          "https://shipment.xpressbees.com"
      )
        .replace(/\/api\/?.*$/, "")
        .replace(/\/$/, "");
    } catch {
      return "https://shipment.xpressbees.com";
    }
  }
}

// Try to fetch live shipment status from XpressBees for a given AWB
async function fetchXbStatus({ token, base, awb }) {
  const origin = xbOrigin(base || XB_ORIGIN);
  const headers = {
    'Authorization': `Bearer ${token}`,
    'content-type': 'application/json',
  };
  // Try multiple plausible endpoints to maximize compatibility
  const attempts = [
    { method: 'GET', path: `/api/track/${encodeURIComponent(awb)}` },
    { method: 'GET', path: `/api/track/awb/${encodeURIComponent(awb)}` },
    { method: 'GET', path: `/api/shipments/track/${encodeURIComponent(awb)}` },
    { method: 'POST', path: `/api/track`, body: { awb_number: String(awb) } },
    { method: 'POST', path: `/api/shipments/track`, body: { awb: String(awb) } },
    { method: 'GET', path: `/api/shipments2/${encodeURIComponent(awb)}` },
  ];
  for (const att of attempts) {
    try {
      const url = `${origin}${att.path}`;
      const resp = await fetch(url, {
        method: att.method,
        headers,
        ...(att.body ? { body: JSON.stringify(att.body) } : {}),
      });
      let data = null;
      try { data = await resp.json(); } catch { try { data = await resp.text(); } catch { data = null; } }
      if (resp.ok && data) {
        return { ok: true, data };
      }
    } catch (_) {
      // try next
    }
  }
  return { ok: false, error: 'tracking_unavailable' };
}

// Request a reverse pickup (return) for an order. Auth required (owner of order).
exports.requestReturnForOrder = onCall(
  { region: REGION, secrets: [XPRESSBEES_USERNAME, XPRESSBEES_PASSWORD] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required');
    const orderId = String(req.data?.orderId || '').trim();
    if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');

    const db = admin.firestore();
    // Resolve top-level order doc robustly
    let ref = db.doc(`orders/${orderId}`);
    let snap = await ref.get();
    if (!snap.exists) {
      // Try to find by field 'orderId'
      try {
        const qs = await db
          .collection('orders')
          .where('orderId', '==', orderId)
          .limit(1)
          .get();
        if (!qs.empty) {
          ref = qs.docs[0].ref;
          snap = qs.docs[0];
        }
      } catch {}
    }
    if (!snap.exists) {
      // Try the user's subcollection doc id
      try {
        const s = await db.doc(`users/${uid}/orders/${orderId}`).get();
        if (s.exists) {
          const topId = s.data()?.orderId || s.data()?.id || null;
          if (topId) {
            const maybe = await db.doc(`orders/${topId}`).get();
            if (maybe.exists) {
              ref = maybe.ref;
              snap = maybe;
            }
          }
        }
      } catch {}
    }
    if (!snap.exists) throw new HttpsError('not-found', 'Order not found');
    const data = snap.data() || {};
    if (data.userId && data.userId !== uid && (data.user?.id && data.user.id !== uid)) {
      throw new HttpsError('permission-denied', 'Not your order');
    }

    // Optional metadata
    const returnReason = String(req.data?.reason || '').trim();
    const returnNotes = String(req.data?.notes || '').trim();

    // Idempotency: if return already created, do not recreate
    if (data.returnAwb || data.returnShipmentId) {
      // Update reason/notes if provided
      if (returnReason || returnNotes) {
        try {
          await ref.set({
            ...(returnReason ? { returnReason } : {}),
            ...(returnNotes ? { returnNotes } : {}),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        } catch {}
      }
      return { ok: true, already: true, awb: data.returnAwb || null, shipmentId: data.returnShipmentId || null };
    }

    const username = XPRESSBEES_USERNAME.value() || process.env.XPRESSBEES_USERNAME || '';
    const password = XPRESSBEES_PASSWORD.value() || process.env.XPRESSBEES_PASSWORD || '';
    if (!username || !password) throw new HttpsError('failed-precondition', 'XpressBees not configured');

    try {
      const token = await getXpressbeesToken({ username, password });
      const orderLabel = `RET${orderId.slice(0,6).toUpperCase()}`;
      const pickupOverride = (() => {
        const p = req.data?.pickup || {};
        if (!p || typeof p !== 'object') return null;
        const out = {};
        if (p.name) out.name = String(p.name);
        if (p.phone) out.phone = String(p.phone);
        if (p.address) out.address = String(p.address);
        if (p.city) out.city = String(p.city);
        if (p.state) out.state = String(p.state);
        if (p.zip || p.pincode || p.pin) out.zip = String(p.zip || p.pincode || p.pin);
        return Object.keys(out).length ? out : null;
      })();
      const payload = buildXbReversePayload({ orderLabel, data, pickupOverride });
      if (returnReason || returnNotes) {
        payload.remarks = [returnReason, returnNotes].filter(Boolean).join(' | ');
      }
      const url = `${xbOrigin()}/api/shipments2`;
      let resp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (resp.status === 401 || resp.status === 403) {
        const fresh = await getXpressbeesToken({ username, password });
        resp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${fresh}` }, body: JSON.stringify(payload) });
      }
      let raw = null; try { raw = await resp.json(); } catch { try { raw = await resp.text(); } catch { raw = null; } }
      if (!resp.ok) {
        const msg = (raw && (raw.message || raw.error)) || `HTTP ${resp.status}`;
        throw new HttpsError('internal', String(msg));
      }
      let awb = null, shipmentId = null;
      try {
        const s = raw && typeof raw === 'object' ? (raw.data || raw || {}) : {};
        awb = s?.awb_number || s?.awb || s?.awbno || null;
        shipmentId = s?.shipment_id || s?.order_id || s?.id || null;
      } catch {}

      await ref.set({
        returnRequested: true,
        returnRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
        returnAwb: awb || null,
        returnShipmentId: shipmentId || null,
        returnRaw: raw || null,
        ...(returnReason ? { returnReason } : {}),
        ...(returnNotes ? { returnNotes } : {}),
        ...(pickupOverride ? { returnPickup: pickupOverride } : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Mirror crucial fields to user's subcollection order doc for UI consistency
      try {
        const topId = ref.id;
        let userOrderRef = admin.firestore().doc(`users/${uid}/orders/${topId}`);
        let userDoc = await userOrderRef.get();
        if (!userDoc.exists) {
          const qs = await admin
            .firestore()
            .collection(`users/${uid}/orders`)
            .where('orderId', '==', topId)
            .limit(1)
            .get();
          if (!qs.empty) userOrderRef = qs.docs[0].ref;
        }
        await userOrderRef.set({
          returnRequested: true,
          returnAwb: awb || null,
          returnShipmentId: shipmentId || null,
          ...(returnReason ? { returnReason } : {}),
          ...(returnNotes ? { returnNotes } : {}),
          ...(pickupOverride ? { returnPickup: pickupOverride } : {}),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (_) {}

      return { ok: true, awb, shipmentId };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError('internal', e?.message || 'Return failed');
    }
  }
);

// Get latest live shipment status from XpressBees for an order or AWB
exports.getOrderShipmentStatus = onCall(
  { region: REGION, secrets: [XPRESSBEES_USERNAME, XPRESSBEES_PASSWORD] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required');
    const orderId = String(req.data?.orderId || '').trim();
    const awbInput = String(req.data?.awb || '').trim();
    const prefer = String(req.data?.prefer || '').trim().toLowerCase(); // 'return' | 'forward'
    if (!orderId && !awbInput) throw new HttpsError('invalid-argument', 'orderId or awb is required');

    const db = admin.firestore();
    let awb = awbInput || '';
    if (orderId) {
      const ref = db.doc(`orders/${orderId}`);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'Order not found');
      const data = snap.data() || {};
      if (data.userId && data.userId !== uid && (data.user?.id && data.user.id !== uid)) {
        throw new HttpsError('permission-denied', 'Not your order');
      }
      if (!awb) {
        awb = prefer === 'return' ? (data.returnAwb || data.xbAwb || '') : (data.xbAwb || data.returnAwb || '');
      }
    }
    if (!awb) throw new HttpsError('not-found', 'No AWB on order');

    const username = XPRESSBEES_USERNAME.value() || process.env.XPRESSBEES_USERNAME || '';
    const password = XPRESSBEES_PASSWORD.value() || process.env.XPRESSBEES_PASSWORD || '';
    if (!username || !password) throw new HttpsError('failed-precondition', 'XpressBees not configured');

    try {
      const token = await getXpressbeesToken({ username, password });
      const out = await fetchXbStatus({ token, base: XB_ORIGIN, awb });
      if (!out.ok) return { ok: false, error: out.error || 'unavailable' };
      // Try to extract a compact summary
      let summary = null;
      const data = out.data;
      try {
        const obj = typeof data === 'object' ? data : {};
        const s = obj.status || obj.current_status || obj.currentStatus || obj.shipment_status || obj.message || null;
        summary = s || null;
      } catch {}
      return { ok: true, awb, summary, raw: out.data };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError('internal', e?.message || 'Tracking failed');
    }
  }
);

// Submit a refund request (server authoritative write)
exports.submitRefundRequest = onCall({ region: REGION }, async (req) => {
  try {
    const uid = req?.auth?.uid || null;
    if (!uid) throw new HttpsError('unauthenticated', 'Authentication required');
    const body = (req?.data && typeof req.data === 'object') ? req.data : {};

    // Basic validation
    const contact = body.contact || {};
    if (!contact.name || !contact.email || !contact.phone) {
      throw new HttpsError('invalid-argument', 'Missing contact details');
    }
    const orderRef = body.orderRef || {};
    if (!orderRef.id) throw new HttpsError('invalid-argument', 'Missing order reference');

    // Whitelist shape to avoid storing unexpected fields
    const images = Array.isArray(body.images) ? body.images.map((x) => ({
      path: String(x.path || ''),
      publicUrl: String(x.publicUrl || ''),
      name: String(x.name || ''),
      size: Number(x.size || 0),
      type: String(x.type || ''),
    })) : [];
    const payload = {
      userId: uid,
      orderRef: { id: String(orderRef.id || ''), orderId: String(orderRef.orderId || orderRef.id || '') },
      item: body.item || null,
      contact: { name: String(contact.name), email: String(contact.email), phone: String(contact.phone) },
      address: String(body.address || ''),
      deliveryDate: body.deliveryDate || null,
      reason: body.reason || {},
      condition: String(body.condition || ''),
      resolution: String(body.resolution || 'refund'),
      refundMethod: String(body.refundMethod || 'prepaid'),
      bank: body.refundMethod === 'cod' ? (body.bank || {}) : null,
      comments: String(body.comments || ''),
      images,
      declarations: body.declarations || {},
      signature: String(body.signature || ''),
      requestDate: String(body.requestDate || ''),
      status: 'requested',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const db = admin.firestore();
    // Enforce single request per user per order via index doc
    const idxKey = `${uid}_${payload.orderRef.id}`;
    const idxRef = db.collection('refundRequestsIndex').doc(idxKey);
    try {
      await idxRef.create({ userId: uid, orderId: payload.orderRef.id, requestId: null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (e) {
      // Index exists → fetch and return existing
      const idxSnap = await idxRef.get();
      const idx = idxSnap.exists ? idxSnap.data() : null;
      if (idx && idx.requestId) return { ok: true, id: idx.requestId, already: true };
      // Fallback: query existing request
      const existingSnap = await db
        .collection('refundRequests')
        .where('userId', '==', uid)
        .where('orderRef.id', '==', payload.orderRef.id)
        .limit(1)
        .get();
      if (!existingSnap.empty) {
        const docRef = existingSnap.docs[0];
        // Attempt to backfill index
        try { await idxRef.set({ userId: uid, orderId: payload.orderRef.id, requestId: docRef.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }); } catch {}
        return { ok: true, id: docRef.id, already: true };
      }
      // If we get here, index existed but no request doc; proceed to create a new request
    }

    const topRef = await db.collection('refundRequests').add(payload);
    await db.collection('users').doc(uid).collection('refundRequests').doc(topRef.id).set({ ...payload, id: topRef.id });
    try { await idxRef.set({ requestId: topRef.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }); } catch {}
    return { ok: true, id: topRef.id };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    throw new HttpsError('internal', e?.message || 'Failed to submit refund request');
  }
});
