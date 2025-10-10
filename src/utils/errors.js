export function friendlyOtpError(e, phase = 'verify') {
  const code = (e && e.code) ? String(e.code) : '';
  const msg = (e && e.message) ? String(e.message).toLowerCase() : '';

  // Rate limiting
  if (code.includes('too-many-requests')) return 'Too many attempts. Try again later.';

  // Phone formatting / missing
  if (phase === 'send' && (code.includes('invalid-phone-number') || msg.includes('invalid phone'))) return 'Invalid phone number.';
  if (phase === 'send' && code.includes('missing-phone-number')) return 'Enter a phone number.';

  // reCAPTCHA / app credential
  if (code.includes('captcha-check-failed') || code.includes('invalid-app-credential') || code.includes('missing-app-credential')) {
    return phase === 'send' ? 'Verification failed. Refresh and try again.' : 'Verification failed. Please resend code.';
  }

  // Verification code problems
  if (code.includes('invalid-verification-code')) return 'Invalid code. Check and try again.';
  if (code.includes('code-expired') || code.includes('invalid-session-info') || code.includes('session-expired')) {
    return 'Code expired. Resend a new one.';
  }

  // Connectivity
  if (code.includes('network-request-failed')) return 'Network error. Check connection.';

  // Generic
  return phase === 'send' ? 'Could not send code. Try again.' : 'Could not verify code. Try again.';
}
