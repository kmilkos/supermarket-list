import { useState, useEffect, useCallback, useRef } from 'react';
import BarcodeScanner from '../components/BarcodeScanner';

const API = '/api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: '', barcode: '', category: '' });
  const [imageFile, setImageFile] = useState(null);

  const [addedId, setAddedId] = useState(null);
  const addedTimerRef = useRef(null);
  const [fetchError, setFetchError] = useState(null);
  const [activeLists, setActiveLists] = useState([]);

  const fetchProducts = useCallback(async () => {
    try {
      setFetchError(null);
      const url = search ? `${API}/products?search=${encodeURIComponent(search)}` : `${API}/products`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProducts(await res.json());
    } catch (err) {
      setFetchError('Failed to load products');
    }
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    fetch(`${API}/lists`).then(r => r.ok && r.json()).then(all => setActiveLists(all.filter(l => !l.completed))).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('barcode', form.barcode);
      formData.append('category', form.category);
      if (imageFile) formData.append('image', imageFile);
      const method = editProduct ? 'PUT' : 'POST';
      const url = editProduct ? `${API}/products/${editProduct.id}` : `${API}/products`;
      const res = await fetch(url, { method, body: formData });
      if (!res.ok) throw new Error('Failed to save');
      setForm({ name: '', barcode: '', category: '' });
      setImageFile(null);
      setShowForm(false);
      setEditProduct(null);
      fetchProducts();
    } catch { setFetchError('Failed to save product'); }
  };

  const handleBarcodeScan = async (barcode) => {
    setShowScanner(false);
    try {
      const res = await fetch(`${API}/products?barcode=${barcode}`);
      if (!res.ok) throw new Error('Failed');
      const found = await res.json();
      if (found.length > 0) {
        setEditProduct(found[0]);
        setForm({ name: found[0].name, barcode: found[0].barcode || '', category: found[0].category || '' });
      } else {
        setForm({ name: '', barcode, category: '' });
        setEditProduct(null);
      }
      setShowForm(true);
    } catch { setFetchError('Barcode lookup failed'); }
  };

  const handleAddToBuy = async (productId) => {
    const listId = activeLists[0]?.id;
    if (!listId) {
      try {
        const res = await fetch(`${API}/lists`);
        if (!res.ok) throw new Error();
        const allLists = await res.json();
        const active = allLists.filter(l => !l.completed);
        if (active.length === 0) {
          const createRes = await fetch(`${API}/lists`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My Shopping List' }),
          });
          if (!createRes.ok) throw new Error();
          const newList = await createRes.json();
          setActiveLists([newList, ...activeLists]);
        } else {
          setActiveLists(active);
        }
      } catch { setFetchError('Failed to find or create a list'); return; }
      return handleAddToBuy(productId);
    }
    try {
      const res = await fetch(`${API}/tobuy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity: 1, list_id: listId }),
      });
      if (!res.ok) throw new Error('Failed');
      setAddedId(productId);
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
      addedTimerRef.current = setTimeout(() => setAddedId(null), 1500);
    } catch { setFetchError('Failed to add to list'); }
  };

  useEffect(() => () => { if (addedTimerRef.current) clearTimeout(addedTimerRef.current); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      const res = await fetch(`${API}/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      fetchProducts();
    } catch { setFetchError('Failed to delete product'); }
  };

  const startEdit = (product) => {
    setEditProduct(product);
    setForm({ name: product.name, barcode: product.barcode || '', category: product.category || '' });
    setImageFile(null);
    setShowForm(true);
  };

  const openAddForm = () => {
    setEditProduct(null);
    setForm({ name: '', barcode: '', category: '' });
    setImageFile(null);
    setShowForm(true);
  };

  return (
    <div className="px-4 py-6 md:max-w-4xl md:mx-auto md:w-full">
      {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}

      {/* Search + Scan */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container min-h-[44px]"
            placeholder="Search products..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="btn-base bg-primary-container text-on-primary hover:bg-primary-fixed-variant transition-colors shadow-sm"
          onClick={() => setShowScanner(!showScanner)}
          title={showScanner ? 'Close scanner' : 'Scan barcode'}
        >
          <span className="material-symbols-outlined text-[20px]">barcode_scanner</span>
        </button>
      </div>

      {fetchError && (
        <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-body-md font-body text-center">
          {fetchError}
        </div>
      )}

      {/* 2-Column Grid */}
      {products.length === 0 ? (
        <div className="empty-state">
          <p>No products yet.</p>
          <p>Add your first product or scan a barcode.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] overflow-hidden flex flex-col border border-surface-variant" key={p.id}>
              {/* Image Area */}
              <div className="aspect-square w-full relative bg-surface-container-low p-2 flex items-center justify-center">
                {p.image_url ? (
                  <img loading="lazy" className="w-full h-full object-contain rounded-lg mix-blend-multiply" src={p.image_url} alt={p.name} />
                ) : (
                  <span className="material-symbols-outlined text-[64px] text-outline-variant">image</span>
                )}
                {p.category && (
                  <span className="absolute top-2 right-2 bg-secondary text-on-secondary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    {p.category}
                  </span>
                )}
              </div>
              {/* Content */}
              <div className="p-3 flex flex-col flex-grow gap-2">
                <div className="flex flex-col gap-1">
                  {p.barcode && (
                    <span className="text-label-sm font-label-sm text-outline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">barcode_scanner</span>
                      {p.barcode}
                    </span>
                  )}
                  <h2 className="text-label-lg font-label-lg text-on-surface line-clamp-2">{p.name}</h2>
                </div>
                <div className="mt-auto pt-2 flex flex-col gap-2">
                  <button
                    className={`w-full min-h-[44px] rounded-lg text-label-lg font-label-lg flex items-center justify-center gap-2 transition-all shadow-sm ${
                      addedId === p.id
                        ? 'bg-secondary/80 text-on-secondary scale-95'
                        : 'bg-secondary text-on-secondary hover:bg-secondary/90'
                    }`}
                    onClick={() => handleAddToBuy(p.id)}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {addedId === p.id ? 'check' : 'add_shopping_cart'}
                    </span>
                    {addedId === p.id ? 'Προστέθηκε!' : 'Προσθήκη'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 h-10 border-1.5 border-primary-container text-primary-container rounded-lg text-label-sm font-label-sm flex items-center justify-center gap-1 hover:bg-primary-container/10 transition-colors"
                      onClick={() => startEdit(p)}
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      Edit
                    </button>
                    <button
                      className="flex-1 h-10 border-1.5 border-error text-error rounded-lg text-label-sm font-label-sm flex items-center justify-center gap-1 hover:bg-error/10 transition-colors"
                      onClick={() => handleDelete(p.id)}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary-container text-on-primary rounded-xl shadow-[0px_8px_24px_rgba(15,23,42,0.12)] flex items-center justify-center hover:bg-primary-container/90 transition-transform active:scale-95 z-40 md:bottom-8"
        onClick={openAddForm}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal">
            <h2>{editProduct ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Γάλα 1L"
                />
              </div>
              <div className="form-group">
                <label>Barcode</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Scan or enter barcode"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Dairy"
                />
              </div>
              <div className="form-group">
                <label>Image</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setImageFile(e.target.files[0])}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-base btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-base btn-primary">{editProduct ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
