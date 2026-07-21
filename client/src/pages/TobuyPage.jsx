import { useState, useEffect, useCallback } from 'react';

const API = '/api';

export default function TobuyPage() {
  const [view, setView] = useState('overview');
  const [lists, setLists] = useState([]);
  const [activeList, setActiveList] = useState(null);
  const [items, setItems] = useState([]);
  const [completedItems, setCompletedItems] = useState([]);
  const [stats, setStats] = useState({ total_items: 0, total_quantity: 0, estimated_total: 0 });
  const [fetchError, setFetchError] = useState(null);
  const [confirmMsg, setConfirmMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [supermarketTab, setSupermarketTab] = useState('all');

  const err = useCallback((msg) => { setFetchError(msg); setTimeout(() => setFetchError(null), 3000); }, []);

  const fetchLists = useCallback(async () => {
    try {
      const res = await fetch(`${API}/lists`);
      if (!res.ok) throw new Error();
      setLists(await res.json());
    } catch { err('Failed to load lists'); }
  }, [err]);

  const fetchItems = useCallback(async (listId) => {
    try {
      const res = await fetch(`${API}/tobuy?list_id=${listId}`);
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch { err('Failed to load items'); }
  }, [err]);

  const fetchStats = useCallback(async (listId) => {
    try {
      const res = await fetch(`${API}/tobuy/stats?list_id=${listId}`);
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch {  }
  }, []);

  const fetchCompletedItems = useCallback(async (listId) => {
    try {
      const res = await fetch(`${API}/lists/${listId}/items`);
      if (!res.ok) throw new Error();
      setCompletedItems(await res.json());
    } catch { err('Failed to load history'); }
  }, [err]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const addList = async () => {
    const name = prompt('Enter list name:');
    if (!name?.trim()) return;
    try {
      const res = await fetch(`${API}/lists`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      fetchLists();
      setConfirmMsg(`"${name.trim()}" created`);
      setTimeout(() => setConfirmMsg(null), 2000);
    } catch { err('Failed to create list'); }
  };

  const renameList = async (list) => {
    const name = prompt('Rename list:', list.name);
    if (!name?.trim() || name.trim() === list.name) return;
    try {
      const res = await fetch(`${API}/lists/${list.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      fetchLists();
      if (activeList?.id === list.id) setActiveList({ ...activeList, name: name.trim() });
    } catch { err('Failed to rename list'); }
  };

  const deleteList = async (list) => {
    if (!confirm(`Delete "${list.name}" and all its items?`)) return;
    try {
      const res = await fetch(`${API}/lists/${list.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      fetchLists();
      if (activeList?.id === list.id) { setView('overview'); setActiveList(null); }
    } catch { err('Failed to delete list'); }
  };

  const openList = (list) => {
    if (list.completed) {
      setActiveList(list);
      fetchCompletedItems(list.id);
      setView('completed_detail');
    } else {
      setActiveList(list);
      fetchItems(list.id);
      fetchStats(list.id);
      setView('list');
    }
  };

  const toggleChecked = async (item) => {
    try {
      const res = await fetch(`${API}/tobuy/${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: !item.checked }),
      });
      if (!res.ok) throw new Error();
      fetchItems(activeList.id);
      fetchStats(activeList.id);
    } catch { err('Failed to update'); }
  };

  const updateQuantity = async (item, delta) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return deleteItem(item.id);
    try {
      const res = await fetch(`${API}/tobuy/${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) throw new Error();
      fetchItems(activeList.id);
      fetchStats(activeList.id);
    } catch { err('Failed to update quantity'); }
  };

  const deleteItem = async (id) => {
    try {
      const res = await fetch(`${API}/tobuy/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      fetchItems(activeList.id);
      fetchStats(activeList.id);
    } catch { err('Failed to delete'); }
  };

  const completePurchase = async () => {
    try {
      const res = await fetch(`${API}/lists/${activeList.id}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.list_completed) {
        setConfirmMsg(`"${activeList.name}" completed!`);
        setTimeout(() => setConfirmMsg(null), 2000);
        setView('overview');
        setActiveList(null);
        fetchLists();
      } else {
        fetchItems(activeList.id);
        fetchStats(activeList.id);
        fetchLists();
        setConfirmMsg(`${data.archived} items archived`);
        setTimeout(() => setConfirmMsg(null), 2000);
      }
    } catch { err('Failed to complete purchase'); }
  };

  const startEdit = (list) => {
    setEditingId(list.id);
    setEditName(list.name);
  };

  const saveEdit = async (list) => {
    if (!editName.trim() || editName.trim() === list.name) { setEditingId(null); return; }
    try {
      const res = await fetch(`${API}/lists/${list.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      fetchLists();
      if (activeList?.id === list.id) setActiveList({ ...activeList, name: editName.trim() });
    } catch { err('Failed to rename'); }
  };

  // ─── Overview ───────────────────────────────────────────────
  if (view === 'overview') {
    const activeLists = lists.filter(l => !l.completed);
    const completedLists = lists.filter(l => l.completed);

    return (
      <main className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-headline-lg font-headline text-on-surface">Shopping Lists</h1>
          <button className="btn-base bg-primary text-on-primary hover:bg-primary/90 shadow-sm" onClick={addList}>
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add List
          </button>
        </div>

        {confirmMsg && (
          <div className="p-3 rounded-lg bg-secondary-container text-on-secondary-container text-body-md font-body text-center">
            <span className="material-symbols-outlined text-[18px] align-middle mr-1">check_circle</span>
            {confirmMsg}
          </div>
        )}

        {fetchError && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-md font-body text-center">
            {fetchError}
          </div>
        )}

        {/* Lists grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeLists.length === 0 && completedLists.length === 0 && (
            <div className="empty-state sm:col-span-2">
              <p>No shopping lists yet.</p>
              <p>Create one to get started!</p>
            </div>
          )}
          {activeLists.map(list => (
            <button
              key={list.id}
              onClick={() => openList(list)}
              className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] p-5 border border-surface-variant text-left hover:bg-surface-container-low transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {editingId === list.id ? (
                    <input
                      className="w-full bg-surface-container rounded-lg px-3 py-1.5 border border-outline-variant text-label-lg font-label-lg text-on-surface outline-none focus:border-primary"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => saveEdit(list)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(list); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <h2 className="text-label-lg font-label-lg text-on-surface truncate">{list.name}</h2>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-label-sm font-label-sm text-on-surface-variant">
                      <span className="font-bold text-on-surface">{list.item_count || 0}</span> items
                    </span>
                    {list.checked_count > 0 && (
                      <span className="text-label-sm font-label-sm text-secondary">
                        {list.checked_count} checked
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  <span className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-surface-variant text-outline transition-colors"
                    onClick={e => { e.stopPropagation(); renameList(list); }}>
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </span>
                  <span className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-error-container text-error transition-colors"
                    onClick={e => { e.stopPropagation(); deleteList(list); }}>
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </span>
                </div>
              </div>
              <div className="mt-3 text-label-sm font-label-sm text-outline">
                Created {new Date(list.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>

        {/* Completed lists */}
        {completedLists.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-headline-md font-headline text-on-surface-variant">Completed</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {completedLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => openList(list)}
                  className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] p-5 border border-surface-variant text-left hover:bg-surface-container-low transition-colors opacity-75"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-label-lg font-label-lg text-on-surface truncate line-through decoration-outline">{list.name}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                        <span className="text-label-sm font-label-sm text-on-surface-variant">
                          {list.item_count || 0} items
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-label-sm font-label-sm text-outline">
                    Completed {list.completed_at ? new Date(list.completed_at).toLocaleDateString() : ''}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  // ─── Completed List Detail (read-only) ──────────────────────
  if (view === 'completed_detail') {
    const checkedCount = completedItems.filter(i => i.checked).length;
    return (
      <main className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface transition-colors" onClick={() => { setView('overview'); setActiveList(null); }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-headline-md font-headline text-on-surface truncate">{activeList?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
              <span className="text-label-sm font-label-sm text-secondary">Completed</span>
              {activeList?.completed_at && (
                <span className="text-label-sm font-label-sm text-outline">{new Date(activeList.completed_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        {completedItems.length === 0 ? (
          <div className="empty-state">
            <p>No items in this list.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {completedItems.map(item => (
              <article
                className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] p-4 flex items-center gap-4 border border-surface-variant"
                key={item.id}
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-surface-container flex items-center justify-center">
                  {item.image_url ? (
                    <img loading="lazy" className="w-full h-full object-cover grayscale" src={item.image_url} alt="" />
                  ) : (
                    <span className="material-symbols-outlined text-2xl text-outline-variant">inventory_2</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-label-lg font-label-lg text-on-surface truncate">{item.product_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {item.best_price && (
                      <span className="text-body-md font-body font-bold text-secondary">€{item.best_price.toFixed(2)}</span>
                    )}
                    {item.best_supermarket && (
                      <span className="text-label-sm font-label-sm text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded-full">{item.best_supermarket}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-label-lg font-label-lg text-on-surface">x{item.quantity}</span>
                  <span className="text-label-sm font-label-sm text-outline">{new Date(item.purchased_at).toLocaleDateString()}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ─── Active List Detail ─────────────────────────────────────
  const checkedCount = items.filter(i => i.checked).length;
  const supermarketNames = [...new Set(items.map(i => i.best_supermarket).filter(Boolean))].sort();
  const filteredItems = supermarketTab === 'all'
    ? items
    : supermarketTab === 'none'
      ? items.filter(i => !i.best_supermarket)
      : items.filter(i => i.best_supermarket === supermarketTab);

  return (
    <main className="px-4 py-6 max-w-3xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-4">
        <button className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface transition-colors" onClick={() => { setView('overview'); setActiveList(null); setSupermarketTab('all'); }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-headline-md font-headline text-on-surface truncate">{activeList?.name}</h1>
          {items.length > 0 && (
            <div className="text-label-sm font-label-sm text-on-surface-variant mt-1">
              {stats.total_items} items &middot; {stats.total_quantity} qty
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={async () => {
              const title = prompt('Rename list:', activeList?.name);
              if (!title?.trim() || title.trim() === activeList?.name) return;
              try {
                const res = await fetch(`${API}/lists/${activeList.id}`, {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: title.trim() }),
                });
                if (!res.ok) throw new Error();
                setActiveList({ ...activeList, name: title.trim() });
                fetchLists();
              } catch { err('Failed to rename list'); }
            }}>
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
            onClick={() => deleteList(activeList)}>
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      {confirmMsg && (
        <div className="p-3 rounded-lg bg-secondary-container text-on-secondary-container text-body-md font-body text-center">
          <span className="material-symbols-outlined text-[18px] align-middle mr-1">check_circle</span>
          {confirmMsg}
        </div>
      )}

      {fetchError && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-md font-body text-center">
          {fetchError}
        </div>
      )}

      {/* Summary Bar */}
      {items.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] p-4 flex justify-between items-center border border-surface-variant">
          <div className="flex gap-4 text-body-md font-body text-on-surface-variant">
            <div>Items: <span className="font-label-lg font-bold text-on-surface">{stats.total_items}</span></div>
            <div>Qty: <span className="font-label-lg font-bold text-on-surface">{stats.total_quantity}</span></div>
          </div>
          <div className="text-right">
            <div className="text-label-sm font-label-sm text-on-surface-variant uppercase">Est. Total</div>
            <div className="text-price-lg font-body text-primary">€{stats.estimated_total.toFixed(2)}</div>
          </div>
        </section>
      )}

      {/* Complete Purchase Button */}
      {checkedCount > 0 && (
        <button className="btn-base w-full bg-secondary text-on-secondary hover:bg-secondary/90 transition-colors shadow-sm" onClick={completePurchase}>
          <span className="material-symbols-outlined text-[20px]">checklist</span>
          Complete Purchase ({checkedCount} items)
        </button>
      )}

      {/* Supermarket Tabs */}
      {supermarketNames.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            className={`whitespace-nowrap px-4 py-2 rounded-full text-label-sm font-label-sm transition-colors ${
              supermarketTab === 'all'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
            }`}
            onClick={() => setSupermarketTab('all')}
          >
            All ({items.length})
          </button>
          {supermarketNames.map(name => {
            const count = items.filter(i => i.best_supermarket === name).length;
            return (
              <button
                key={name}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-label-sm font-label-sm transition-colors ${
                  supermarketTab === name
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
                }`}
                onClick={() => setSupermarketTab(name)}
              >
                {name} ({count})
              </button>
            );
          })}
          {items.some(i => !i.best_supermarket) && (
            <button
              className={`whitespace-nowrap px-4 py-2 rounded-full text-label-sm font-label-sm transition-colors ${
                supermarketTab === 'none'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
              }`}
              onClick={() => setSupermarketTab('none')}
            >
              No store ({items.filter(i => !i.best_supermarket).length})
            </button>
          )}
        </div>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <div className="empty-state">
          <p>This list is empty.</p>
          <p>Add items from the Products page.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.length === 0 && supermarketTab !== 'all' && (
            <div className="empty-state">
              <p>No items for this supermarket.</p>
            </div>
          )}
          {filteredItems.map((item) => (
            <article
              className={`bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] p-4 flex items-center gap-4 border border-surface-variant relative overflow-hidden group transition-opacity ${item.checked ? 'opacity-60' : ''}`}
              key={item.id}
            >
              {!item.checked && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary hidden md:block" />}

              <label className="flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={!!item.checked}
                  onChange={() => toggleChecked(item)}
                  className="w-6 h-6 rounded text-primary focus:ring-primary border-outline-variant cursor-pointer"
                />
              </label>

              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-surface-container flex items-center justify-center">
                {item.image_url ? (
                  <img loading="lazy" className={`w-full h-full object-cover ${item.checked ? 'grayscale' : ''}`} src={item.image_url} alt="" />
                ) : (
                  <span className="material-symbols-outlined text-2xl text-outline-variant">inventory_2</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className={`text-label-lg font-label-lg text-on-surface truncate ${item.checked ? 'line-through decoration-outline' : ''}`}>
                  {item.product_name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {item.best_price && (
                    <span className={`text-body-md font-body font-bold ${item.checked ? 'line-through decoration-outline text-on-surface-variant' : 'text-secondary'}`}>
                      €{item.best_price.toFixed(2)}
                    </span>
                  )}
                  {item.best_supermarket && (
                    <span className={`text-label-sm font-label-sm bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full ${item.checked ? 'line-through decoration-outline' : ''}`}>
                      {item.best_supermarket}
                    </span>
                  )}
                  {!item.best_price && item.barcode && (
                    <span className="text-label-sm font-label-sm text-on-surface-variant">{item.barcode}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className={`flex items-center bg-surface-container-low rounded-lg p-1 ${item.checked ? 'opacity-50 pointer-events-none' : ''}`}>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-variant text-on-surface transition-colors" onClick={() => updateQuantity(item, -1)}>
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <span className="w-8 text-center text-label-lg font-label-lg text-on-surface">{item.quantity}</span>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-variant text-on-surface transition-colors" onClick={() => updateQuantity(item, 1)}>
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
                {item.best_price && (
                  <div className={`text-label-lg font-label-lg text-on-surface ${item.checked ? 'line-through decoration-outline' : ''}`}>
                    €{(item.best_price * item.quantity).toFixed(2)}
                  </div>
                )}
              </div>

              <button className="min-h-[44px] min-w-[44px] flex items-center justify-center text-outline hover:text-error transition-colors shrink-0" onClick={() => deleteItem(item.id)}>
                <span className="material-symbols-outlined">delete</span>
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}