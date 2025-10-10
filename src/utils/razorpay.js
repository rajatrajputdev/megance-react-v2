export function loadRazorpay(src = "https://checkout.razorpay.com/v1/checkout.js") {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

export async function openRazorpayCheckout({ amount, currency = "INR", name, description, prefill, notes, onSuccess, onDismiss, key: keyOverride, orderId }) {
  await loadRazorpay();
  // Use public key from env (safe to expose on frontend)
  const key = (keyOverride || import.meta.env.VITE_RAZORPAY_KEY_ID || "").trim();
  if (!key) throw new Error("Missing Razorpay key. Provide 'key' or set VITE_RAZORPAY_KEY_ID.");
  const options = {
    key,
    amount: Math.round(amount * 100),
    currency,
    name: name || "Megance",
    description: description || "Order Payment",
    prefill: prefill || {},
    notes: notes || {},
    order_id: orderId || undefined,
    handler: function (response) {
      if (onSuccess) onSuccess(response);
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      },
    },
    theme: { color: "#000000" },
  };
  const rzp = new window.Razorpay(options);
  rzp.open();
}
