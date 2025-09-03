import { useEffect } from "react";

function upsert(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    // infer selector type
    if (selector.includes('[name="')) {
      el.setAttribute('name', selector.match(/name="([^"]+)"/)?.[1] || '');
    } else if (selector.includes('[property="')) {
      el.setAttribute('property', selector.match(/property="([^"]+)"/)?.[1] || '');
    }
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
}

export default function SEO({
  title,
  description,
  image = '/assets/logo.svg',
  type = 'website',
  twitterCard = 'summary',
}) {
  useEffect(() => {
    const site = 'Megance';
    const fullTitle = title ? `${title} — ${site}` : site;
    if (fullTitle) document.title = fullTitle;

    const desc = description || 'Elevate every turn with bold, sleek footwear engineered for comfort and performance.';
    const url = window?.location?.href || '/';
    const img = image || '/assets/logo.svg';

    // Basic
    upsert('meta[name="description"]', { name: 'description', content: desc });
    // Canonical link
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // Open Graph
    upsert('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsert('meta[property="og:description"]', { property: 'og:description', content: desc });
    upsert('meta[property="og:type"]', { property: 'og:type', content: type });
    upsert('meta[property="og:url"]', { property: 'og:url', content: url });
    upsert('meta[property="og:image"]', { property: 'og:image', content: img });
    upsert('meta[property="og:image:alt"]', { property: 'og:image:alt', content: 'Megance logo' });

    // Twitter
    upsert('meta[name="twitter:card"]', { name: 'twitter:card', content: twitterCard });
    upsert('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    upsert('meta[name="twitter:description"]', { name: 'twitter:description', content: desc });
    upsert('meta[name="twitter:image"]', { name: 'twitter:image', content: img.endsWith('.svg') ? '/assets/imgs/megance_logo_w.png' : img });
  }, [title, description, image, type, twitterCard]);

  return null;
}
