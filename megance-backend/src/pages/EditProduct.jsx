import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadProductImage, removeProductImage } from '../lib/storage';
import { updateProduct } from '../lib/products';
import { useNavigate, useParams } from 'react-router-dom';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [image, setImage] = useState(null); // new image file
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [availableTags] = useState(['trending', 'bestseller', 'new-arrival', 'featured']);
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTags, setCustomTags] = useState('');
  const [genders, setGenders] = useState([]);
  const [sizesMen, setSizesMen] = useState([{ size: '', quantity: 0 }]);
  const [sizesWomen, setSizesWomen] = useState([{ size: '', quantity: 0 }]);
  const [sizesList, setSizesList] = useState([{ size: '', quantity: 0 }]);

  useEffect(() => {
    const loadCategories = async () => {
      const snap = await getDocs(collection(db, 'categories'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCategories(list);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const ref = doc(db, 'products', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setLoading(false);
        navigate('/products');
        return;
      }
      const p = snap.data();
      setName(p.name || '');
      setDescription(p.description || '');
      setPrice(String(p.price ?? ''));
      setQuantity(String(p.quantity ?? ''));
      setImageUrl(p.imageUrl || '');
      setImagePath(p.imagePath || '');
      setCategoryId(p.categoryId || '');
      setIsVisible(p.isVisible !== false);
      const tags = Array.isArray(p.tags) ? p.tags : [];
      setSelectedTags(tags.filter((t) => availableTags.includes(t)));
      setCustomTags(tags.filter((t) => !availableTags.includes(t)).join(', '));

      const g = Array.isArray(p.genders) ? p.genders.filter((x) => x === 'men' || x === 'women') : [];
      setGenders(g);

      if (g.length > 0) {
        const menQ = Array.isArray(p.sizeQuantities?.men) ? p.sizeQuantities.men : (Array.isArray(p.sizes?.men) ? p.sizes.men.map((s) => ({ size: String(s), quantity: 0 })) : []);
        const womenQ = Array.isArray(p.sizeQuantities?.women) ? p.sizeQuantities.women : (Array.isArray(p.sizes?.women) ? p.sizes.women.map((s) => ({ size: String(s), quantity: 0 })) : []);
        setSizesMen(menQ.length ? menQ : [{ size: '', quantity: 0 }]);
        setSizesWomen(womenQ.length ? womenQ : [{ size: '', quantity: 0 }]);
      } else {
        const s = Array.isArray(p.sizes) ? p.sizes : [];
        const normalized = s.length && typeof s[0] === 'object' ? s : s.map((x) => ({ size: String(x), quantity: 0 }));
        setSizesList(normalized.length ? normalized : [{ size: '', quantity: 0 }]);
      }
      setLoading(false);
    };
    load();
  }, [id, navigate, availableTags]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let nextImageUrl = imageUrl;
    let nextImagePath = imagePath;
    if (image) {
      const uploaded = await uploadProductImage(image);
      nextImageUrl = uploaded.publicUrl;
      nextImagePath = uploaded.path;
      // Try removing old image
      if (imagePath && imagePath !== uploaded.path) {
        try { await removeProductImage(imagePath); } catch(_) {}
      }
    }

    const normalizedPredef = selectedTags;
    const normalizedCustom = customTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const tags = Array.from(new Set([...normalizedPredef, ...normalizedCustom]));

    const selectedGenders = (genders || []).filter((g) => g === 'men' || g === 'women');
    const menList = sizesMen
      .map((s) => ({ size: String(s.size).trim(), quantity: Number(s.quantity) || 0 }))
      .filter((s) => s.size);
    const womenList = sizesWomen
      .map((s) => ({ size: String(s.size).trim(), quantity: Number(s.quantity) || 0 }))
      .filter((s) => s.size);
    const genericSizes = sizesList
      .map((s) => ({ size: String(s.size).trim(), quantity: Number(s.quantity) || 0 }))
      .filter((s) => s.size);

    const totalQty = selectedGenders.length > 0
      ? selectedGenders.reduce((sum, g) => sum + (g === 'men' ? menList : womenList).reduce((acc, s) => acc + (s.quantity || 0), 0), 0)
      : genericSizes.reduce((sum, s) => sum + (s.quantity || 0), 0);

    const docData = {
      name,
      description,
      price: parseFloat(price),
      categoryId: categoryId || null,
      categoryName: categories.find((c) => c.id === categoryId)?.name || null,
      tags,
      quantity: Number.isFinite(totalQty) && totalQty > 0 ? totalQty : parseInt(quantity) || 0,
      isVisible,
      imageUrl: nextImageUrl || null,
      imagePath: nextImagePath || null,
    };

    if (selectedGenders.length > 0) {
      docData.genders = selectedGenders;
      docData.sizes = Object.fromEntries(
        selectedGenders.map((g) => [g, (g === 'men' ? menList : womenList).map((x) => x.size)])
      );
      docData.sizeQuantities = Object.fromEntries(
        selectedGenders.map((g) => [g, (g === 'men' ? menList : womenList)])
      );
    } else {
      docData.sizes = genericSizes;
      docData.sizeQuantities = deleteField();
      docData.genders = deleteField();
    }

    await updateProduct(id, docData);
    navigate('/products');
  };

  if (loading) return (<div className="toolbar"><h1>Loading…</h1></div>);

  return (
    <div>
      <div className="toolbar">
        <h1>Edit Product</h1>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="label">Name</label>
          <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="label">Description</label>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="label">Price</label>
          <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="label">Category</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <span>or</span>
            <input className="input"
              type="text"
              placeholder="New category (not created here)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              disabled
              title="Create categories from the Categories page"
            />
          </div>
        </div>

        {/* Genders */}
        <div className="form-row">
          <label className="label">Genders</label>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {['men','women'].map((g) => (
              <label key={g} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={genders.includes(g)}
                  onChange={(e) => setGenders((prev) => e.target.checked ? [...prev, g] : prev.filter((x) => x !== g))}
                />
                <span style={{ textTransform: 'capitalize' }}>{g}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label className="label">Tags</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
            {availableTags.map((t) => (
              <label key={t} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedTags.includes(t)}
                  onChange={(e) =>
                    setSelectedTags((prev) =>
                      e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)
                    )
                  }
                />
                <span style={{ textTransform: 'capitalize' }}>{t.replace('-', ' ')}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <input className="input"
              type="text"
              placeholder="Custom tags (comma-separated)"
              value={customTags}
              onChange={(e) => setCustomTags(e.target.value)}
            />
          </div>
        </div>

        {genders.includes('men') && (
          <div className="form-row">
            <label className="label">Sizes & quantities — Men</label>
            {sizesMen.map((row, idx) => (
              <div key={`m-${idx}`} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input className="input"
                  type="text"
                  placeholder="Size (e.g., 6, 7, 8)"
                  value={row.size}
                  onChange={(e) =>
                    setSizesMen((prev) => prev.map((r, i) => (i === idx ? { ...r, size: e.target.value } : r)))
                  }
                />
                <input className="input"
                  type="number"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) =>
                    setSizesMen((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)))
                  }
                />
                <button type="button" onClick={() => setSizesMen((prev) => prev.filter((_, i) => i !== idx))}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" style={{ marginTop: 6 }} onClick={() => setSizesMen((prev) => [...prev, { size: '', quantity: 0 }])}>
              + Add size (Men)
            </button>
          </div>
        )}

        {genders.includes('women') && (
          <div className="form-row">
            <label className="label">Sizes & quantities — Women</label>
            {sizesWomen.map((row, idx) => (
              <div key={`w-${idx}`} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input className="input"
                  type="text"
                  placeholder="Size (e.g., 4, 5, 6)"
                  value={row.size}
                  onChange={(e) =>
                    setSizesWomen((prev) => prev.map((r, i) => (i === idx ? { ...r, size: e.target.value } : r)))
                  }
                />
                <input className="input"
                  type="number"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) =>
                    setSizesWomen((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)))
                  }
                />
                <button type="button" onClick={() => setSizesWomen((prev) => prev.filter((_, i) => i !== idx))}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" style={{ marginTop: 6 }} onClick={() => setSizesWomen((prev) => [...prev, { size: '', quantity: 0 }])}>
              + Add size (Women)
            </button>
          </div>
        )}

        {!genders.includes('men') && !genders.includes('women') && (
          <div className="form-row">
            <label className="label">Sizes & quantities</label>
            {sizesList.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input className="input"
                  type="text"
                  placeholder="Size (e.g., S, M, 42)"
                  value={row.size}
                  onChange={(e) =>
                    setSizesList((prev) => prev.map((r, i) => (i === idx ? { ...r, size: e.target.value } : r)))
                  }
                />
                <input className="input"
                  type="number"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) =>
                    setSizesList((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)))
                  }
                />
                <button type="button" onClick={() => setSizesList((prev) => prev.filter((_, i) => i !== idx))}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" style={{ marginTop: 6 }} onClick={() => setSizesList((prev) => [...prev, { size: '', quantity: 0 }])}>
              + Add size
            </button>
          </div>
        )}

        <div className="form-row">
          <label className="label">Fallback total quantity (optional)</label>
          <input className="input" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>

        <div className="form-row">
          <label className="label">
            <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} /> Visible
          </label>
        </div>

        {imageUrl && (
          <div className="form-row">
            <label className="label">Current Image</label>
            <img alt="current" src={imageUrl} style={{ maxWidth: 220, border: '1px solid #eee', borderRadius: 8 }} />
          </div>
        )}

        <div className="form-row">
          <label className="label">Replace Image</label>
          <input className="input" type="file" onChange={(e) => setImage(e.target.files[0])} />
        </div>

        <button className="primary" type="submit">Update Product</button>
      </form>
    </div>
  );
};

export default EditProduct;
