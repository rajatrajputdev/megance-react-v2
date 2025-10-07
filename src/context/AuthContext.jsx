import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, linkWithPhoneNumber, PhoneAuthProvider, updatePhoneNumber, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null); // Firestore user profile doc data
  const [profileLoading, setProfileLoading] = useState(false);
  const profileUnsubRef = React.useRef(null);
  const recaptchaRef = React.useRef(null);
  const recaptchaContainerRef = React.useRef(null);
  const recaptchaReadyRef = React.useRef(Promise.resolve());
  const phoneLinkConfirmRef = React.useRef(null);
  const phoneChangeVerificationIdRef = React.useRef(null);

  useEffect(() => {
    // Ensure session persistence across reloads (production behavior)
    try { setPersistence(auth, browserLocalPersistence).catch(() => {}); } catch {}
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setInitializing(false);
      if (!u) {
        try { if (profileUnsubRef.current) profileUnsubRef.current(); } catch {}
        setProfile(null);
        setProfileLoading(false);
        return;
      }
      // Fetch profile doc from Firestore
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

  // Google-only sign in
  const signInWithGoogle = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  };

  // Fully clear any existing reCAPTCHA instance and its DOM container
  const resetRecaptcha = async () => {
    try { if (recaptchaRef.current?.clear) { await recaptchaRef.current.clear(); } } catch {}
    // Keep DOM nodes intact to avoid third-party script referencing removed elements
    recaptchaRef.current = null;
    recaptchaContainerRef.current = null;
  };

  // Create (or return) an invisible reCAPTCHA. If fresh=true, force a new one.
  const ensureRecaptcha = async (fresh = false) => {
    if (fresh) await resetRecaptcha();
    if (recaptchaRef.current) return recaptchaRef.current;
    // Wait for any prior init
    await recaptchaReadyRef.current;
    if (recaptchaRef.current) return recaptchaRef.current;
    const p = (async () => {
      const host = typeof document !== 'undefined' ? document.getElementById('global-recaptcha-container') : null;
      if (!host) throw new Error('reCAPTCHA container missing');
      const holder = document.createElement('div');
      holder.setAttribute('data-recaptcha-instance', String(Date.now()));
      host.appendChild(holder);
      recaptchaContainerRef.current = holder;
      const verifier = new RecaptchaVerifier(auth, holder, { size: 'invisible' });
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
      const verifier = await ensureRecaptcha(true); // always use a fresh instance
      const confirmation = await linkWithPhoneNumber(auth.currentUser, phoneNumber, verifier);
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
    // Leave confirmation around for a moment, then clear.
    // This allows quick retries if UI re-triggers confirm without resend.
    setTimeout(() => { phoneLinkConfirmRef.current = null; }, 0);
    return res.user;
  };

  // Change existing phone number: verify, then updatePhoneNumber
  const startChangePhone = async (phoneNumber) => {
    if (!auth.currentUser) throw new Error("Sign in first");
    setError(null);
    try {
      const verifier = await ensureRecaptcha(true); // always use a fresh instance
      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(phoneNumber, verifier);
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
      // phone link
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
