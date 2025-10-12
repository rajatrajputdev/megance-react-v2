import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../firebase.js";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext.jsx";
import SEO from "../components/general_components/SEO.jsx";
import { useToast } from "../components/general_components/ToastProvider.jsx";

export default function ReturnsPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

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
      if (!selectedOrderId && list.length) setSelectedOrderId(list[0].id);
    }, () => setLoadingOrders(false));
    return () => unsub();
  }, [user]);

  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId) || null, [orders, selectedOrderId]);
  const selectedItem = useMemo(() => {
    const arr = Array.isArray(selectedOrder?.items) ? selectedOrder.items : [];
    return arr[selectedItemIndex] || null;
  }, [selectedOrder, selectedItemIndex]);

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

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onReasonChange = (e) => setForm((f) => ({ ...f, reason: { ...f.reason, [e.target.name]: e.target.checked } }));
  const onOtherText = (e) => setForm((f) => ({ ...f, reason: { ...f.reason, otherText: e.target.value } }));
  const onCondition = (e) => setForm((f) => ({ ...f, condition: e.target.value }));
  const onResolution = (e) => setForm((f) => ({ ...f, resolution: e.target.value }));
  const onRefundMethod = (e) => setForm((f) => ({ ...f, refundMethod: e.target.value }));
  const onBankChange = (e) => setForm((f) => ({ ...f, bank: { ...f.bank, [e.target.name]: e.target.value } }));
  const onDecChange = (e) => setForm((f) => ({ ...f, declarations: { ...f.declarations, [e.target.name]: e.target.checked } }));

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
  const validate = () => {
    if (!selectedOrder) return "Select an order";
    if (!form.fullName || !form.email || !form.phone) return "Contact details missing";
    // At least one reason
    if (!form.reason.wrongSize && !form.reason.damaged && !form.reason.differentItem && !form.reason.qualityIssue && !form.reason.other) return "Select a reason";
    if (form.reason.other && !form.reason.otherText.trim()) return "Please specify other reason";
    if (!form.condition) return "Select product condition";
    if (!form.resolution) return "Select preferred resolution";
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
    const err = validate();
    if (err) { showToast("error", err); return; }
    setSubmitting(true);
    try {
      // Upload images if any with progress
      const uploads = [];
      const files = Array.from(form.images || []);
      let bytesTotal = files.reduce((a, f) => a + (f.size || 0), 0);
      let bytesSent = 0;
      const updateProgress = () => {
        if (!bytesTotal) { setUploadProgress(0); return; }
        setUploadProgress(Math.round((bytesSent / bytesTotal) * 100));
      };
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const path = `refundRequests/${user.uid}/${Date.now()}_${i}_${(f.name||'file').replace(/[^a-zA-Z0-9_.-]/g,'_')}`;
        const r = storageRef(storage, path);
        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(r, f, { contentType: f.type || undefined });
          task.on('state_changed', (snap) => {
            try { bytesSent += (snap.bytesTransferred - (task._lastBytes || 0)); task._lastBytes = snap.bytesTransferred; } catch {}
            updateProgress();
          }, (e) => reject(e), async () => {
            try {
              const url = await getDownloadURL(task.snapshot.ref);
              uploads.push({ path, url, name: f.name, size: f.size, type: f.type });
              resolve();
            } catch (e) { reject(e); }
          });
        });
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
      // Store in a common top-level collection for ops and under user for easy access
      await addDoc(collection(db, "refundRequests"), payload);
      await addDoc(collection(db, "users", user.uid, "refundRequests"), payload);
      showToast("success", "Request submitted. We’ll contact you in 24–48 hours.");
      // Reset only optional fields
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
    } catch (e) {
      showToast("error", e.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Return / Refund" description="Initiate a return or refund for your order." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="container page-section white-navbar-page">
        <div className="row justify-content-center">
          <div className="col-lg-9">
            <div className="p-20 card-like">
              <h3 className="mb-6">RETURN/REFUND REQUEST FORM</h3>
              <p className="opacity-7">Please fill in the details below to initiate your return or refund. Our support team will review your request within 24–48 hours and get in touch via WhatsApp or email.</p>

              {/* Order selection */}
              <div className="mt-15">
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
              </div>

              {/* Item selection within order */}
              {selectedOrder && (
                <div className="mt-10">
                  <label className="fw-600">Select Product in Order</label>
                  <select className="form-control mt-6" value={selectedItemIndex} onChange={(e)=>setSelectedItemIndex(Number(e.target.value)||0)}>
                    {(selectedOrder.items||[]).map((it, idx) => (
                      <option key={idx} value={idx}>{it.name}{it.size ? ` – Size ${it.size}` : ""} × {it.qty}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Contact + Address (read only) */}
              <div className="row mt-15">
                <div className="col-md-6 mb-10">
                  <label>Full Name</label>
                  <input className="form-control" name="fullName" value={form.fullName} onChange={onChange} />
                  {touchedSubmit && !form.fullName && <div className="inline-error mt-4">Full name is required</div>}
                </div>
                <div className="col-md-6 mb-10">
                  <label>Order ID</label>
                  <input className="form-control" value={selectedOrder ? (selectedOrder.orderId || selectedOrder.id) : ""} readOnly />
                </div>
                <div className="col-md-6 mb-10">
                  <label>Registered Email ID</label>
                  <input className="form-control" name="email" value={form.email} onChange={onChange} />
                  {touchedSubmit && !form.email && <div className="inline-error mt-4">Email is required</div>}
                </div>
                <div className="col-md-6 mb-10">
                  <label>Phone Number / WhatsApp</label>
                  <input className="form-control" name="phone" value={form.phone} onChange={onChange} />
                  {touchedSubmit && !form.phone && <div className="inline-error mt-4">Phone is required</div>}
                </div>
                <div className="col-12 mb-10">
                  <label>Delivery Address (from order)</label>
                  <textarea className="form-control" value={form.address} readOnly />
                  <div className="form-hint">Address is fixed as per the original order and cannot be changed.</div>
                </div>
              </div>

              {/* Product + Delivery date */}
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

              {/* Reasons */}
              <div className="mt-10">
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
              <div className="mt-10">
                <label className="fw-600">Product Condition</label>
                <div className="mt-6">
                  <label className="radio-inline mr-10"><input type="radio" name="condition" value="unused" checked={form.condition === 'unused'} onChange={onCondition} /> Unused & Unworn</label>
                  <label className="radio-inline mr-10"><input type="radio" name="condition" value="tried" checked={form.condition === 'tried'} onChange={onCondition} /> Tried Once Indoors</label>
                  <label className="radio-inline"><input type="radio" name="condition" value="used" checked={form.condition === 'used'} onChange={onCondition} /> Used / Worn (not eligible for refund)</label>
                </div>
                {touchedSubmit && !form.condition && <div className="inline-error mt-6">Select product condition</div>}
              </div>

              {/* Uploads */}
              <div className="mt-10">
                <label className="fw-600">Upload Product Images</label>
                <div className="form-hint">Attach 2–3 clear pictures showing the product and packaging.</div>
                <input className="form-control mt-6" type="file" multiple accept="image/*" onChange={onFiles} />
                {form.images?.length > 0 && (
                  <div className="mt-6 small">
                    Selected: {(form.images||[]).map(f=>f.name).join(', ')}
                  </div>
                )}
                {submitting && uploadProgress > 0 && (
                  <div className="mt-6 small">Uploading images… {uploadProgress}%</div>
                )}
              </div>

              {/* Resolution */}
              <div className="row mt-10">
                <div className="col-md-6 mb-10">
                  <label className="fw-600">Preferred Resolution</label>
                  <div className="mt-6">
                    <label className="radio-inline mr-10"><input type="radio" name="resolution" value="refund" checked={form.resolution === 'refund'} onChange={onResolution} /> Refund (₹450 deduction applies; refund ₹ {refundEstimate})</label>
                    <div className="mt-6">
                      <label className="radio-inline"><input type="radio" name="resolution" value="exchange" checked={form.resolution === 'exchange'} onChange={onResolution} /> Exchange (size or color – subject to availability)</label>
                    </div>
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

              {/* Bank details for COD */}
              {form.refundMethod === 'cod' && (
                <div className="mt-10">
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
              <div className="mt-10">
                <label>Additional Comments (Optional)</label>
                <textarea className="form-control" name="comments" value={form.comments} onChange={onChange} rows={3} />
              </div>

              {/* Declarations */}
              <div className="mt-10">
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

              <div className="d-flex justify-content-end mt-15">
                <button className="butn butn-md butn-rounded" disabled={submitting || loadingOrders || !selectedOrder} onClick={submit}>
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
