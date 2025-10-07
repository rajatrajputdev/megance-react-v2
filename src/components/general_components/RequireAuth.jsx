import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) {
    return (
      <div className="container page-section" aria-busy="true" aria-live="polite">
        <p className="opacity-7">Loading…</p>
      </div>
    );
  }
  if (!user) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?from=${from}`} replace />;
  }
  return children;
}
