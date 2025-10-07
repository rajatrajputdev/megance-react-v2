const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

try { admin.initializeApp(); } catch (_) {}

// Owner email to receive order copies
const OWNER_EMAIL = 'megancetech@gmail.com';

// Secrets: set with `firebase functions:secrets:set`
const MAIL_USER = defineSecret('MAIL_USER');
const MAIL_PASS = defineSecret('MAIL_PASS');
const MAIL_FROM = defineSecret('MAIL_FROM');
const MAIL_HOST = defineSecret('MAIL_HOST'); // optional, for custom SMTP
const MAIL_PORT = defineSecret('MAIL_PORT'); // optional, for custom SMTP

// Razorpay secrets (do NOT expose on client)
const RAZORPAY_KEY_ID = defineSecret('RAZORPAY_KEY_ID');
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET');

function buildTransporter(env) {
  const user = env.MAIL_USER || '';
  const pass = env.MAIL_PASS || '';
  const host = env.MAIL_HOST || '';
  const port = parseInt(env.MAIL_PORT || '0', 10);

  if (host && port) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  // Default to Gmail service via app password
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

function renderOrderEmail({ orderId, data }) {
  const created = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : '';
  const items = Array.isArray(data.items) ? data.items : [];
  const totalQty = items.reduce((a, b) => a + (b.qty || 0), 0);
  const rows = items
    .map((it) => `<tr><td>${(it.name || '').toString()}</td><td align="right">${it.qty || 0}</td><td align="right">₹ ${(it.price || 0) * (it.qty || 0)}</td></tr>`) 
    .join('');
  const billing = data.billing || {};

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.5; color:#111">
      <h2 style="margin:0 0 10px">New Order: #${(orderId || '').toString().slice(0,6).toUpperCase()}</h2>
      <div style="opacity:.7; font-size:13px; margin-bottom:8px">Created: ${created}</div>
      ${data.paymentId ? `<div style="font-size:13px; margin-bottom:12px">Payment ID: <strong>${data.paymentId}</strong></div>` : ''}
      <div style="margin:14px 0;">
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr style="text-align:left; border-bottom:1px solid #eee">
              <th>Item</th>
              <th style="text-align:right">Qty</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="3" style="opacity:.7">No items</td></tr>'}
          </tbody>
        </table>
      </div>
      <div style="margin-top:10px">
        <div><strong>Total items:</strong> ${totalQty}</div>
        <div><strong>Total:</strong> ₹ ${data.amount || 0}</div>
        ${data.discount ? `<div><strong>Discount:</strong> - ₹ ${data.discount}</div>` : ''}
        <div><strong>Payable:</strong> ₹ ${data.payable || 0}</div>
      </div>
      <hr style="margin:16px 0; border:none; border-top:1px solid #eee" />
      <div>
        <h3 style="margin:0 0 6px; font-size:16px">Billing</h3>
        <div>${billing.name || ''}</div>
        <div>${billing.email || ''}</div>
        <div>${billing.phone || ''}</div>
        <div style="margin-top:6px">${[billing.address, billing.city, billing.state, billing.zip].filter(Boolean).join(', ')}</div>
      </div>
    </div>
  `;
  const text = `New Order #${(orderId || '').toString().slice(0,6).toUpperCase()}\n` +
    `Total items: ${totalQty}\nPayable: ₹ ${data.payable || 0}\nPayment: ${data.paymentId || ''}\n` +
    `Billing: ${billing.name || ''}, ${billing.phone || ''}, ${billing.email || ''}\n` +
    `${[billing.address, billing.city, billing.state, billing.zip].filter(Boolean).join(', ')}`;
  return { html, text };
}

exports.sendOwnerEmailOnOrder = onDocumentCreated({
  document: 'orders/{orderId}',
  region: 'asia-south2',
  secrets: [MAIL_USER, MAIL_PASS, MAIL_FROM, MAIL_HOST, MAIL_PORT],
}, async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  if (!data) return;

  const env = {
    MAIL_USER: MAIL_USER.value(),
    MAIL_PASS: MAIL_PASS.value(),
    MAIL_FROM: MAIL_FROM.value(),
    MAIL_HOST: MAIL_HOST.value(),
    MAIL_PORT: MAIL_PORT.value(),
  };

  if (!env.MAIL_USER || !env.MAIL_PASS) {
    console.warn('[sendOwnerEmailOnOrder] MAIL_USER/MAIL_PASS not set; skipping email');
    return;
  }

  const transporter = buildTransporter(env);
  const from = env.MAIL_FROM || env.MAIL_USER;
  const { html, text } = renderOrderEmail({ orderId: event.params.orderId, data });

  const subject = `New Order #${(event.params.orderId || '').toString().slice(0,6).toUpperCase()} – ₹ ${data.payable || 0}`;

  await transporter.sendMail({
    from,
    to: OWNER_EMAIL,
    subject,
    text,
    html,
  });
});

