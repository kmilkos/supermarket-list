# SuperMarketList

Greek supermarket price comparison app. Search products by barcode or name, compare prices across supermarkets, manage shopping lists, and find the best deals.

## Features

- **Barcode scanning** — scan product barcodes to look up prices
- **Price lookup** — official Greek supermarket prices via PosoKanei API
- **Product database** — save products with images and categories
- **Shopping lists** — create multiple lists, group items by supermarket, complete and review past lists
- **Price history** — track purchased items and their best prices

## Tech stack

- **Client:** React 19 + Vite 8, Tailwind CSS v3, Material Symbols
- **Server:** Express 5 + better-sqlite3, sharp (image processing)
- **APIs:** PosoKanei (Greek govt), OpenFoodFacts, UPCitemdb

## Quick start

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Start dev servers (server :3001, client :5173)
npm run dev
```

Open `http://localhost:5173` in your browser.

## Production install (Debian)

```bash
sudo ./install.sh
```

The app runs on `http://<your-ip>:3001` as a systemd service.

## HTTPS

Camera access requires HTTPS. See [SETUP_HTTPS.md](SETUP_HTTPS.md) for options: mkcert (LAN), Let's Encrypt, or nginx reverse proxy.

## Project structure

```
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/       # App pages (Products, Lookup, Tobuy, etc.)
│       └── components/  # BarcodeScanner
├── server/          # Express API server
│   ├── index.js         # Routes & middleware
│   ├── database.js      # SQLite schema + migrations
│   ├── services/        # External API lookups
│   └── uploads/         # Product images (gitignored)
├── install.sh       # Debian installer
└── SETUP_HTTPS.md   # HTTPS guide
```
