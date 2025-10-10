import { app } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

export async function previewCoupon({ code, amount }) {
  const region = (import.meta.env.VITE_FUNCTIONS_REGION || "").trim() || undefined;
  const fns = getFunctions(app, region);
  const call = httpsCallable(fns, "previewCoupon");
  const res = await call({ code, amount });
  return res.data;
}

