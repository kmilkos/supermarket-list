const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const compression = require('compression');
const db = require('./database');
const { fullLookup, searchPosoKanei } = require('./services/externalLookup');

const app = express();
const PORT = 3001;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(compression());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', etag: true }));

// Serve built client in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '7d', etag: true }));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    } else {
      next();
    }
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}.webp`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function processImage(inputPath) {
  return sharp(inputPath)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
    .then(buf => fs.promises.writeFile(inputPath, buf));
}

function processUpload(req, res, next) {
  if (req.file) {
    processImage(req.file.path).catch(() => {}).finally(() => next());
  } else {
    next();
  }
}

async function downloadImage(url) {
  const parsed = new URL(url);
  const mod = parsed.protocol === 'https:' ? https : http;
  const filename = `product_${Date.now()}.webp`;
  const filepath = path.join(UPLOADS_DIR, filename);

  return new Promise((resolve, reject) => {
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const stream = fs.createWriteStream(filepath);
      res.pipe(stream);
      stream.on('finish', () => {
        processImage(filepath)
          .then(() => resolve(`/uploads/${filename}`))
          .catch(() => resolve(`/uploads/${filename}`));
      });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

// Global async error wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Cache header helper
const cache = (res, ttl = 60) => res.set('Cache-Control', `public, max-age=${ttl}`);

// ==================== PRODUCTS ====================

app.get('/api/products', (req, res, next) => {
  try {
    const { search, barcode } = req.query;
    let query = 'SELECT * FROM products';
    const params = [];
    if (barcode) {
      query += ' WHERE barcode = ?';
      params.push(barcode);
    } else if (search) {
      query += ' WHERE name LIKE ?';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY name';
    cache(res);
    res.json(db.prepare(query).all(...params));
  } catch (err) { next(err); }
});

app.get('/api/products/:id', (req, res, next) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const prices = db.prepare(`
      SELECT p.*, s.name as supermarket_name
      FROM prices p JOIN supermarkets s ON p.supermarket_id = s.id
      WHERE p.product_id = ? ORDER BY p.price ASC
    `).all(req.params.id);
    res.json({ ...product, prices });
  } catch (err) { next(err); }
});

app.post('/api/products', upload.single('image'), processUpload, asyncHandler(async (req, res) => {
  const { name, barcode, category, image_url } = req.body;
  let final_image_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!final_image_url && image_url) {
    try { final_image_url = await downloadImage(image_url); } catch { final_image_url = null; }
  }

  try {
    const result = db.prepare(
      'INSERT INTO products (name, barcode, image_url, category) VALUES (?, ?, ?, ?)'
    ).run(name, barcode || null, final_image_url, category || null);
    res.json({ id: result.lastInsertRowid, name, barcode, image_url: final_image_url, category });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Product with this barcode already exists' });
    throw err;
  }
}));

app.put('/api/products/:id', upload.single('image'), processUpload, asyncHandler(async (req, res) => {
  const { name, barcode, category } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const image_url = req.file ? `/uploads/${req.file.filename}` : existing.image_url;

  db.prepare('UPDATE products SET name = ?, barcode = ?, image_url = ?, category = ? WHERE id = ?')
    .run(name || existing.name, barcode || existing.barcode, image_url, category || existing.category, req.params.id);
  res.json({ id: Number(req.params.id), name: name || existing.name, barcode: barcode || existing.barcode, image_url, category: category || existing.category });
}));

app.delete('/api/products/:id', (req, res, next) => {
  try { db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id); res.json({ success: true }); } catch (err) { next(err); }
});

// ==================== SUPERMARKETS ====================

app.get('/api/supermarkets', (req, res, next) => {
  try { cache(res); res.json(db.prepare('SELECT * FROM supermarkets ORDER BY name').all()); } catch (err) { next(err); }
});

app.post('/api/supermarkets', (req, res, next) => {
  const { name, address, logo_url } = req.body;
  try {
    const result = db.prepare('INSERT INTO supermarkets (name, address, logo_url) VALUES (?, ?, ?)')
      .run(name, address || '', logo_url || null);
    res.json({ id: result.lastInsertRowid, name, address, logo_url });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Supermarket already exists' });
    next(err);
  }
});

app.put('/api/supermarkets/:id', (req, res, next) => {
  const { name, address, logo_url } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM supermarkets WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Supermarket not found' });
    db.prepare('UPDATE supermarkets SET name = ?, address = ?, logo_url = ? WHERE id = ?')
      .run(name || existing.name, address ?? existing.address, logo_url ?? existing.logo_url, req.params.id);
    res.json({ id: Number(req.params.id), name: name || existing.name, address: address ?? existing.address, logo_url: logo_url ?? existing.logo_url });
  } catch (err) { next(err); }
});

app.delete('/api/supermarkets/:id', (req, res, next) => {
  try { db.prepare('DELETE FROM supermarkets WHERE id = ?').run(req.params.id); res.json({ success: true }); } catch (err) { next(err); }
});

// ==================== PRICES ====================

app.get('/api/prices/compare/:productId', (req, res, next) => {
  try {
    const prices = db.prepare(`
      SELECT p.*, s.name as supermarket_name
      FROM prices p JOIN supermarkets s ON p.supermarket_id = s.id
      WHERE p.product_id = ? ORDER BY p.price ASC
    `).all(req.params.productId);
    res.json(prices);
  } catch (err) { next(err); }
});

app.post('/api/prices', (req, res, next) => {
  const { product_id, supermarket_id, price } = req.body;
  try {
    const result = db.prepare(
      'INSERT INTO prices (product_id, supermarket_id, price) VALUES (?, ?, ?) ON CONFLICT(product_id, supermarket_id) DO UPDATE SET price = ?, updated_at = CURRENT_TIMESTAMP'
    ).run(product_id, supermarket_id, price, price);
    res.json({ id: result.lastInsertRowid, product_id, supermarket_id, price });
  } catch (err) { next(err); }
});

app.delete('/api/prices/:id', (req, res, next) => {
  try { db.prepare('DELETE FROM prices WHERE id = ?').run(req.params.id); res.json({ success: true }); } catch (err) { next(err); }
});

// ==================== SHOPPING LISTS ====================

app.get('/api/lists', (req, res, next) => {
  try {
    const lists = db.prepare(`
      SELECT sl.*,
        (SELECT COUNT(*) FROM tobuy_items WHERE list_id = sl.id) as item_count,
        (SELECT COUNT(*) FROM tobuy_items WHERE list_id = sl.id AND checked = 1) as checked_count
      FROM shopping_lists sl
      ORDER BY sl.completed, sl.created_at DESC
    `).all();
    res.json(lists);
  } catch (err) { next(err); }
});

app.post('/api/lists', (req, res, next) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const result = db.prepare('INSERT INTO shopping_lists (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim(), item_count: 0, checked_count: 0, completed: 0 });
  } catch (err) { next(err); }
});

app.put('/api/lists/:id', (req, res, next) => {
  const { name } = req.body;
  try {
    if (name !== undefined) db.prepare('UPDATE shopping_lists SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.delete('/api/lists/:id', (req, res, next) => {
  try {
    db.prepare('DELETE FROM tobuy_items WHERE list_id = ?').run(req.params.id);
    db.prepare('DELETE FROM shopping_lists WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.post('/api/lists/:id/complete', (req, res, next) => {
  try {
    const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });

    const items = db.prepare(`
      SELECT tb.*, p.name as product_name, p.barcode, p.image_url, p.category,
        MIN(pr.price) as best_price,
        (SELECT s2.name FROM prices pr2 JOIN supermarkets s2 ON pr2.supermarket_id = s2.id WHERE pr2.product_id = p.id ORDER BY pr2.price ASC LIMIT 1) as best_supermarket
      FROM tobuy_items tb
      JOIN products p ON tb.product_id = p.id
      LEFT JOIN prices pr ON pr.product_id = p.id
      WHERE tb.list_id = ? AND tb.checked = 1
      GROUP BY tb.id
    `).all(req.params.id);

    const insert = db.prepare(`
      INSERT INTO purchase_history (product_id, product_name, barcode, image_url, category, quantity, best_price, best_supermarket, list_id, list_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let listCompleted = false;

    const tx = db.transaction(() => {
      for (const item of items) {
        insert.run(item.product_id, item.product_name, item.barcode, item.image_url, item.category, item.quantity, item.best_price, item.best_supermarket, list.id, list.name);
      }
      db.prepare('DELETE FROM tobuy_items WHERE list_id = ? AND checked = 1').run(req.params.id);

      const remaining = db.prepare('SELECT COUNT(*) as count FROM tobuy_items WHERE list_id = ?').get(req.params.id);
      if (remaining.count === 0) {
        db.prepare("UPDATE shopping_lists SET completed = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
        listCompleted = true;
      }
    });
    tx();

    res.json({ archived: items.length, list_completed: listCompleted });
  } catch (err) { next(err); }
});

