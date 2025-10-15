import { app } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

// Subscribe an email to newsletter. Accepts { email, name?, source? }
export async function subscribeNewsletter({ email, name, source } = {}) {
  const region = (import.meta.env.VITE_FUNCTIONS_REGION || "").trim() || undefined;
  // Prefer callable (no CORS hassle, works with/without auth)
  try {
    const fns = getFunctions(app, region);
    const call = httpsCallable(fns, "subscribeNewsletter");
    const res = await call({ email, name, source });
    return res?.data || { ok: true };
  } catch (e) {
    // Optional fallback to HTTP if base configured
    const base = (import.meta.env.VITE_FUNCTIONS_BASE_URL || "").trim();
    if (!base) throw e;
    const payload = { email, name, source };
    const res = await fetch(`${base.replace(/\/$/, "")}/subscribeNewsletterPublic`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = "Subscription failed";
      try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }
}

