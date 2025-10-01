import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function RequireProfile({ children }) {
  const { user, profile, profileLoading } = useAuth();
  const location = useLocation();

  if (!user) return children; // RequireAuth handles auth
  if (profileLoading) return children; // still loading
  // Require a profile and a verified phone
  if (!profile || !profile.phone || profile.phoneVerified !== true) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/setup?from=${from}`} replace />;
  }
  return children;
}
