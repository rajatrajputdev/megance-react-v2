import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, linkWithPhoneNumber, PhoneAuthProvider, updatePhoneNumber } from "firebase/auth";
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
  const phoneLinkConfirmRef = React.useRef(null);
  const phoneChangeVerificationIdRef = React.useRef(null);

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

  // Phone OTP linking for current user during onboarding/account
  const startLinkPhone = async (phoneNumber) => {
    if (!auth.currentUser) throw new Error("Sign in first");
    setError(null);
    // Clear any existing verifier to avoid widget clashes
    try { if (recaptchaRef.current) recaptchaRef.current.clear(); } catch {}
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {},
    });
    try {
      // Ensure widget is rendered before using
      await recaptchaRef.current.render();
      const confirmation = await linkWithPhoneNumber(auth.currentUser, phoneNumber, recaptchaRef.current);
      phoneLinkConfirmRef.current = confirmation;
      return true;
    } catch (e) {
      try { if (recaptchaRef.current) recaptchaRef.current.clear(); } catch {}
      recaptchaRef.current = null;
      throw e;
    }
  };

  const confirmLinkPhone = async (code) => {
    setError(null);
    if (!phoneLinkConfirmRef.current) throw new Error("Start phone link first");
    const res = await phoneLinkConfirmRef.current.confirm(code);
    phoneLinkConfirmRef.current = null;
    return res.user;
  };

  // Change existing phone number: verify, then updatePhoneNumber
  const startChangePhone = async (phoneNumber) => {
    if (!auth.currentUser) throw new Error("Sign in first");
    setError(null);
    try { if (recaptchaRef.current) recaptchaRef.current.clear(); } catch {}
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    try {
      await recaptchaRef.current.render();
      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(phoneNumber, recaptchaRef.current);
      phoneChangeVerificationIdRef.current = verificationId;
      return true;
    } catch (e) {
      try { if (recaptchaRef.current) recaptchaRef.current.clear(); } catch {}
      recaptchaRef.current = null;
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
