import { useState, useEffect } from 'react';

const API = '/api';

const SUPERMARKET_ICONS = ['🛒', '🏬', '🏪', '🛒', '🏬', '🏪', '🛒', '🏬'];

export default function SupermarketsPage() {
  const [supermarkets, setSupermarkets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '' });
  const [fetchError, setFetchError] = useState(null);

  const fetchSupermarkets = async () => {
    try {
      const res = await fetch(`${API}/supermarkets`);
      if (!res.ok) throw new Error();
      setSupermarkets(await res.json());
    } catch { setFetchError('Failed to load supermarkets'); }
  };

  useEffect(() => { fetchSupermarkets(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/supermarkets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setForm({ name: '', address: '' });
      setShowForm(false);
      fetchSupermarkets();
    } catch { setFetchError('Failed to add supermarket'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supermarket?')) return;
    try {
      const res = await fetch(`${API}/supermarkets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      fetchSupermarkets();
    } catch { setFetchError('Failed to delete supermarket'); }
  };

  return (
    <main className="px-4 py-6">
      <h2 className="text-headline-lg font-headline mb-6 text-on-background">Καταστήματα</h2>

      {fetchError && (
        <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-body-md font-body text-center">
          {fetchError}
        </div>
      )}

      {/* Supermarket Grid */}
      <div className="grid grid-cols-2 gap-3">
        {supermarkets.map((s, i) => (
          <div className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] p-4 flex flex-col items-center relative overflow-hidden group" key={s.id}>
            <button
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-outline-variant hover:text-error transition-colors rounded-full hover:bg-error-container/50"
              onClick={() => handleDelete(s.id)}
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center text-[32px] mb-3 mt-2">
              {SUPERMARKET_ICONS[i % SUPERMARKET_ICONS.length]}
            </div>
            <h3 className="text-label-lg font-label-lg text-center mb-1 text-on-surface">{s.name}</h3>
            <p className="text-label-sm font-label-sm text-on-surface-variant text-center">
              {s.address || '—'}
            </p>
          </div>
        ))}

        {/* Add New */}
        <button
          className="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] cursor-pointer hover:bg-surface-container transition-colors"
          onClick={() => setShowForm(true)}
        >
          <div className="w-12 h-12 bg-primary-container/10 text-primary rounded-full flex items-center justify-center mb-3">
            <span className="material-symbols-outlined">add</span>
          </div>
          <h3 className="text-label-lg font-label-lg text-primary text-center">Add Store</h3>
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal">
            <h2>Add Supermarket</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Lidl"
                />
              </div>
              <div className="form-group">
                <label>Address (optional)</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, City"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-base btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-base btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
