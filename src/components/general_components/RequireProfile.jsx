import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function RequireProfile({ children }) {
  const { user, profileLoading, initializing } = useAuth();
  const location = useLocation();

  if (initializing || profileLoading) {
    return (
      <div className="container page-section" aria-busy="true" aria-live="polite">
        <p className="opacity-7">Loading your profile…</p>
      </div>
    );
  }
  if (!user) return children; // RequireAuth handles auth
  // Production: require verified phone on the auth record
  const hasServerPhone = Boolean(user?.phoneNumber);
  if (!hasServerPhone) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/setup?from=${from}`} replace />;
  }
  return children;
}
