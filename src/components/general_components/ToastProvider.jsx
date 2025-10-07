import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]); // { id, type, text }
  const idRef = useRef(1);

  const showToast = useCallback((type, text, { timeout = 2600 } = {}) => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, type, text }]);
    if (timeout > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, timeout);
    }
  }, []);

  const remove = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type || 'info'}`}>
            <div className="toast-dot" aria-hidden />
            <div className="toast-text">{t.text}</div>
            <button className="toast-close" onClick={() => remove(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

