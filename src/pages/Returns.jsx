import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, serverTimestamp, where, limit as qlimit, getDocs } from "firebase/firestore";
import { app, db } from "../firebase.js";
import { useAuth } from "../context/AuthContext.jsx";
import SEO from "../components/general_components/SEO.jsx";
import "./returns-page.css";
import { useToast } from "../components/general_components/ToastProvider.jsx";
import { supabaseUploadFile } from "../utils/supabase.js";
import Footer from "../components/homepage_components/Footer.jsx";

export default function ReturnsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  // Removed live shipment status and booking; simple submit only.
  const location = useLocation();
  const [existingReq, setExistingReq] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Prefillable info
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    productDesc: "",
    deliveryDate: "",
    reason: {
      wrongSize: false,
      damaged: false,
      differentItem: false,
      qualityIssue: false,
      other: false,
      otherText: "",
    },
    condition: "", // unused | tried-indoors | used
    images: [],
    resolution: "refund", // refund | exchange
    refundMethod: "prepaid", // prepaid | cod
    bank: {
      accountHolder: "",
      bankName: "",
      accountNumber: "",
      ifsc: "",
      upi: "",
    },
    comments: "",
    declarations: {
      unusedOriginal: false,
      deductionConsent: false,
      timelineConsent: false,
    },
    signature: "",
    requestDate: new Date().toISOString().slice(0,10),
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a,b)=>((b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)));
      setOrders(list);
      setLoadingOrders(false);
      const params = new URLSearchParams(location.search || "");
      const qid = (params.get('orderId') || '').trim();
      if (qid) {
        const found = list.find(o => (o.orderId === qid) || (o.id === qid));
        if (found) setSelectedOrderId(found.id);
        else if (!selectedOrderId && list.length) setSelectedOrderId(list[0].id);
      } else if (!selectedOrderId && list.length) setSelectedOrderId(list[0].id);
    }, () => setLoadingOrders(false));
    return () => unsub();
  }, [user, location.search]);

  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId) || null, [orders, selectedOrderId]);
  const selectedItem = useMemo(() => {
    const arr = Array.isArray(selectedOrder?.items) ? selectedOrder.items : [];
    return arr[selectedItemIndex] || null;
  }, [selectedOrder, selectedItemIndex]);

  // Client-side duplicate guard: check if a refund request already exists for this order
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user || !selectedOrderId) { setExistingReq(null); return; }
        setCheckingExisting(true);
        const qref = query(
          collection(db, 'users', user.uid, 'refundRequests'),
          where('orderRef.id', '==', selectedOrderId),
          qlimit(1)
        );
        const snap = await getDocs(qref);
        if (cancelled) return;
        if (!snap.empty) {
          const d = snap.docs[0];
          setExistingReq({ id: d.id, ...d.data() });
        } else {
          setExistingReq(null);
        }
      } catch (_) {
        if (!cancelled) setExistingReq(null);
      } finally {
        if (!cancelled) setCheckingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, selectedOrderId]);

  // Prefill when order or item changes
  useEffect(() => {
    const o = selectedOrder;
    if (!o) return;
    const item = selectedItem;
    const name = (profile?.name || o.billing?.name || "").trim();
    const email = (profile?.email || o.billing?.email || "").trim();
    const phone = (profile?.phone || o.billing?.phone || "").trim();
    const addr = [o.billing?.address, o.billing?.city, o.billing?.state, o.billing?.zip].filter(Boolean).join(", ");
    const productDesc = item ? `${item.name}${item.size ? ` – Size ${item.size}` : ""}` : "";
    setForm((f) => ({
      ...f,
      fullName: name,
      email,
      phone,
      address: addr,
      productDesc,
      // Keep other fields as-is
    }));
  }, [selectedOrderId, selectedItemIndex, profile?.name, profile?.email, profile?.phone]);

  // Shipment tracking & booking removed per request.

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onReasonChange = (e) => setForm((f) => ({ ...f, reason: { ...f.reason, [e.target.name]: e.target.checked } }));
  const onOtherText = (e) => setForm((f) => ({ ...f, reason: { ...f.reason, otherText: e.target.value } }));
  const onCondition = (e) => setForm((f) => ({ ...f, condition: e.target.value }));
  // Resolution is fixed to refund; no exchange option
  const onRefundMethod = (e) => setForm((f) => ({ ...f, refundMethod: e.target.value }));
  const onBankChange = (e) => setForm((f) => ({ ...f, bank: { ...f.bank, [e.target.name]: e.target.value } }));
  const onDecChange = (e) => setForm((f) => ({ ...f, declarations: { ...f.declarations, [e.target.name]: e.target.checked } }));

  // Filter images: image/* only, up to 5 files, 5MB each
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    let err = "";
    const filtered = files
      .filter((f) => {
        const okType = f.type && f.type.startsWith("image/");
        const okSize = f.size <= 5 * 1024 * 1024;
        if (!okType) err = "Only image files are allowed";
        if (!okSize) err = "Each image must be under 5 MB";
        return okType && okSize;
      })
      .slice(0, 5);
    if (files.length > 5) err = "You can attach up to 5 images";
    setFileError(err);
    setForm((f) => ({ ...f, images: filtered }));
  };

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    setForm((f) => ({ ...f, images: files }));
  };

  const refundEstimate = useMemo(() => {
    const payable = Number(selectedOrder?.payable) || 0;
    const ded = 450;
    return Math.max(0, payable - ded);
  }, [selectedOrder?.payable]);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [touchedSubmit, setTouchedSubmit] = useState(false);
  const [fileError, setFileError] = useState("");
  const [previews, setPreviews] = useState([]);

  const validEmail = (s) => /.+@.+\..+/.test(String(s||"").trim());
  const validPhone = (s) => {
    const x = String(s||"").trim();
    if (!x) return false;
    if (x.startsWith("+")) return /^\+\d{10,15}$/.test(x);
    const d = x.replace(/\D/g, "");
    return d.length === 10; // Allow local 10-digit
  };

  // Build preview object URLs for selected images; revoke on change/unmount
  useEffect(() => {
    const files = Array.from(form.images || []);
    const urls = files.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
    setPreviews(urls);
    return () => { try { urls.forEach((u) => URL.revokeObjectURL(u.url)); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.images]);

  const removeImage = (idx) => {
    setForm((f) => {
      const arr = Array.from(f.images || []);
      arr.splice(idx, 1);
      return { ...f, images: arr };
    });
  };
  const validate = () => {
    if (!selectedOrder) return "Select an order";
    if (!form.fullName) return "Full name is required";
    if (!form.email || !validEmail(form.email)) return "Enter a valid email";
    if (!form.phone || !validPhone(form.phone)) return "Enter a valid phone number";
    // At least one reason
    if (!form.reason.wrongSize && !form.reason.damaged && !form.reason.differentItem && !form.reason.qualityIssue && !form.reason.other) return "Select a reason";
    if (form.reason.other && !form.reason.otherText.trim()) return "Please specify other reason";
    if (!form.condition) return "Select product condition";
    if (!Array.from(form.images || []).length) return "Attach at least 1 image";
    // resolution fixed to refund
    if (!form.refundMethod) return "Select refund method";
    if (form.refundMethod === 'cod') {
      const b = form.bank;
      if (!b.accountHolder || !b.bankName || !b.accountNumber || !b.ifsc) return "Enter bank details for COD refund";
    }
    if (!form.declarations.unusedOriginal || !form.declarations.deductionConsent || !form.declarations.timelineConsent) return "Agree to declarations";
    if (!form.signature.trim()) return "Provide digital consent (signature)";
    return null;
  };

  const submit = async () => {
    setTouchedSubmit(true);
    // Early guard: if a request already exists for this order, do not upload again
    if (existingReq && existingReq.id) {
      showToast('info', 'A refund request already exists for this order');
      try {
        const oid = selectedOrder?.orderId || selectedOrder?.id || '';
        navigate(`/return-success?requestId=${encodeURIComponent(existingReq.id)}&orderId=${encodeURIComponent(oid)}`);
      } catch {}
      return;
    }
    const err = validate();
    if (err) { showToast("error", err); return; }
    setSubmitting(true);
    try {
      showToast('info', `Uploading ${Array.from(form.images||[]).length} image(s)…`);
      // Upload images to Supabase Storage
      const uploads = [];
      const files = Array.from(form.images || []);
      const total = files.length || 0;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const clean = (f.name || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const path = `refundRequests/${user.uid}/${Date.now()}_${i}_${clean}`;
        const res = await supabaseUploadFile({ file: f, path });
        // Save public URL in Firestore
        uploads.push({ path, publicUrl: res.publicUrl, name: f.name, size: f.size, type: f.type });
        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }
      const payload = {
        userId: user.uid,
        orderRef: { id: selectedOrder.id, orderId: selectedOrder.orderId || selectedOrder.id },
        item: selectedItem ? { name: selectedItem.name, size: selectedItem.size, qty: selectedItem.qty, price: selectedItem.price } : null,
        contact: { name: form.fullName, email: form.email, phone: form.phone },
        address: form.address, // read-only
        deliveryDate: form.deliveryDate || null,
        reason: form.reason,
        condition: form.condition,
        resolution: form.resolution,
        refundMethod: form.refundMethod,
        bank: form.refundMethod === 'cod' ? form.bank : null,
        comments: form.comments || "",
        images: uploads,
        declarations: form.declarations,
        signature: form.signature,
        requestDate: form.requestDate,
        createdAt: serverTimestamp(),
        status: 'requested',
      };
      // Use server callable to enforce single request per order
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const region = (import.meta.env.VITE_FUNCTIONS_REGION || '').trim() || undefined;
      const fns = getFunctions(app, region);
      const call = httpsCallable(fns, 'submitRefundRequest');
      const res = await call(payload);
      const requestId = res?.data?.id || null;
      const already = !!res?.data?.already;
      showToast('success', 'Return request submitted');
      // Reset form and go to thank-you
      setForm((f) => ({
        ...f,
        reason: { ...f.reason, wrongSize: false, damaged: false, differentItem: false, qualityIssue: false, other: false, otherText: "" },
        condition: "",
        images: [],
        resolution: "refund",
        refundMethod: "prepaid",
        bank: { accountHolder: "", bankName: "", accountNumber: "", ifsc: "", upi: "" },
        comments: "",
        declarations: { unusedOriginal: false, deductionConsent: false, timelineConsent: false },
        signature: "",
        requestDate: new Date().toISOString().slice(0,10),
      }));
      setUploadProgress(0);
      setSubmitting(false);
      const oid = selectedOrder.orderId || selectedOrder.id;
      navigate(`/return-success?requestId=${encodeURIComponent(requestId || '')}&orderId=${encodeURIComponent(oid)}`);
    } catch (e) {
      showToast("error", e.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  // Prefill badges detection
  const billing = selectedOrder?.billing || {};
  const eq = (a, b) => String(a || '').trim() === String(b || '').trim();
  const orderAddress = [billing.address, billing.city, billing.state, billing.zip].filter(Boolean).join(', ');
  const isNamePrefilled = eq(form.fullName, (profile?.name || billing.name || ''));
  const isEmailPrefilled = eq(form.email, (profile?.email || billing.email || ''));
  const isPhonePrefilled = eq(form.phone, (profile?.phone || billing.phone || ''));
  const isAddressPrefilled = eq(form.address, orderAddress);

  return (
    <>
      <SEO title="Returns" description="Initiate a return for your order." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="container page-section white-navbar-page returns-page">
        <div className="row justify-content-center">
          <div className="col-lg-9">
            <div className="p-20 card-like">
              <h3 className="mb-6">RETURN REQUEST</h3>
              <p className="opacity-7 returns-intro">Please fill in the details below to initiate a return. No exchanges are offered at this time. Our support team will review your request within 24–48 hours and get in touch via WhatsApp or email.</p>

              {/* Order selection */}
              <div className="returns-section">
                <div className="returns-section-title">Order</div>
                <label className="fw-600">Select Previous Order</label>
                {loadingOrders ? (
                  <div className="opacity-7 mt-6">Loading your orders…</div>
                ) : orders.length === 0 ? (
                  <div className="inline-hint mt-6">No past orders found.</div>
                ) : (
                  <select className="form-control mt-6" value={selectedOrderId} onChange={(e)=>{ setSelectedOrderId(e.target.value); setSelectedItemIndex(0); }}>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>#{(o.orderId || o.id).slice(0,6).toUpperCase()} — ₹ {o.payable} — {o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : ""}</option>
                    ))}
                  </select>
                )}
                {existingReq && (
                  <div className="inline-hint mt-6" style={{ color: '#c33' }}>
                    A refund request already exists for this order.{' '}
                    <a className="underline" href={`/return-success?requestId=${encodeURIComponent(existingReq.id)}&orderId=${encodeURIComponent(selectedOrder?.orderId || selectedOrder?.id || '')}`}>View request</a>.
                  </div>
                )}
                {existingReq && (
                  <div className="mt-8">
                    <a
                      className="view-request-btn"
                      href={`/return-success?requestId=${encodeURIComponent(existingReq.id)}&orderId=${encodeURIComponent(selectedOrder?.orderId || selectedOrder?.id || '')}`}
                    >
                      View Request
                    </a>
                  </div>
                )}
              </div>

              {/* Shipment & tracking removed for simplified flow */}

              {/* Item selection within order */}
              {selectedOrder && (
                <div className="returns-section">
                  <div className="returns-section-title">Item</div>
                  <label className="fw-600">Select Product in Order</label>
                  <select className="form-control mt-6" value={selectedItemIndex} onChange={(e)=>setSelectedItemIndex(Number(e.target.value)||0)}>
                    {(selectedOrder.items||[]).map((it, idx) => (
                      <option key={idx} value={idx}>{it.name}{it.size ? ` – Size ${it.size}` : ""} × {it.qty}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Disable form sections when request exists */}
              <fieldset disabled={!!existingReq} className={existingReq ? 'returns-disabled' : undefined}>
              {/* Contact + Address (read only) */}
              <div className="returns-section">
                <div className="returns-section-title">Contact & Address</div>
                <div className="row mt-10">
                  <div className="col-md-6 mb-10">
                    <label>Full Name {isNamePrefilled && <small className="prefill-tag">Prefilled</small>}</label>
                    <input className="form-control" name="fullName" value={form.fullName} onChange={onChange} />
                    {touchedSubmit && !form.fullName && <div className="inline-error mt-4">Full name is required</div>}
                  </div>
                  <div className="col-md-6 mb-10">
                    <label>Order ID</label>
                    <input className="form-control" value={selectedOrder ? (selectedOrder.orderId || selectedOrder.id) : ""} readOnly />
                  </div>
                  <div className="col-md-6 mb-10">
                    <label>Registered Email ID {isEmailPrefilled && <small className="prefill-tag">Prefilled</small>}</label>
                    <input className="form-control" name="email" value={form.email} onChange={onChange} />
                    {touchedSubmit && !form.email && <div className="inline-error mt-4">Email is required</div>}
                  </div>
                  <div className="col-md-6 mb-10">
                    <label>Phone Number / WhatsApp {isPhonePrefilled && <small className="prefill-tag">Prefilled</small>}</label>
                    <input className="form-control" name="phone" value={form.phone} onChange={onChange} />
                    {touchedSubmit && !form.phone && <div className="inline-error mt-4">Phone is required</div>}
                  </div>
                  <div className="col-12 mb-10">
                    <label>Delivery Address (from order) {isAddressPrefilled && <small className="prefill-tag">Prefilled</small>}</label>
                    <textarea className="form-control" value={form.address} readOnly />
                    <div className="form-hint">Address is fixed as per the original order and cannot be changed.</div>
                  </div>
                </div>
              </div>

              {/* Delivery info */}
              <div className="returns-section">
                <div className="returns-section-title">Delivery Information</div>
                <div className="row mt-10">
                <div className="col-md-8 mb-10">
                  <label>Product Name / Style</label>
                  <input className="form-control" value={form.productDesc} readOnly />
                  <div className="form-hint">e.g., Lisbon Fog – Size 42</div>
                </div>
                  <div className="col-md-4 mb-10">
                    <label>Date of Delivery</label>
                    <input className="form-control" type="date" name="deliveryDate" value={form.deliveryDate} onChange={onChange} />
                  </div>
                </div>
              </div>

              {/* Reasons */}
              <div className="returns-section">
                <div className="returns-section-title">Reason</div>
                <label className="fw-600">Reason for Return / Refund</label>
                <div className="mt-6">
                  <label className="checkbox-inline mr-10"><input type="checkbox" name="wrongSize" checked={form.reason.wrongSize} onChange={onReasonChange} /> Wrong Size</label>
                  <label className="checkbox-inline mr-10"><input type="checkbox" name="damaged" checked={form.reason.damaged} onChange={onReasonChange} /> Damaged Product</label>
                  <label className="checkbox-inline mr-10"><input type="checkbox" name="differentItem" checked={form.reason.differentItem} onChange={onReasonChange} /> Different Item Received</label>
                  <label className="checkbox-inline mr-10"><input type="checkbox" name="qualityIssue" checked={form.reason.qualityIssue} onChange={onReasonChange} /> Quality Issue</label>
                  <div className="mt-6">
                    <label className="checkbox-inline"><input type="checkbox" name="other" checked={form.reason.other} onChange={onReasonChange} /> Other (please specify)</label>
                    {form.reason.other && (
                      <input className="form-control mt-6" placeholder="Specify other reason" value={form.reason.otherText} onChange={onOtherText} />
                    )}
                  </div>
                  {touchedSubmit && !form.reason.wrongSize && !form.reason.damaged && !form.reason.differentItem && !form.reason.qualityIssue && !form.reason.other && (
                    <div className="inline-error mt-6">Select at least one reason</div>
                  )}
                </div>
              </div>

              {/* Condition */}
              <div className="returns-section">
                <div className="returns-section-title">Condition</div>
                <label className="fw-600">Product Condition</label>
                <div className="mt-6">
                  <label className="radio-inline mr-10"><input type="radio" name="condition" value="unused" checked={form.condition === 'unused'} onChange={onCondition} /> Unused & Unworn</label>
                  <label className="radio-inline mr-10"><input type="radio" name="condition" value="tried" checked={form.condition === 'tried'} onChange={onCondition} /> Tried Once Indoors</label>
                  <label className="radio-inline"><input type="radio" name="condition" value="used" checked={form.condition === 'used'} onChange={onCondition} /> Used / Worn (not eligible for refund)</label>
                </div>
                {touchedSubmit && !form.condition && <div className="inline-error mt-6">Select product condition</div>}
              </div>

              {/* Uploads */}
              <div className="returns-section">
                <div className="returns-section-title">Photos</div>
                <label className="fw-600">Upload Product Images</label>
                <div className="form-hint">Attach 2–3 clear pictures showing the product and packaging.</div>
                <input className="form-control mt-6" type="file" multiple accept="image/*" onChange={handleFiles} />
                {form.images?.length > 0 && (
                  <div className="mt-6">
                    <div className="small mb-6">Selected images:</div>
                    <div className="preview-grid">
                      {previews.map((p, i) => (
                        <div key={`${p.name}-${i}`} className="preview-item">
                          <img className="preview-img" src={p.url} alt={p.name} />
                          <button type="button" className="preview-remove underline" onClick={() => removeImage(i)} aria-label={`Remove ${p.name}`} title="Remove">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {submitting && uploadProgress > 0 && (
                  <div className="mt-6 small">Uploading images… {uploadProgress}%</div>
                )}
              </div>

              {/* Resolution: refund only */}
              <div className="returns-section">
                <div className="returns-section-title">Refund</div>
                <div className="row mt-10">
                <div className="col-md-6 mb-10">
                  <label className="fw-600">Refund</label>
                  <div className="mt-6">
                    <div className="inline-hint">A logistics & handling fee of ₹450 will be deducted. Estimated refund: ₹ {refundEstimate}</div>
                  </div>
                </div>
                <div className="col-md-6 mb-10">
                  <label className="fw-600">Refund Method</label>
                  <div className="mt-6">
                    <label className="radio-inline mr-10"><input type="radio" name="refundMethod" value="prepaid" checked={form.refundMethod === 'prepaid'} onChange={onRefundMethod} /> Prepaid Order (Refund to Original Payment Method)</label>
                    <div className="mt-6">
                      <label className="radio-inline"><input type="radio" name="refundMethod" value="cod" checked={form.refundMethod === 'cod'} onChange={onRefundMethod} /> COD Order (Enter Bank/UPI Details Below)</label>
                    </div>
                  </div>
                  {touchedSubmit && !form.refundMethod && <div className="inline-error mt-6">Select refund method</div>}
                </div>
                </div>
              </div>

              {/* Bank details for COD */}
              {form.refundMethod === 'cod' && (
                <div className="returns-section">
                  <div className="returns-section-title">Bank Details</div>
                  <label className="fw-600">For COD Refunds – Bank / UPI Details</label>
                  <div className="row mt-6">
                    <div className="col-md-6 mb-10"><label>Account Holder Name</label><input className="form-control" name="accountHolder" value={form.bank.accountHolder} onChange={onBankChange} /></div>
                    <div className="col-md-6 mb-10"><label>Bank Name</label><input className="form-control" name="bankName" value={form.bank.bankName} onChange={onBankChange} /></div>
                    <div className="col-md-6 mb-10"><label>Account Number</label><input className="form-control" name="accountNumber" value={form.bank.accountNumber} onChange={onBankChange} /></div>
                    <div className="col-md-6 mb-10"><label>IFSC Code</label><input className="form-control" name="ifsc" value={form.bank.ifsc} onChange={onBankChange} /></div>
                    <div className="col-md-6 mb-10"><label>UPI ID (optional)</label><input className="form-control" name="upi" value={form.bank.upi} onChange={onBankChange} /></div>
                  </div>
                  {touchedSubmit && (!form.bank.accountHolder || !form.bank.bankName || !form.bank.accountNumber || !form.bank.ifsc) && (
                    <div className="inline-error">Please enter required bank details for COD refunds</div>
                  )}
                </div>
              )}

              {/* Comments */}
              <div className="returns-section">
                <div className="returns-section-title">Additional Comments</div>
                <label>Additional Comments (Optional)</label>
                <textarea className="form-control" name="comments" value={form.comments} onChange={onChange} rows={3} />
              </div>

              {/* Declarations */}
              <div className="returns-section">
                <div className="returns-section-title">Declaration</div>
                <label className="fw-600">Declaration</label>
                <div className="mt-6">
                  <label className="checkbox-block"><input type="checkbox" name="unusedOriginal" checked={form.declarations.unusedOriginal} onChange={onDecChange} /> I confirm that the product is unused and in its original packaging.</label>
                  <label className="checkbox-block"><input type="checkbox" name="deductionConsent" checked={form.declarations.deductionConsent} onChange={onDecChange} /> I understand ₹450 will be deducted as logistics & handling fee.</label>
                  <label className="checkbox-block"><input type="checkbox" name="timelineConsent" checked={form.declarations.timelineConsent} onChange={onDecChange} /> I agree that refunds will be processed within 7–10 working days post-approval.</label>
                </div>
                {touchedSubmit && (!form.declarations.unusedOriginal || !form.declarations.deductionConsent || !form.declarations.timelineConsent) && (
                  <div className="inline-error mt-6">Please agree to all declarations</div>
                )}
              </div>

              {/* Signature and date */}
              <div className="returns-section">
                <div className="returns-section-title">Signature</div>
                <div className="row mt-10">
                <div className="col-md-8 mb-10">
                  <label>Signature / Digital Consent (type your name)</label>
                  <input className="form-control" name="signature" value={form.signature} onChange={onChange} />
                  {touchedSubmit && !form.signature && <div className="inline-error mt-4">Signature is required</div>}
                </div>
                <div className="col-md-4 mb-10">
                  <label>Date</label>
                  <input className="form-control" type="date" name="requestDate" value={form.requestDate} onChange={onChange} />
                </div>
                </div>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-10 small opacity-7">Uploading evidence: {uploadProgress}%</div>
              )}
              <div className="d-flex justify-content-end mt-15">
                <button className="butn butn-md butn-rounded submit-btn" disabled={submitting || loadingOrders || !selectedOrder || !!existingReq} onClick={submit} type="button" aria-busy={submitting ? 'true' : 'false'} title={existingReq ? 'Request already exists' : 'Submit'}>
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
              </fieldset>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
