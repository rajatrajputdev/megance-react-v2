import { app } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../firebase";

export async function updateUserProfileServer(data) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  // Prefer callable (no CORS). Region optional via env.
  try {
    const region = (import.meta.env.VITE_FUNCTIONS_REGION || "").trim() || undefined;
    const fns = getFunctions(app, region);
    const call = httpsCallable(fns, "updateUserProfileCallable");
    const res = await call(data || {});
    return res.data || { ok: true };
  } catch (e) {
    // Fallback to HTTP onRequest if base URL provided
    const base = (import.meta.env.VITE_FUNCTIONS_BASE_URL || "").trim();
    if (!base) throw e;
    const token = await user.getIdToken();
    const res = await fetch(`${base.replace(/\/$/, "")}/updateUserProfile`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(data || {}),
    });
    if (!res.ok) {
      let msg = "Failed to update profile";
      try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }
}
