# 🛒 SuperMarketList

**Greek supermarket price comparison tool** — scan barcodes, search products by name, compare prices across Greek supermarkets, and manage smart shopping lists.

Powered by the official [PosoKanei](https://posokanei.gov.gr) API (Greek government open data).

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Barcode scanner** | Scan any product barcode to instantly fetch details and prices |
| 💰 **Price comparison** | Compare prices across AB Vassilopoulos, Sklavenitis, Masoutis, MyMarket, Lidl, Κρητικός, and more |
| 📦 **Product database** | Save products with images, categories, and barcodes |
| 📋 **Shopping lists** | Create multiple lists, each with its own items and quantities |
| 🏪 **Supermarket tabs** | Items grouped by cheapest supermarket — see what to buy where |
| ✅ **Purchase history** | Complete a list and review past purchases |
| 📱 **Mobile-first** | Works on phone, tablet, and desktop |

## Features

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, Tailwind CSS v3, Material Symbols |
| **Backend** | Express 5, better-sqlite3, sharp |
| **APIs** | PosoKanei (Greek govt), OpenFoodFacts |

## 🚀 Quick start (development)

```bash
git clone https://github.com/<your-username>/supermarket-list.git
cd supermarket-list

# Install dependencies (server + client)
cd server && npm install && cd ../client && npm install && cd ..

# Start both servers
npm run dev
# → API server: http://localhost:3001
# → Client:     http://localhost:5173 (with API proxy to :3001)
```

Open `http://localhost:5173` and you're ready.

## 🏭 Production (Debian)

```bash
sudo ./install.sh
```

What the installer does:
1. Installs Node.js 22 + build tools
2. Runs `npm install` in both `server/` and `client/`
3. Builds the client (`vite build` → `client/dist/`)
4. Creates a **systemd service** (`supermarket-list.service`)
5. Enables auto-start on boot
6. Starts the server on port **3001**

The app is now available at `http://<your-server-ip>:3001`.

## 🔒 HTTPS (for barcode scanner)

Camera access requires HTTPS. See **[SETUP_HTTPS.md](SETUP_HTTPS.md)** for three approaches:

- **mkcert** — self-signed trusted cert for LAN access
- **Let's Encrypt** — for public domains
- **nginx proxy** — production-grade reverse proxy with automatic HTTPS

## 📁 Project structure

```
supermarket-list/
├── client/                    # React + Vite frontend
│   └── src/
│       ├── pages/
│       │   ├── ProductsPage     # Product grid + barcode scanner
│       │   ├── LookupPage       # Barcode/name lookup + price import
│       │   ├── TobuyPage        # Shopping lists with supermarket tabs
│       │   ├── PriceComparePage # Compare prices per product
│       │   └── SupermarketsPage # Manage supermarket list
│       ├── components/
│       │   └── BarcodeScanner   # Camera barcode reader
│       ├── App.jsx              # TopBar + BottomNav + lazy routes
│       └── index.css            # Tailwind + design tokens
├── server/                     # Express API server
│   ├── index.js                # Routes, middleware, file upload
│   ├── database.js             # SQLite schema, indexes, migrations
│   ├── services/
│   │   └── externalLookup.js   # PosoKanei + OpenFoodFacts clients
│   └── uploads/                # Product images (gitignored)
├── install.sh                  # Debian production installer
├── SETUP_HTTPS.md              # HTTPS configuration guide
└── README.md
```

## 📡 API overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET/POST | List / create products |
| `/api/products/:id` | PUT/DELETE | Update / delete product |
| `/api/supermarkets` | GET | List supermarkets |
| `/api/tobuy?list_id=X` | GET | Get items in a list |
| `/api/tobuy` | POST | Add item to list |
| `/api/lists` | GET/POST | List / create shopping lists |
| `/api/lists/:id/complete` | POST | Complete a list (archive checked items) |
| `/api/lookup/:barcode` | GET | Full barcode lookup (PosoKanei + OpenFoodFacts) |
| `/api/lookup/search/:query` | GET | Search products by name |
| `/api/lookup/import-prices` | POST | Import prices for a saved product |

## 📄 License

MIT
