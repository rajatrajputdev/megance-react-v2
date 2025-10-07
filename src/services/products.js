import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where, limit as qlimit } from "firebase/firestore";

function mapDoc(d) {
  const data = d.data() || {};
  const image = data.imageUrl || data.image || "/assets/imgs/shoes/s1.png";
  const price = typeof data.price === "number" ? data.price : parseFloat(data.price) || 0;
  const genders = Array.isArray(data.genders) ? data.genders : [];
  return {
    id: d.id,
    name: data.name || "Untitled",
    description: data.description || "",
    price,
    image,
    imageUrl: data.imageUrl || null,
    hover: data.hover || image,
    genders,
    sizes: data.sizes || null,
    sizeQuantities: data.sizeQuantities || null,
    quantity: data.quantity || 0,
    isVisible: data.isVisible !== false,
    categoryId: data.categoryId || null,
    categoryName: data.categoryName || null,
    tags: data.tags || [],
  };
}

export async function fetchProducts({ visibleOnly = true } = {}) {
  const col = collection(db, "products");
  const snap = await getDocs(col);
  const all = snap.docs.map(mapDoc);
  return visibleOnly ? all.filter((p) => p.isVisible !== false) : all;
}

export async function fetchProductById(id) {
  const ref = doc(db, "products", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapDoc(snap);
}

// Fetch products matching a category name (exact match), optional limit
export async function fetchProductsByCategoryName(categoryName, { visibleOnly = true, limit = 8 } = {}) {
  if (!categoryName) return [];
  const col = collection(db, "products");
  const q = query(col, where("categoryName", "==", categoryName), qlimit(Math.max(1, Number(limit) || 8)));
  const snap = await getDocs(q);
  const list = snap.docs.map(mapDoc);
  return visibleOnly ? list.filter((p) => p.isVisible !== false) : list;
}

// Fetch products where tags include the given tag (case-insensitive best-effort)
export async function fetchProductsByTag(tag, { visibleOnly = true, limit = 8 } = {}) {
  if (!tag) return [];
  const norm = String(tag).toLowerCase();
  // Try efficient query first if tags are stored in lowercase consistently
  try {
    const col = collection(db, "products");
    const q = query(col, where("tags", "array-contains", norm), qlimit(Math.max(1, Number(limit) || 8)));
    const snap = await getDocs(q);
    let list = snap.docs.map(mapDoc);
    if (visibleOnly) list = list.filter((p) => p.isVisible !== false);
    if (list.length > 0) return list;
  } catch {
    // Fallback: fetch all and filter locally (works even if tags are mixed-case)
  }
  // Fallback when query returned empty or errored
  const all = await fetchProducts({ visibleOnly });
  return all
    .filter((p) => Array.isArray(p.tags) && p.tags.some((t) => String(t).toLowerCase() === norm))
    .slice(0, Math.max(1, Number(limit) || 8));
}
