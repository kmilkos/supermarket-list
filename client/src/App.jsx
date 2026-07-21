import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import './App.css';

const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const TobuyPage = lazy(() => import('./pages/TobuyPage'));
const SupermarketsPage = lazy(() => import('./pages/SupermarketsPage'));
const PriceComparePage = lazy(() => import('./pages/PriceComparePage'));
const LookupPage = lazy(() => import('./pages/LookupPage'));

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
    </div>
  );
}

const NAV_ITEMS = [
  { to: '/', label: 'Προϊόντα', icon: 'inventory_2' },
  { to: '/tobuy', label: 'Λίστα', icon: 'shopping_basket' },
  { to: '/lookup', label: 'Αναζήτηση', icon: 'search' },
  { to: '/supermarkets', label: 'Καταστήματα', icon: 'storefront' },
  { to: '/prices', label: 'Τιμές', icon: 'sell' },
];

function BottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-14 bg-surface px-2 pb-safe shadow-[0px_-2px_8px_rgba(15,23,42,0.05)]">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.to ||
          (item.to === '/' && location.pathname === '/');
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={`flex flex-col items-center justify-center px-2 py-1 min-h-[44px] min-w-[44px] rounded-xl transition-all duration-150 ${
              isActive
                ? 'text-primary bg-secondary-container/20 scale-95'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span
              className={`material-symbols-outlined mb-0.5 text-xl ${isActive ? 'text-primary' : ''}`}
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className={`text-label-sm font-label-sm ${isActive ? 'font-bold' : ''}`}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function TopBar() {
  return (
    <header className="docked top-0 sticky z-40 bg-surface shadow-sm flex justify-between items-center px-4 h-14 w-full">
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-primary cursor-pointer hover:bg-surface-variant/50 p-2 rounded-full transition-colors">menu</span>
        <h1 className="text-headline-md font-headline font-bold text-primary">SuperMarket List</h1>
      </div>
      <span className="material-symbols-outlined text-primary cursor-pointer hover:bg-surface-variant/50 p-2 rounded-full transition-colors">search</span>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-on-background antialiased flex flex-col">
        <TopBar />
        <main className="flex-1 pb-20">
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<ProductsPage />} />
              <Route path="/tobuy" element={<TobuyPage />} />
              <Route path="/lookup" element={<LookupPage />} />
              <Route path="/supermarkets" element={<SupermarketsPage />} />
              <Route path="/prices" element={<PriceComparePage />} />
            </Routes>
          </Suspense>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
