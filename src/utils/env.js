export function getUA() {
  try {
    return navigator.userAgent || "";
  } catch {
    return "";
  }
}

export function isInAppBrowser(ua = getUA()) {
  // Common in-app identifiers: Facebook/Instagram/Twitter/Google app
  return /(FBAN|FBAV|Instagram|Line|Twitter|GSA|OkHttp|FB_IAB)/i.test(ua);
}

export function isIOS(ua = getUA()) {
  return /iPad|iPhone|iPod/i.test(ua);
}

export function isSafari(ua = getUA()) {
  // Detect Safari (exclude Chrome on iOS which reports Safari in UA)
  const isSafariLike = /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/CriOS\//.test(ua);
  return isSafariLike;
}

export function preferRedirectAuth(ua = getUA()) {
  // On in-app browsers and some iOS Safari contexts, popup is unreliable.
  if (isInAppBrowser(ua)) return true;
  if (isIOS(ua) && isSafari(ua)) return true;
  return false;
}

