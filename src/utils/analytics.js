// Lightweight GA4 integration for Vite + React Router
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

function ensureGtag() {
  if (!GA_ID) return false;
  if (typeof window === 'undefined') return false;
  if (window.__gaInitialized) return true;

  // Inject gtag.js
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // Disable automatic page_view so SPA can send explicit page views
  window.gtag('config', GA_ID, { send_page_view: false });
  window.__gaInitialized = true;
  return true;
}

export function initGA() {
  try { return ensureGtag(); } catch { return false; }
}

export function trackPageview(path) {
  try {
    if (!GA_ID || !window.gtag) return;
    const loc = window.location;
    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: `${loc.origin}${path}`,
      page_path: path,
    });
  } catch {}
}

export function trackEvent(name, params = {}) {
  try {
    if (!GA_ID || !window.gtag) return;
    window.gtag('event', name, params);
  } catch {}
}

export function trackAddToCart(item, qty = 1) {
  const price = Number(item.price) || 0;
  const quantity = Number(qty) || 1;
  trackEvent('add_to_cart', {
    currency: 'INR',
    value: price * quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        price,
        quantity,
      },
    ],
  });
}

