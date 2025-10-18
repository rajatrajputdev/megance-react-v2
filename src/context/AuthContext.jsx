import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase.js";
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  RecaptchaVerifier,
  linkWithPhoneNumber,
  PhoneAuthProvider,
  updatePhoneNumber,
} from "firebase/auth";
import { preferRedirectAuth } from "../utils/env.js";
import { doc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const profileUnsubRef = React.useRef(null);

  const recaptchaRef = React.useRef(null);
  const recaptchaContainerRef = React.useRef(null);
  const recaptchaReadyRef = React.useRef(Promise.resolve());
  const phoneLinkConfirmRef = React.useRef(null);
  const phoneChangeVerificationIdRef = React.useRef(null);

  function normalizePhone(raw) {
    try {
      const s = String(raw || "").trim();
      if (!s) return "";
      if (s.startsWith("+")) return s;
      const digits = s.replace(/[^\d]/g, "");
      if (digits.length === 10) return `+91${digits}`;
      if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
      return "";
    } catch {
      return "";
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setInitializing(false);

      if (!u) {
        try { if (profileUnsubRef.current) profileUnsubRef.current(); } catch {}
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      const profRef = doc(db, "users", u.uid);
      try { if (profileUnsubRef.current) profileUnsubRef.current(); } catch {}
      profileUnsubRef.current = onSnapshot(
        profRef,
        (snap) => {
          setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
          setProfileLoading(false);
        },
        (e) => {
          setError(e);
          setProfile(null);
          setProfileLoading(false);
        }
      );
    });

    return () => {
      try { if (profileUnsubRef.current) profileUnsubRef.current(); } catch {}
      unsub();
    };
  }, []);

  // Google sign-in: try popup; fallback to redirect. Force redirect in in-app/ios safari.
  const signInWithGoogle = async (opts = {}) => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try { provider.setCustomParameters({ prompt: "select_account" }); } catch {}

    const target = opts?.postLoginPath ? String(opts.postLoginPath) : "/";
    try { sessionStorage.setItem("postLoginPath", target); } catch {}

    const doRedirect = async () => {
      try {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("authReturn", "1");
          url.searchParams.set("from", target);
          window.history.replaceState({}, "", url);
        }
      } catch {}
      await signInWithRedirect(auth, provider);
      return null; // control flows to /auth-redirect afterwards
    };

    if (opts?.mode === "redirect" || preferRedirectAuth()) {
      return doRedirect();
    }

    try {
      const cred = await signInWithPopup(auth, provider);
      return cred?.user || null;
    } catch (e) {
      // Popup blocked or not allowed → fallback to redirect
      const code = e?.code || "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        return doRedirect();
      }
      throw e;
    }
  };

  // --- reCAPTCHA helpers (for phone link/change) ---
  const resetRecaptcha = async () => {
    try { if (recaptchaRef.current?.clear) await recaptchaRef.current.clear(); } catch {}
    recaptchaRef.current = null;
    recaptchaContainerRef.current = null;
  };

  const ensureRecaptcha = async (fresh = false) => {
    if (fresh) await resetRecaptcha();
    if (recaptchaRef.current) return recaptchaRef.current;
    await recaptchaReadyRef.current;
    if (recaptchaRef.current) return recaptchaRef.current;

    const p = (async () => {
      const host =
        typeof document !== "undefined"
          ? document.getElementById("global-recaptcha-container")
          : null;
      if (!host) throw new Error("reCAPTCHA container missing");

      const holder = document.createElement("div");
      holder.setAttribute("data-recaptcha-instance", String(Date.now()));
      host.appendChild(holder);
      recaptchaContainerRef.current = holder;

      const verifier = new RecaptchaVerifier(auth, holder, { size: "invisible" });
      await verifier.render();
      recaptchaRef.current = verifier;
      return verifier;
    })();

    recaptchaReadyRef.current = p.catch(() => {});
    return p;
  };

  // Phone OTP linking for current user during onboarding/account
  const startLinkPhone = async (phoneNumber) => {
    if (!auth.currentUser) throw new Error("Sign in first");
    setError(null);
    try {
      const e164 = normalizePhone(phoneNumber);
      if (!e164) {
        const err = new Error("Invalid phone number");
        err.code = "auth/invalid-phone-number";
        throw err;
      }
      const verifier = await ensureRecaptcha(true);
      const confirmation = await linkWithPhoneNumber(auth.currentUser, e164, verifier);
      phoneLinkConfirmRef.current = confirmation;
      await resetRecaptcha();
      return true;
    } catch (e) {
      await resetRecaptcha();
      throw e;
    }
  };

  const confirmLinkPhone = async (code) => {
    setError(null);
    if (!phoneLinkConfirmRef.current) throw new Error("Start phone link first");
    const res = await phoneLinkConfirmRef.current.confirm(code);
    setTimeout(() => { phoneLinkConfirmRef.current = null; }, 0);
    return res.user;
  };

  // Change existing phone number: verify, then updatePhoneNumber
  const startChangePhone = async (phoneNumber) => {
    if (!auth.currentUser) throw new Error("Sign in first");
    setError(null);
    try {
      const e164 = normalizePhone(phoneNumber);
      if (!e164) {
        const err = new Error("Invalid phone number");
        err.code = "auth/invalid-phone-number";
        throw err;
      }
      const verifier = await ensureRecaptcha(true);
      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(e164, verifier);
      phoneChangeVerificationIdRef.current = verificationId;
      await resetRecaptcha();
      return true;
    } catch (e) {
      await resetRecaptcha();
      throw e;
    }
  };

  const confirmChangePhone = async (code) => {
    setError(null);
    if (!phoneChangeVerificationIdRef.current) throw new Error("Start phone change first");
    const cred = PhoneAuthProvider.credential(phoneChangeVerificationIdRef.current, code);
    await updatePhoneNumber(auth.currentUser, cred);
    phoneChangeVerificationIdRef.current = null;
    return auth.currentUser;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      initializing,
      error,
      // profile
      profile,
      profileLoading,
      // google sign-in
      signInWithGoogle,
      // phone link/change
      startLinkPhone,
      confirmLinkPhone,
      startChangePhone,
      confirmChangePhone,
      // common
      logout,
    }),
    [user, initializing, error, profile, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
