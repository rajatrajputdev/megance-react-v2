import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../firebase.js";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const phoneConfirmation = useRef(null);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  // Email/password signup + verification
  const registerWithEmail = async (email, password, name) => {
    setError(null);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    try { await sendEmailVerification(cred.user); } catch {}
    return cred.user;
  };

  const loginWithEmail = async (email, password) => {
    setError(null);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  // Email link (passwordless) sign-in
  const sendEmailLink = async (email) => {
    setError(null);
    const acs = {
      url: window.location.origin + "/login",
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, acs);
    window.localStorage.setItem("megance_email_for_signin", email);
  };
  const completeEmailLink = async () => {
    if (typeof window === "undefined") return false;
    const href = window.location.href;
    if (isSignInWithEmailLink(auth, href)) {
      let email = window.localStorage.getItem("megance_email_for_signin");
      if (!email) {
        email = window.prompt("Please confirm your email for sign-in");
      }
      const res = await signInWithEmailLink(auth, email, href);
      window.localStorage.removeItem("megance_email_for_signin");
      return res.user;
    }
    return false;
  };

  // Phone OTP sign-in
  const startPhoneSignIn = async (phoneNumber) => {
    setError(null);
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaRef.current);
    phoneConfirmation.current = confirmation;
    return true;
  };

  const confirmPhoneCode = async (code) => {
    setError(null);
    if (!phoneConfirmation.current) throw new Error("Start phone sign-in first");
    const res = await phoneConfirmation.current.confirm(code);
    phoneConfirmation.current = null;
    return res.user;
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      initializing,
      error,
      // email/password
      registerWithEmail,
      loginWithEmail,
      resendVerificationEmail,
      // email link
      sendEmailLink,
      completeEmailLink,
      // phone otp
      startPhoneSignIn,
      confirmPhoneCode,
      // common
      logout,
    }),
    [user, initializing, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