app.get('/api/lists/:id/items', (req, res, next) => {
  try {
    const items = db.prepare('SELECT * FROM purchase_history WHERE list_id = ? ORDER BY purchased_at DESC').all(req.params.id);
    res.json(items);
  } catch (err) { next(err); }
});

// ==================== TO-BUY ITEMS ====================

app.get('/api/tobuy', (req, res, next) => {
  try {
    const listId = req.query.list_id;
    let where = '';
    const params = [];
    if (listId) { where = 'WHERE tb.list_id = ?'; params.push(listId); }
    const items = db.prepare(`
      SELECT tb.*, p.name as product_name, p.barcode, p.image_url, p.category,
        MIN(pr.price) as best_price,
        (SELECT s2.name FROM prices pr2 JOIN supermarkets s2 ON pr2.supermarket_id = s2.id WHERE pr2.product_id = p.id ORDER BY pr2.price ASC LIMIT 1) as best_supermarket
      FROM tobuy_items tb
      JOIN products p ON tb.product_id = p.id
      LEFT JOIN prices pr ON pr.product_id = p.id
      ${where}
      GROUP BY tb.id
      ORDER BY tb.created_at DESC
    `).all(...params);
    res.json(items);
  } catch (err) { next(err); }
});

app.post('/api/tobuy', (req, res, next) => {
  const { product_id, quantity, list_id } = req.body;
  try {
    const lid = list_id || 1;
    const existing = db.prepare('SELECT id, quantity FROM tobuy_items WHERE product_id = ? AND list_id = ?').get(product_id, lid);
    if (existing) {
      db.prepare('UPDATE tobuy_items SET quantity = quantity + ? WHERE id = ?').run(quantity || 1, existing.id);
      res.json({ id: existing.id, product_id, quantity: (existing.quantity || 0) + (quantity || 1), list_id: lid });
    } else {
      const result = db.prepare('INSERT INTO tobuy_items (product_id, quantity, list_id) VALUES (?, ?, ?)').run(product_id, quantity || 1, lid);
      res.json({ id: result.lastInsertRowid, product_id, quantity: quantity || 1, list_id: lid });
    }
  } catch (err) { next(err); }
});