// Decrement product stock when an order is created.
// Idempotent via an order flag `stockDeducted` in the same transaction.
exports.decrementStockOnOrder = onDocumentCreated({
  document: 'orders/{orderId}',
  region: 'asia-south2',
}, async (event) => {
  const db = admin.firestore();
  const orderId = event.params.orderId;
  const orderRef = db.doc(`orders/${orderId}`);
  console.log('[decrementStockOnOrder] Triggered for order', orderId);

  function parseItem(it) {
    try {
      const meta = it.meta || {};
      let size = meta.size ? String(meta.size) : '';
      let gender = meta.gender || null;
      let id = String(it.id || '');
      let base = id;
      if (size) {
        const idx = base.lastIndexOf(`-s${size}`);
        base = idx !== -1 ? base.slice(0, idx) : base;
      }
      if (!gender) {
        if (base.endsWith('-men')) { gender = 'men'; base = base.slice(0, -4); }
        else if (base.endsWith('-women')) { gender = 'women'; base = base.slice(0, -6); }
      }
      return { productId: base, size, gender, qty: Number(it.qty) || 0 };
    } catch (_) {
      return null;
    }
  }

  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) { console.log('[decrementStockOnOrder] No order snapshot'); return; }
    if (orderSnap.get('stockDeducted') === true) { console.log('[decrementStockOnOrder] Already deducted'); return; }
    // Proceed for typical success statuses; be lenient to support test flows
    const status = String(orderSnap.get('status') || '').toLowerCase();
    if (status && !['ordered', 'paid', 'completed', 'success'].includes(status)) {
      console.log('[decrementStockOnOrder] Ignoring status', status);
      return;
    }

    const items = Array.isArray(orderSnap.get('items')) ? orderSnap.get('items') : [];
    const grouped = new Map();
    for (const it of items) {
      const p = parseItem(it);
      if (!p || !p.productId) continue;
      if (!grouped.has(p.productId)) grouped.set(p.productId, []);
      grouped.get(p.productId).push(p);
    }

    for (const [productId, parts] of grouped.entries()) {
      const ref = db.doc(`products/${productId}`);
      const snap = await tx.get(ref);
      if (!snap.exists) { console.log('[decrementStockOnOrder] Product missing:', productId); continue; }
      const data = snap.data() || {};

      let updates = {};
      let topQty = Number(data.quantity) || 0;
      let applied = false;

      if (data.sizeQuantities && typeof data.sizeQuantities === 'object') {
        const sq = { ...data.sizeQuantities };
        for (const p of parts) {
          if (!p.size || !p.gender) continue;
          const arr = Array.isArray(sq[p.gender]) ? [...sq[p.gender]] : [];
          const idx = arr.findIndex((r) => String(r.size) === String(p.size));
          if (idx !== -1) {
            const cur = Number(arr[idx].quantity) || 0;
            arr[idx] = { ...arr[idx], quantity: Math.max(0, cur - p.qty) };
            sq[p.gender] = arr;
          }
        }
        updates.sizeQuantities = sq;
        // recompute total
        topQty = 0;
        for (const g of Object.keys(sq)) {
          const arr = Array.isArray(sq[g]) ? sq[g] : [];
          topQty += arr.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
        }
        applied = true;
      } else if (Array.isArray(data.sizes) && data.sizes.length && typeof data.sizes[0] === 'object') {
        const sizes = [...data.sizes];
        for (const p of parts) {
          if (!p.size) continue;
          const idx = sizes.findIndex((r) => String(r.size) === String(p.size));
          if (idx !== -1) {
            const cur = Number(sizes[idx].quantity) || 0;
            sizes[idx] = { ...sizes[idx], quantity: Math.max(0, cur - p.qty) };
          }
        }
        updates.sizes = sizes;
        topQty = sizes.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
        applied = true;
      } else {
        // Fallback: no per-size quantities present. Decrement top-level quantity only.
        const totalQty = parts.reduce((a, b) => a + (Number(b.qty) || 0), 0);
        topQty = Math.max(0, topQty - totalQty);
        applied = true;
      }

      if (applied) {
        updates.quantity = topQty;
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        tx.update(ref, updates);
      }
    }

    tx.update(orderRef, {
      stockDeducted: true,
      stockDeductedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
});

// Create a Razorpay Order on the server to avoid exposing secrets and to enable secure signature verification
exports.createRazorpayOrder = onRequest({
  region: 'asia-south2',
  cors: true,
  secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET],
}, async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const rupees = Number(body.amount) || 0; // allow rupees for convenience
    const amount = Number.isFinite(rupees) ? Math.round(rupees * 100) : 0; // paise
    const currency = (body.currency || 'INR').toUpperCase();
    const receipt = String(body.receipt || `rcpt_${Date.now()}`);
    if (!amount || amount < 100) { res.status(400).json({ error: 'Invalid amount' }); return; }

    const keyId = RAZORPAY_KEY_ID.value();
    const keySecret = RAZORPAY_KEY_SECRET.value();
    if (!keyId || !keySecret) { res.status(500).json({ error: 'Razorpay secrets not configured' }); return; }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({ amount, currency, receipt, payment_capture: 1 }),
    });
    if (!rpRes.ok) {
      const text = await rpRes.text();
      res.status(502).json({ error: 'Failed to create order', details: text });
      return;
    }
    const data = await rpRes.json();
    res.status(200).json({ order: data, keyId }); // return public keyId to client
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Internal error' });
  }
});

// Verify Razorpay signature and mark order as paid
exports.verifyRazorpaySignature = onRequest({
  region: 'asia-south2',
  cors: true,
  secrets: [RAZORPAY_KEY_SECRET],
}, async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const orderId = String(body.razorpay_order_id || '');
    const paymentId = String(body.razorpay_payment_id || '');
    const signature = String(body.razorpay_signature || '');
    const orderDocId = String(body.orderDocId || '');
    if (!orderId || !paymentId || !signature || !orderDocId) { res.status(400).json({ error: 'Missing fields' }); return; }

    const keySecret = RAZORPAY_KEY_SECRET.value();
    const expected = crypto.createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const valid = expected === signature;
    if (!valid) { res.status(400).json({ ok: false, valid: false }); return; }

    const db = admin.firestore();
    const ref = db.doc(`orders/${orderDocId}`);
    await ref.update({
      status: 'paid',
      paymentVerified: true,
      razorpay: { orderId, paymentId, signature },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(200).json({ ok: true, valid: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Internal error' });
  }
});
