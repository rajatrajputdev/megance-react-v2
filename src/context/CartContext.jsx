import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { trackAddToCart } from "../utils/analytics.js";

const CartContext = createContext(null);

const STORAGE_KEY = "megance_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = (product, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === product.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        try { trackAddToCart(product, qty); } catch {}
        return next;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image || product.imageUrl || product.hover || "/assets/logo.svg",
          meta: product.meta || null,
          qty,
        },
      ];
    });
  };

  const removeItem = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
  const updateQty = (id, qty) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  const clearCart = () => setItems([]);

  const totals = useMemo(() => {
    const count = items.reduce((acc, x) => acc + x.qty, 0);
    const amount = items.reduce((acc, x) => acc + x.qty * x.price, 0);
    return { count, amount };
  }, [items]);

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQty, clearCart, ...totals }),
    [items, totals]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
