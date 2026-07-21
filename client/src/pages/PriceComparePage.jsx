import { useState, useEffect } from 'react';

const API = '/api';

export default function PriceComparePage() {
  const [products, setProducts] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [prices, setPrices] = useState([]);
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [form, setForm] = useState({ supermarket_id: '', price: '' });
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    fetch(`${API}/products`).then(r => r.json()).then(setProducts).catch(() => setFetchError('Failed to load products'));
    fetch(`${API}/supermarkets`).then(r => r.json()).then(setSupermarkets).catch(() => setFetchError('Failed to load supermarkets'));
  }, []);

  const loadPrices = async (productId) => {
    setSelectedProduct(productId);
    if (!productId) { setPrices([]); return; }
    try {
      const res = await fetch(`${API}/prices/compare/${productId}`);
      if (!res.ok) throw new Error();
      setPrices(await res.json());
    } catch { setFetchError('Failed to load prices'); }
  };

  const handleAddPrice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          supermarket_id: Number(form.supermarket_id),
          price: Number(form.price),
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ supermarket_id: '', price: '' });
      setShowAddPrice(false);
      loadPrices(selectedProduct);
    } catch { setFetchError('Failed to add price'); }
  };

  const handleDeletePrice = async (id) => {
    try {
      const res = await fetch(`${API}/prices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      loadPrices(selectedProduct);
    } catch { setFetchError('Failed to delete price'); }
  };

  const [fetching, setFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState(null);

  const selectedProductData = products.find(p => p.id === Number(selectedProduct));

  const handleFetchPrices = async () => {
    if (!selectedProductData?.barcode) return;
    setFetching(true);
    setFetchStatus(null);
    try {
      const lookupRes = await fetch(`${API}/lookup/${selectedProductData.barcode}`);
      const lookupData = await lookupRes.json();
      if (!lookupData.prices || lookupData.prices.length === 0) {
        setFetchStatus('No prices found for this barcode.');
        setFetching(false);
        return;
      }
      const importRes = await fetch(`${API}/lookup/import-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: Number(selectedProduct), prices: lookupData.prices }),
      });
      const importData = await importRes.json();
      setFetchStatus(`Imported ${importData.imported} price(s) from ${new Set(lookupData.prices.map(p => p.supermarket_name)).size} supermarket(s).`);
      loadPrices(selectedProduct);
    } catch {
      setFetchStatus('Failed to fetch prices.');
    }
    setFetching(false);
  };

  return (
    <main className="px-4 py-6 max-w-3xl mx-auto w-full space-y-6">
      {/* Product Selector */}
      <section className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1 w-full">
            <label className="block text-label-lg font-label-lg text-on-surface-variant mb-2">Select Product</label>
            <div className="relative w-full">
              <select
                className="w-full bg-surface-container-low border border-outline-variant text-on-surface text-body-lg font-body rounded-lg pl-4 pr-10 min-h-[44px] focus:ring-primary focus:border-primary appearance-none"
                value={selectedProduct}
                onChange={(e) => loadPrices(e.target.value)}
              >
                <option value="">Select a product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.barcode ? `(${p.barcode})` : ''}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-on-surface-variant">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>
          {selectedProductData && (
            <div className="flex flex-col items-start md:items-end min-w-[120px]">
              <span className="text-label-sm font-label-sm text-outline">Barcode</span>
              <span className="text-body-md font-body font-mono text-on-surface">{selectedProductData.barcode || '—'}</span>
            </div>
          )}
        </div>
        {selectedProduct && (
          <div className="flex flex-col gap-3 pt-2">
            {selectedProductData?.barcode && (
              <button
                className="btn-base w-full bg-secondary text-on-secondary hover:bg-secondary/90 transition-colors shadow-sm"
                onClick={handleFetchPrices}
                disabled={fetching}
              >
                <span className={`material-symbols-outlined text-[20px] ${fetching ? 'animate-spin' : ''}`}>
                  {fetching ? 'progress_activity' : 'cloud_download'}
                </span>
                {fetching ? 'Fetching...' : 'Fetch Prices from Supermarkets'}
              </button>
            )}
            <div className="flex justify-end">
              <button
                className="btn-base bg-primary text-on-primary hover:bg-on-primary-fixed-variant transition-colors shadow-sm"
                onClick={() => setShowAddPrice(true)}
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add Price
              </button>
            </div>
            {fetchStatus && (
              <p className={`text-body-md font-body text-center ${fetchStatus.includes('Failed') || fetchStatus.includes('No prices') ? 'text-error' : 'text-secondary'}`}>
                {fetchStatus}
              </p>
            )}
          </div>
        )}
      </section>

      {fetchError && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-md font-body text-center">
          {fetchError}
        </div>
      )}

      {/* Price Comparison */}
      {selectedProduct && (
        <section className="space-y-4">
          <h2 className="text-headline-md font-headline text-on-background px-2">Price Comparisons</h2>
          <div className="grid grid-cols-1 gap-4">
            {prices.map((p, i) => {
              const isBest = i === 0;
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-lg shadow-[0px_2px_8px_rgba(15,23,42,0.05)] flex flex-row items-center justify-between gap-4 transition-transform hover:-translate-y-1 duration-200 ${
                    isBest
                      ? 'bg-secondary-container/20 border-l-4 border-secondary'
                      : 'bg-surface-container-lowest border border-transparent hover:border-outline-variant/30'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-surface-container-highest w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                      <span className="material-symbols-outlined text-on-surface-variant">storefront</span>
                    </div>
                    <div>
                      <h3 className="text-label-lg font-label-lg text-on-surface">{p.supermarket_name}</h3>
                      {isBest ? (
                        <span className="text-body-md font-body text-secondary">Best Price!</span>
                      ) : prices[0] && (
                        <span className="text-body-md font-body text-on-surface-variant">
                          +€{(p.price - prices[0].price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-price-lg font-body font-bold ${isBest ? 'text-on-secondary-container' : 'text-on-surface'}`}>
                      €{p.price.toFixed(2)}
                    </span>
                    <span className="text-label-sm font-label-sm text-outline">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="text-on-surface-variant hover:text-error transition-colors p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                    onClick={() => handleDeletePrice(p.id)}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!selectedProduct && (
        <div className="empty-state">
          <p>Select a product to compare prices.</p>
        </div>
      )}

      {selectedProduct && prices.length === 0 && (
        <div className="empty-state">
          <p>No prices recorded for this product.</p>
        </div>
      )}

      {/* Add Price Modal */}
      {showAddPrice && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddPrice(false); }}>
          <div className="modal">
            <h2>Add Price</h2>
            <p className="text-body-md text-on-surface-variant mb-4">
              {selectedProductData?.name}
            </p>
            <form onSubmit={handleAddPrice}>
              <div className="form-group">
                <label>Supermarket</label>
                <select
                  required
                  value={form.supermarket_id}
                  onChange={(e) => setForm({ ...form, supermarket_id: e.target.value })}
                >
                  <option value="">Select supermarket...</option>
                  {supermarkets.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Price (€)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-base btn-outline" onClick={() => setShowAddPrice(false)}>Cancel</button>
                <button type="submit" className="btn-base btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
