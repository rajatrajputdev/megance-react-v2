export function friendlyOtpError(e, phase = 'verify') {
  const code = (e && e.code) ? String(e.code) : '';
  if (code.includes('too-many-requests')) return 'Too many attempts. Try again later.';
  if (phase === 'send' && code.includes('invalid-phone-number')) return 'Invalid phone number.';
  if (phase === 'send' && code.includes('missing-phone-number')) return 'Enter a phone number.';
  if (code.includes('network-request-failed')) return 'Network error. Check connection.';
  // Keep it simple and generic for verification failures
  return phase === 'send' ? 'Could not send code. Try again.' : 'Could not verify code. Try again.';
}
