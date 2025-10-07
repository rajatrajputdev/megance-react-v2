import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

function tsToDate(ts) {
  try {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  } catch {}
  return null;
}

function formatDate(ts) {
  const d = tsToDate(ts);
  if (!d) return '-';
  return d.toLocaleString();
}

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOrders(list);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  return (
    <div>
      <div className="toolbar">
        <h1>Orders</h1>
      </div>
      {loading ? (
        <div className="card" style={{ padding: 12 }}>Loading…</div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ padding: 12 }}>No orders found</div>
      ) : (
        <div className="grid-cards">
          {orders.map((o) => (
            <div key={o.id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>#{o.id.slice(-8)}</div>
                  <span className={`badge ${o.status === 'ordered' ? '' : 'muted'}`}>{o.status || 'unknown'}</span>
                </div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{formatDate(o.createdAt)}</div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600 }}>Customer</div>
                  <div style={{ fontSize: 13, color: '#333' }}>{o?.billing?.name || '-'}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{o?.billing?.email || ''}</div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600 }}>Items</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {(o.items || []).map((it, i) => (
                      <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span>{it.name} × {it.qty}</span>
                        <span>₹ {it.price * it.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Total</span>
                  <span>₹ {o.amount || 0}</span>
                </div>
                {o.discount ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Discount</span>
                    <span>- ₹ {o.discount}</span>
                  </div>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span>Payable</span>
                  <span>₹ {o.payable || o.amount || 0}</span>
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Payment: {o.paymentId || '-'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