app.put('/api/tobuy/:id', (req, res, next) => {
  const { quantity, checked } = req.body;
  try {
    if (quantity !== undefined) db.prepare('UPDATE tobuy_items SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
    if (checked !== undefined) db.prepare('UPDATE tobuy_items SET checked = ? WHERE id = ?').run(checked ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.delete('/api/tobuy/:id', (req, res, next) => {
  try { db.prepare('DELETE FROM tobuy_items WHERE id = ?').run(req.params.id); res.json({ success: true }); } catch (err) { next(err); }
});

// ==================== STATS ====================

app.get('/api/tobuy/stats', (req, res, next) => {
  try {
    const listId = req.query.list_id;
    let where = '';
    const params = [];
    if (listId) { where = 'WHERE tb.list_id = ?'; params.push(listId); }
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_items,
        COALESCE(SUM(tb.quantity), 0) as total_quantity,
        COALESCE(SUM(tb.quantity * sub.min_price), 0) as estimated_total
      FROM tobuy_items tb
      LEFT JOIN (
        SELECT product_id, MIN(price) as min_price
        FROM prices
        GROUP BY product_id
      ) sub ON sub.product_id = tb.product_id
      ${where}
    `).get(...params);
    res.json(stats);
  } catch (err) { next(err); }
});

// ==================== PURCHASE HISTORY ====================

app.get('/api/tobuy/history', (req, res, next) => {
  try {
    const items = db.prepare('SELECT * FROM purchase_history ORDER BY purchased_at DESC').all();
    res.json(items);
  } catch (err) { next(err); }
});

app.delete('/api/tobuy/history', (req, res, next) => {
  try { db.prepare('DELETE FROM purchase_history').run(); res.json({ success: true }); } catch (err) { next(err); }
});

// ==================== EXTERNAL LOOKUP ====================

app.get('/api/lookup/:barcode', asyncHandler(async (req, res) => {
  const result = await fullLookup(req.params.barcode);
  res.json(result);
}));

app.get('/api/lookup/search/:query', asyncHandler(async (req, res) => {
  const debug = [];
  const results = await searchPosoKanei(req.params.query, debug);
  res.json({ results, _debug: debug });
}));

app.post('/api/lookup/import-prices', asyncHandler(async (req, res) => {
  const { product_id, prices } = req.body;
  if (!product_id || !prices || !Array.isArray(prices)) {
    return res.status(400).json({ error: 'product_id and prices array required' });
  }

  // Batch resolve supermarket IDs
  const names = [...new Set(prices.map(p => p.supermarket_name))];
  const nameToId = {};

  const existing = db.prepare(`SELECT id, name FROM supermarkets WHERE name IN (${names.map(() => '?').join(',')})`).all(...names);
  for (const e of existing) nameToId[e.name] = e.id;

  const insertSup = db.prepare('INSERT INTO supermarkets (name) VALUES (?)');
  for (const n of names) {
    if (!nameToId[n]) {
      const r = insertSup.run(n);
      nameToId[n] = r.lastInsertRowid;
    }
  }

  // Batch insert all prices in a transaction
  const upsert = db.prepare(`
    INSERT INTO prices (product_id, supermarket_id, price) VALUES (?, ?, ?)
    ON CONFLICT(product_id, supermarket_id) DO UPDATE SET price = ?, updated_at = CURRENT_TIMESTAMP
  `);

  const tx = db.transaction(() => {
    for (const p of prices) {
      upsert.run(product_id, nameToId[p.supermarket_name], p.price, p.price);
    }
  });
  tx();

  res.json({ imported: prices.length, prices: prices.map(p => ({ supermarket: p.supermarket_name, price: p.price })) });
}));

// ==================== ERROR HANDLER ====================

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
