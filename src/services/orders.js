import { app } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

export async function decrementStockForOrder(orderId) {
  const region = (import.meta.env.VITE_FUNCTIONS_REGION || "").trim() || undefined;
  const fns = getFunctions(app, region);
  const call = httpsCallable(fns, "decrementStockForOrder");
  const res = await call({ orderId });
  return res.data || { ok: true };
}

