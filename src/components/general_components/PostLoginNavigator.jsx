import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLocation, useNavigate } from "react-router-dom";

export default function PostLoginNavigator() {
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (initializing || !user) return;
    let target = null;
    try {
      target = sessionStorage.getItem('postLoginPath') || localStorage.getItem('postLoginPath');
    } catch {}
    if (target) {
      try { sessionStorage.removeItem('postLoginPath'); } catch {}
      try { localStorage.removeItem('postLoginPath'); } catch {}
      const current = `${location.pathname}${location.search || ''}`;
      if (target !== current) navigate(target, { replace: true });
      return;
    }
    // Fallback: if user landed on /login after redirect, send to setup
    if (location.pathname === '/login') {
      navigate('/setup?from=/', { replace: true });
    }
  }, [user, initializing]);

  return null;
}

