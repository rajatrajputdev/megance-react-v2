// Facebook Pixel minimal SPA helper
// ID source: use a hardcoded value or set window.FB_PIXEL_ID before app loads (no env usage).

const FB_PIXEL_ID = (typeof window !== 'undefined' && window.FB_PIXEL_ID ? String(window.FB_PIXEL_ID) : '').trim();

export function initFBPixel() {
  try {
    if (!FB_PIXEL_ID) return false;
    if (typeof window === 'undefined') return false;
    if (window.__fbPixelInitialized) return true;

    !(function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)})(
      window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js'
    );

    window.fbq('init', FB_PIXEL_ID);
    window.fbq('track', 'PageView');
    window.__fbPixelInitialized = true;
    return true;
  } catch { return false; }
}

export function trackFBPageView() {
  try { if (window.fbq) window.fbq('track', 'PageView'); } catch {}
}

export function trackFBEvent(name, params = {}) {
  try { if (window.fbq) window.fbq('track', name, params); } catch {}
}

export function trackFBViewContent({ id, name, price, currency = 'INR' } = {}) {
  try {
    if (!window.fbq) return;
    const contents = id ? [{ id: String(id), quantity: 1, item_price: Number(price) || 0 }] : undefined;
    window.fbq('track', 'ViewContent', {
      content_ids: id ? [String(id)] : undefined,
      content_name: name || undefined,
      content_type: 'product',
      value: Number(price) || 0,
      currency,
      contents,
    });
  } catch {}
}

export function trackFBAddToCart({ id, name, price, qty = 1, currency = 'INR' } = {}) {
  try {
    if (!window.fbq) return;
    const value = (Number(price) || 0) * (Number(qty) || 1);
    window.fbq('track', 'AddToCart', {
      content_ids: id ? [String(id)] : undefined,
      content_name: name || undefined,
      content_type: 'product',
      value,
      currency,
      contents: id ? [{ id: String(id), quantity: Number(qty) || 1, item_price: Number(price) || 0 }] : undefined,
    });
  } catch {}
}

export function trackFBInitiateCheckout({ items = [], value = 0, currency = 'INR' } = {}) {
  try {
    if (!window.fbq) return;
    const contents = items.map((x) => ({ id: String(x.id), quantity: Number(x.qty)||1, item_price: Number(x.price)||0 }));
    window.fbq('track', 'InitiateCheckout', {
      value: Number(value) || 0,
      currency,
      num_items: items.reduce((a,b)=>a + (Number(b.qty)||0), 0),
      contents,
      content_type: 'product',
    });
  } catch {}
}

export function trackFBPurchase({ items = [], value = 0, currency = 'INR', transaction_id } = {}) {
  try {
    if (!window.fbq) return;
    const contents = items.map((x) => ({ id: String(x.id), quantity: Number(x.qty)||1, item_price: Number(x.price)||0 }));
    window.fbq('track', 'Purchase', {
      value: Number(value) || 0,
      currency,
      contents,
      content_type: 'product',
      order_id: transaction_id || undefined,
    });
  } catch {}
}
