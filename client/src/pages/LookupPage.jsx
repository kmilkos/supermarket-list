import { useState, useRef } from 'react';
import BarcodeScanner from '../components/BarcodeScanner';

const API = '/api';

export default function LookupPage() {
  const [barcode, setBarcode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [saved, setSaved] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const debugRef = useRef(debugLogs);
  debugRef.current = debugLogs;

  const addDebug = (msg) => {
    const entry = { t: new Date().toISOString(), msg };
    setDebugLogs(prev => [...prev, entry]);
  };

  const clearDebug = () => setDebugLogs([]);

  const handleBarcodeLookup = async () => {
    if (!barcode.trim()) return;
    setLoading(true);
    setResult(null);
    setSearchResults([]);
    setImportStatus(null);
    clearDebug();
    addDebug(`🔍 Barcode lookup: ${barcode.trim()}`);
    try {
      const res = await fetch(`${API}/lookup/${barcode.trim()}`);
      const data = await res.json();
      if (data._debug) setDebugLogs(prev => [...prev, ...data._debug]);
      setResult(data);
      if (!data.product?.name) addDebug('❌ No product found for this barcode');
      else if (data.prices?.length > 0) addDebug(`💰 Found ${data.prices.length} prices across supermarkets`);
      else addDebug('⚠️ Product found but no prices available');
    } catch (err) {
      setResult({ error: 'Lookup failed' });
      addDebug(`❌ Lookup failed: ${err?.message || 'network error'}`);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setResult(null);
    setSearchResults([]);
    setImportStatus(null);
    clearDebug();
    addDebug(`🔍 Text search: "${searchQuery.trim()}"`);
    try {
      const res = await fetch(`${API}/lookup/search/${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      const results = data.results || data;
      const logs = data._debug || [];
      setDebugLogs(prev => [...prev, ...logs]);
      if (!Array.isArray(results)) {
        addDebug(`❌ Search error: ${results.error || 'unexpected response'}`);
        setSearchResults([]);
      } else {
        setSearchResults(results);
        addDebug(`📦 Search returned ${results.length} products`);
      }
    } catch (err) {
      setSearchResults([]);
      addDebug(`❌ Search failed: ${err?.message || 'network error'}`);
    }
    setLoading(false);
  };

  const handleSelectSearchResult = (item) => {
    setResult({
      barcode: barcode || null,
      product: {
        name: item.name,
        brand: item.brand,
        image_url: item.image_url,
        category: item.category,
        unit: item.unit,
        unit_quantity: item.unit_quantity,
      },
      sources: { posokanei: item },
      prices: item.retailer_prices || [],
      price_stats: item.price_stats,
    });
    setSearchResults([]);
  };

  const handleImportPrices = async (product_id) => {
    if (!result?.prices?.length) return;
    setImportStatus(null);
    addDebug(`💾 Importing ${result.prices.length} prices for product #${product_id}`);
    try {
      const res = await fetch(`${API}/lookup/import-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id, prices: result.prices }),
      });
      const data = await res.json();
      setImportStatus(`Imported ${data.imported} price(s)`);
      addDebug(`✅ Imported ${data.imported} prices to database`);
    } catch (err) {
      setImportStatus('Import failed');
      addDebug(`❌ Import failed: ${err?.message || 'network error'}`);
    }
  };

  const handleSaveAsProduct = async () => {
    if (!result?.product?.name) return;
    setImportStatus(null);
    addDebug(`💾 Saving product: "${result.product.name}"`);
    try {
      const res = await fetch(`${API}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.product.name,
          barcode: barcode.trim() || undefined,
          category: result.product.category || undefined,
          image_url: result.product.image_url || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportStatus(data.error || 'Failed to save product');
        addDebug(`❌ Save failed: ${data.error}`);
        return;
      }
      addDebug(`✅ Saved as product #${data.id}`);
      if (data.id && result.prices.length > 0) {
        await handleImportPrices(data.id);
      } else {
        setImportStatus('Product saved successfully!');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setImportStatus('Failed to save product');
      addDebug(`❌ Save failed: ${err?.message || 'network error'}`);
    }
  };

  const prices = result?.prices || [];
  const stats = result?.price_stats;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      {/* Input Section */}
      <section className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] p-6 space-y-6">
        {/* Scanner */}
        {showScanner && <BarcodeScanner onScan={(code) => { setBarcode(code); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}

        {/* Barcode */}
        <div>
          <label className="block text-label-lg font-label-lg text-on-surface mb-2">Scan / Enter Barcode</label>
          <div className="flex gap-2">
            <button
              className="btn-base bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-variant transition-colors shadow-sm"
              onClick={() => setShowScanner(!showScanner)}
              title="Scan barcode"
            >
              <span className="material-symbols-outlined text-[20px]">barcode_scanner</span>
            </button>
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">barcode_scanner</span>
              <input
                className="w-full min-h-[44px] pl-10 pr-4 rounded-lg border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body transition-shadow"
                placeholder="e.g. 520987654321"
                type="text"
                inputMode="numeric"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeLookup()}
              />
            </div>
            <button
              className="btn-base bg-primary-container text-on-primary hover:bg-primary-fixed-variant transition-colors shadow-sm"
              onClick={handleBarcodeLookup}
              disabled={loading}
            >
              <span>{loading ? '...' : 'Lookup'}</span>
            </button>
          </div>
        </div>

        {/* OR Divider */}
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-surface-variant"></div>
          <span className="flex-shrink-0 mx-4 text-outline text-label-sm font-label-sm">OR</span>
          <div className="flex-grow border-t border-surface-variant"></div>
        </div>

        {/* Name Search */}
        <div>
          <label className="block text-label-lg font-label-lg text-on-surface mb-2">Search by Name</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                className="w-full min-h-[44px] pl-10 pr-4 rounded-lg border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body transition-shadow"
                placeholder="e.g. Ελαιόλαδο..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              className="btn-base bg-surface-container text-primary rounded-lg border border-primary hover:bg-surface-variant transition-colors"
              onClick={handleSearch}
              disabled={loading}
            >
              <span>Search</span>
            </button>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-headline-md font-headline text-on-surface">Results ({searchResults.length})</h3>
          <div className="space-y-3">
            {searchResults.map((item, i) => (
              <div
                className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] p-4 flex items-center gap-4 border border-surface-variant cursor-pointer hover:bg-surface-container-low transition-colors"
                key={item.posokanei_id || item.name + i}
                onClick={() => handleSelectSearchResult(item)}
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-surface-container flex items-center justify-center">
                  {item.image_url ? (
                    <img loading="lazy" className="w-full h-full object-cover" src={item.image_url} alt="" />
                  ) : (
                    <span className="material-symbols-outlined text-xl text-outline-variant">inventory_2</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-label-lg font-label-lg text-on-surface">{item.name}</h3>
                  {item.brand && <span className="text-body-md font-body text-on-surface-variant">{item.brand}</span>}
                  {item.price_stats && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="price-tag-best">Best: €{item.price_stats.min_price?.toFixed(2)}</span>
                      <span className="text-label-sm font-label-sm text-on-surface-variant">{item.price_stats.retailer_count} store(s)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Result */}
      {result && !result.error && result.product?.name && (
        <section className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] overflow-hidden">
          {/* Product Header */}
          <div className="p-6 flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-48 aspect-square rounded-lg overflow-hidden bg-surface-container flex-shrink-0 flex items-center justify-center">
              {result.product.image_url ? (
                <img loading="lazy" className="w-full h-full object-cover" src={result.product.image_url} alt="" />
              ) : (
                <span className="material-symbols-outlined text-[64px] text-outline-variant">inventory_2</span>
              )}
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div>
                <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">
                  {result.product.category || 'Product'}{result.product.brand ? ` • ${result.product.brand}` : ''}
                </span>
                <h2 className="text-headline-lg font-headline text-on-surface mt-1">{result.product.name}</h2>
                {barcode && (
                  <p className="text-body-md text-outline font-mono mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">barcode</span> {barcode}
                  </p>
                )}
              </div>

              {/* Stats Bar */}
              {stats && (
                <div className="grid grid-cols-4 gap-2 bg-surface-container-low rounded-lg p-3">
                  <div className="text-center">
                    <span className="block text-label-sm font-label-sm text-outline">Best</span>
                    <span className="block text-price-lg font-body text-secondary">€{stats.min_price?.toFixed(2)}</span>
                  </div>
                  <div className="text-center border-l border-surface-variant">
                    <span className="block text-label-sm font-label-sm text-outline">Avg</span>
                    <span className="block text-price-lg font-body text-on-surface">€{stats.avg_price?.toFixed(2)}</span>
                  </div>
                  <div className="text-center border-l border-surface-variant">
                    <span className="block text-label-sm font-label-sm text-outline">High</span>
                    <span className="block text-price-lg font-body text-on-surface-variant">€{stats.max_price?.toFixed(2)}</span>
                  </div>
                  <div className="text-center border-l border-surface-variant">
                    <span className="block text-label-sm font-label-sm text-outline">Stores</span>
                    <span className="block text-price-lg font-body text-on-surface">{stats.retailer_count}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price Table */}
          {prices.length > 0 && (
            <div className="border-t border-surface-variant">
              <div className="p-4 bg-surface-container-low grid grid-cols-12 gap-4 text-label-sm font-label-sm text-outline uppercase tracking-wider">
                <div className="col-span-5 md:col-span-6">Supermarket</div>
                <div className="col-span-3 md:col-span-2 text-right">Price</div>
                <div className="col-span-4 hidden md:block text-right">Last Updated</div>
              </div>
              {prices.map((p, i) => (
                <div
                  key={i}
                  className={`p-4 grid grid-cols-12 gap-4 items-center transition-colors cursor-pointer ${
                    i === 0
                      ? 'bg-secondary-container/20 border-l-4 border-secondary hover:bg-secondary-container/30'
                      : 'border-t border-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <div className="col-span-5 md:col-span-6 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                      i === 0 ? 'bg-surface' : 'bg-surface border border-surface-variant'
                    }`}>
                      <span className={`material-symbols-outlined text-sm ${i === 0 ? 'text-secondary' : 'text-on-surface-variant'}`}>storefront</span>
                    </div>
                    <div className="text-label-lg font-label-lg text-on-surface flex items-center gap-2">
                      {p.supermarket_name}
                      {i === 0 && <span className="price-tag-best">Best</span>}
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-right">
                    <span className={`text-price-lg font-body ${i === 0 ? 'text-secondary' : 'text-on-surface'}`}>
                      €{p.price?.toFixed(2)}
                    </span>
                    {p.is_discount && (
                      <span className="price-tag-discount ml-1">-{p.discount_percentage}%</span>
                    )}
                  </div>
                  <div className="col-span-4 hidden md:flex justify-end items-center text-body-md text-outline gap-1">
                    {p.last_updated && (
                      <>
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {new Date(p.last_updated).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Button */}
          <div className="p-4 bg-surface-container border-t border-surface-variant">
            <button
              className={`btn-base w-full flex items-center justify-center gap-2 transition-all shadow-sm ${
                saved
                  ? 'bg-secondary/80 text-on-secondary scale-95'
                  : 'bg-primary-container text-on-primary hover:bg-primary-fixed-variant'
              }`}
              onClick={handleSaveAsProduct}
            >
              <span className="material-symbols-outlined">{saved ? 'check' : 'playlist_add'}</span>
              {saved ? 'Αποθηκεύτηκε!' : 'Save Product & Import Prices'}
            </button>
          </div>
        </section>
      )}

      {/* Empty/Error States */}
      {result && !result.error && !result.product?.name && (
        <div className="empty-state">
          <p>No product found for this barcode.</p>
        </div>
      )}

      {result?.error && (
        <div className="empty-state">
          <p className="text-error">{result.error}</p>
        </div>
      )}

      {importStatus && (
        <div className={`p-3 rounded-lg text-sm font-medium ${importStatus.includes('Failed') ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
          {importStatus}
        </div>
      )}

      // Debug Log
      {debugLogs.length > 0 && (
        <div className="border border-surface-variant rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-2 bg-surface-container-low text-label-sm font-label-sm text-on-surface-variant hover:bg-surface-container transition-colors"
            onClick={() => setShowDebug(!showDebug)}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">bug_report</span>
              Debug Log ({debugLogs.length})
            </span>
            <span className="flex items-center gap-1">
              <span
                className="material-symbols-outlined text-[16px] hover:text-on-surface cursor-pointer"
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(debugLogs.map(e => `${new Date(e.t).toLocaleTimeString()} ${e.msg}`).join('\n')); }}
              >
                content_copy
              </span>
              <span className="material-symbols-outlined text-[16px]">{showDebug ? 'expand_less' : 'expand_more'}</span>
            </span>
          </button>
          {showDebug && (
            <div className="max-h-48 overflow-y-auto p-3 bg-surface space-y-1 text-[11px] font-mono select-text">
              {debugLogs.map((entry, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-outline shrink-0">{new Date(entry.t).toLocaleTimeString()}</span>
                  <span className={entry.msg.toLowerCase().includes('error') || entry.msg.toLowerCase().includes('fail') || entry.msg.toLowerCase().includes('not found') || entry.msg.toLowerCase().includes('no ') ? 'text-error' : 'text-on-surface-variant'}>
                    {entry.msg}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
