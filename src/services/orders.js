import { app } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

function baseUrl() {
  const explicit = (import.meta.env.VITE_FUNCTIONS_BASE_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const region = (import.meta.env.VITE_FUNCTIONS_REGION || "").trim();
  const project = (import.meta.env.VITE_FIREBASE_PROJECT_ID || "").trim();
  if (region && project) return `https://${region}-${project}.cloudfunctions.net`;
  return "";
}

export async function createRazorpayOrder({ amount, receipt }) {
  const base = baseUrl();
  if (!base) throw new Error("Functions base URL is not configured. Set VITE_FUNCTIONS_BASE_URL or VITE_FUNCTIONS_REGION + VITE_FIREBASE_PROJECT_ID.");
  const res = await fetch(`${base}/createRazorpayOrder`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount, receipt }),
  });
  if (!res.ok) {
    let msg = "Failed to create order";
    try {
      const j = await res.json();
      msg = j?.details || j?.error || msg;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  return res.json(); // { order, keyId }
}

export async function verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDocId }) {
  const base = baseUrl();
  if (!base) throw new Error("Functions base URL is not configured. Set VITE_FUNCTIONS_BASE_URL or VITE_FUNCTIONS_REGION + VITE_FIREBASE_PROJECT_ID.");
  const res = await fetch(`${base}/verifyRazorpaySignature`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDocId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Signature verification failed");
  }
  return res.json(); // { ok, valid }
}

export async function decrementStockForOrder(orderId) {
  const region = (import.meta.env.VITE_FUNCTIONS_REGION || "").trim() || undefined;
  const fns = getFunctions(app, region);
  const call = httpsCallable(fns, "decrementStockForOrder");
  const res = await call({ orderId });
  return res.data || { ok: true };
}

export async function requestReturn(orderId) {
  const region = (import.meta.env.VITE_FUNCTIONS_REGION || "").trim() || undefined;
  const fns = getFunctions(app, region);
  const call = httpsCallable(fns, "requestReturnForOrder");
  const res = await call({ orderId });
  return res.data || { ok: true };
}

export async function getOrderShipmentStatus({ orderId, awb, prefer }) {
  const region = (import.meta.env.VITE_FUNCTIONS_REGION || "").trim() || undefined;
  const fns = getFunctions(app, region);
  const call = httpsCallable(fns, "getOrderShipmentStatus");
  const res = await call({ orderId, awb, prefer });
  return res.data || { ok: false };
}
