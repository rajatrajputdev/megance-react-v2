import { db } from "../firebase";
import { doc, runTransaction } from "firebase/firestore";

function parseCartItem(item) {
  const id = item.id || "";
  const meta = item.meta || {};
  const size = meta.size ?? (id.includes("-s") ? id.split("-s").pop() : "");
  let base = id;
  if (size) {
    const cut = id.lastIndexOf(`-s${size}`);
    base = cut !== -1 ? id.slice(0, cut) : id;
  }
  let gender = meta.gender ?? null;
  if (!gender && /-men$/.test(base)) { gender = "men"; base = base.replace(/-men$/, ""); }
  else if (!gender && /-women$/.test(base)) { gender = "women"; base = base.replace(/-women$/, ""); }
  return { productId: base, size: String(size || ""), gender: gender || null, qty: Number(item.qty) || 0 };
}

export async function decrementStockForItems(cartItems) {
  // Group by product
  const grouped = new Map();
  for (const it of cartItems) {
    const parsed = parseCartItem(it);
    if (!parsed.productId) continue;
    const key = parsed.productId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(parsed);
  }

  for (const [productId, parts] of grouped.entries()) {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "products", productId);
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data() || {};
      let updated = {};
      let topQty = 0;

      if (data.sizeQuantities && typeof data.sizeQuantities === "object") {
        const sq = { ...data.sizeQuantities };
        for (const p of parts) {
          if (!p.size || !p.gender) continue;
          const arr = Array.isArray(sq[p.gender]) ? [...sq[p.gender]] : [];
          const idx = arr.findIndex((r) => String(r.size) === String(p.size));
          if (idx !== -1) {
            const cur = Number(arr[idx].quantity) || 0;
            arr[idx] = { ...arr[idx], quantity: Math.max(0, cur - p.qty) };
            sq[p.gender] = arr;
          }
        }
        updated.sizeQuantities = sq;
        // recompute top-level qty
        for (const g of Object.keys(sq)) {
          const arr = Array.isArray(sq[g]) ? sq[g] : [];
          topQty += arr.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
        }
      } else if (Array.isArray(data.sizes) && data.sizes.length && typeof data.sizes[0] === "object") {
        const sizes = [...data.sizes];
        for (const p of parts) {
          if (!p.size) continue;
          const idx = sizes.findIndex((r) => String(r.size) === String(p.size));
          if (idx !== -1) {
            const cur = Number(sizes[idx].quantity) || 0;
            sizes[idx] = { ...sizes[idx], quantity: Math.max(0, cur - p.qty) };
          }
        }
        updated.sizes = sizes;
        topQty = sizes.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
      }

      if (topQty > 0 || updated.sizes || updated.sizeQuantities) {
        updated.quantity = topQty;
        updated.updatedAt = new Date();
        tx.update(ref, updated);
      }
    });
  }
}

