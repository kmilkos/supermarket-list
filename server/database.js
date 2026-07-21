const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'supermarket.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS supermarkets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    logo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    image_url TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    supermarket_id INTEGER NOT NULL,
    price REAL NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supermarket_id) REFERENCES supermarkets(id) ON DELETE CASCADE,
    UNIQUE(product_id, supermarket_id)
  );

  CREATE TABLE IF NOT EXISTS tobuy_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL UNIQUE,
    quantity INTEGER DEFAULT 1,
    checked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS purchase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    product_name TEXT,
    barcode TEXT,
    image_url TEXT,
    category TEXT,
    quantity INTEGER DEFAULT 1,
    best_price REAL,
    best_supermarket TEXT,
    list_id INTEGER,
    list_name TEXT,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS shopping_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate: add list_id to tobuy_items, remove UNIQUE(product_id), add (list_id, product_id) unique
const tbTableInfo = db.prepare("PRAGMA table_info('tobuy_items')").all();
const hasListId = tbTableInfo.find(c => c.name === 'list_id');
const oldSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tobuy_items'").get();
const hasOldConstraint = oldSchema?.sql?.includes('UNIQUE(product_id)');

if (!hasListId || hasOldConstraint) {
  // Create default list for migration
  const existingDefault = db.prepare("SELECT id FROM shopping_lists WHERE id = 1").get();
  if (!existingDefault) {
    db.prepare("INSERT OR IGNORE INTO shopping_lists (id, name) VALUES (1, 'My Shopping List')").run();
  }

  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;
      CREATE TABLE tobuy_items_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        checked INTEGER DEFAULT 0,
        list_id INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
      INSERT INTO tobuy_items_v2 (id, product_id, quantity, checked, COALESCE(list_id, 1), created_at)
        SELECT id, product_id, quantity, checked, list_id, created_at FROM tobuy_items;
      DROP TABLE tobuy_items;
      ALTER TABLE tobuy_items_v2 RENAME TO tobuy_items;
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

// Create unique index (list_id, product_id)
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tobuy_list_product ON tobuy_items(list_id, product_id);
`);

// Migrate: add list_name, list_id to purchase_history if not present
const phTableInfo = db.prepare("PRAGMA table_info('purchase_history')").all();
if (!phTableInfo.find(c => c.name === 'list_name')) {
  db.exec(`ALTER TABLE purchase_history ADD COLUMN list_name TEXT`);
}
if (!phTableInfo.find(c => c.name === 'list_id')) {
  db.exec(`ALTER TABLE purchase_history ADD COLUMN list_id INTEGER`);
}

const defaultSupermarkets = [
  { name: 'AB Vassilopoulos', address: '' },
  { name: 'Sklavenitis', address: '' },
  { name: 'Lidl', address: '' },
  { name: 'Metro', address: '' },
  { name: 'Masoutis', address: '' },
  { name: 'MyMarket', address: '' },
  { name: 'Κρητικός', address: '' },
];

const insert = db.prepare('INSERT OR IGNORE INTO supermarkets (name, address) VALUES (?, ?)');
for (const s of defaultSupermarkets) {
  insert.run(s.name, s.address);
}

// Performance indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  CREATE INDEX IF NOT EXISTS idx_tobuy_items_checked ON tobuy_items(checked);
  CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);
`);

module.exports = db;
