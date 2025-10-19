import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase.js";
import { doc, onSnapshot } from "firebase/firestore";

// Explicit maintenance-mode gate (no hidden controls).
// Reads Firestore doc config/app.enabled (public read, admin-only write),
// falls back to env and optional static JSON.

function parseBool(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  return !(s === "false" || s === "0" || s === "no" || s === "off");
}

export default function MaintenanceGate({ children, bypassPaths = ["/admin"] }) {
  const envDefault = useMemo(() => {
    const val = import.meta?.env?.VITE_APP_ENABLED;
    const p = parseBool(val);
    return p === null ? true : p; // default true if unset
  }, []);

  const [enabled, setEnabled] = useState(envDefault);
  const [loaded, setLoaded] = useState(false);

  // Allow bypass for admin pages so they remain reachable while disabled
  const path = (() => {
    try { return typeof window !== 'undefined' ? window.location.pathname : '/'; } catch { return '/'; }
  })();
  const bypass = Array.isArray(bypassPaths) && bypassPaths.some((p) => path.startsWith(p));

  useEffect(() => {
    let cancelled = false;
    let unsub = null;
    const ref = doc(db, "config", "app");
    try {
      unsub = onSnapshot(ref, (snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const p = parseBool(snap.data()?.enabled);
          if (p !== null) setEnabled(!!p);
        }
        setLoaded(true);
      }, () => {
        // Firestore failed: fallback to static flag
        fetch("/app-flag.json", { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (cancelled || !json) return;
            const p = parseBool(json?.enabled);
            if (p !== null) setEnabled(!!p);
          })
          .catch(() => {})
          .finally(() => { if (!cancelled) setLoaded(true); });
      });
    } catch {
      // Fallback path immediately
      fetch("/app-flag.json", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (cancelled || !json) return;
          const p = parseBool(json?.enabled);
          if (p !== null) setEnabled(!!p);
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoaded(true); });
    }
    return () => { cancelled = true; try { unsub && unsub(); } catch {} };
  }, []);

  if (bypass) return children;
  if (!loaded) return null; // hold until flag loads
  if (!enabled) return null; // white screen when disabled
  return children;
}
