// Lightweight Supabase Storage helpers using fetch
// Requires env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

function cfg() {
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const bucket = (import.meta.env.VITE_SUPABASE_BUCKET || "refund-requests").trim();
  if (!url || !key) throw new Error("Supabase env not configured");
  return { url: url.replace(/\/$/, ""), key, bucket };
}

export async function supabaseUploadFile({ file, path, upsert = false, bucket: bucketOverride }) {
  const { url, key, bucket } = cfg();
  const bkt = (bucketOverride || bucket).trim();
  // Try supabase-js first for clearer errors
  try {
    const { data, error } = await supabase.storage.from(bkt).upload(path, file, {
      upsert,
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
    });
    if (error) throw error;
  } catch (e) {
    // Fallback to REST if needed
    const endpoint = `${url}/storage/v1/object/${encodeURIComponent(bkt)}/${path}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': file.type || 'application/octet-stream',
        ...(upsert ? { 'x-upsert': 'true' } : {}),
      },
      body: file,
    });
    if (!res.ok) {
      let msg = '';
      try { msg = await res.text(); } catch {}
      throw new Error(msg || `Supabase upload failed (${res.status})`);
    }
  }
  // Public URL (works for public buckets). For private buckets, caller can request signed url.
  const publicUrl = `${url}/storage/v1/object/public/${encodeURIComponent(bkt)}/${path}`;
  return { path, publicUrl };
}

export async function supabaseGetSignedUrl({ path, expiresIn = 3600 }) {
  const { url, key, bucket } = cfg();
  const endpoint = `${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Supabase sign failed (${res.status})`);
  }
  const data = await res.json().catch(() => null);
  // API returns { signedURL: "/storage/v1/object/sign/<bucket>/<path>?token=..." }
  const signedURL = data?.signedURL || data?.signedUrl || data?.url;
  if (!signedURL) return null;
  const abs = signedURL.startsWith("http") ? signedURL : `${url}${signedURL}`;
  return abs;
}
import { supabase } from './supabaseClient.js';
