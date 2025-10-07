import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function RequireProfile({ children }) {
  const { user, profile, profileLoading, initializing } = useAuth();
  const location = useLocation();

  if (initializing || profileLoading) {
    return (
      <div className="container page-section" aria-busy="true" aria-live="polite">
        <p className="opacity-7">Loading your profile…</p>
      </div>
    );
  }
  if (!user) return children; // RequireAuth handles auth
  // Require a profile and a verified phone
  if (!profile || !profile.phone || profile.phoneVerified !== true) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/setup?from=${from}`} replace />;
  }
  return children;
}
