const https = require('https');
const http = require('http');

const POSOKANEI_BASE = 'https://api.posokanei.gov.gr';
const OFF_BASE = 'https://world.openfoodfacts.org';

const POSOKANEI_RETAILER_MAP = {
  ab_vasilopoulos: 'AB Vassilopoulos',
  sklavenitis: 'Sklavenitis',
  masoutis: 'Masoutis',
  mymarket: 'MyMarket',
  lidl: 'Lidl',
  kritikos: 'Κρητικός',
  market_in: 'Market In',
  synka: 'Synka',
  galaxias: 'Galaxias',
  halkiadakis: 'Χαλκαδάκης',
};

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request(parsed, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        ...options.headers,
      },
      timeout: options.timeout || 8000,
    }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function lookupPosoKaneiByBarcode(barcode, debug) {
  try {
    debug?.push({ t: new Date().toISOString(), msg: `🔍 PosoKanei: searching barcode ${barcode}` });
    const data = await httpsRequest(
      `${POSOKANEI_BASE}/products/barcode/${barcode}?countries=GR&include_tax=true`
    );
    if (data.detail) {
      debug?.push({ t: new Date().toISOString(), msg: `❌ PosoKanei: no product for this barcode` });
      return null;
    }
    const prices = data.retailer_prices || [];
    debug?.push({ t: new Date().toISOString(), msg: `✅ PosoKanei: found "${data.name}" — ${prices.length} retailer prices` });
    return {
      source: 'posokanei',
      name: data.name?.trim(),
      brand: data.brand?.trim(),
      image_url: data.image_url,
      category: data.category,
      unit: data.unit,
      unit_quantity: data.unit_quantity,
      prices: prices.map((rp) => ({
        supermarket_name: rp.retailer_display_name || POSOKANEI_RETAILER_MAP[rp.retailer] || rp.retailer,
        supermarket_key: rp.retailer,
        price: rp.price,
        is_discount: rp.is_discount,
        discount_percentage: rp.discount_percentage,
        last_updated: rp.last_updated,
        country: rp.country,
      })),
      price_stats: data.price_stats,
    };
  } catch (err) {
    debug?.push({ t: new Date().toISOString(), msg: `❌ PosoKanei: ${err.message}` });
    return null;
  }
}

async function searchPosoKanei(query, debug) {
  try {
    debug?.push({ t: new Date().toISOString(), msg: `🔍 PosoKanei: searching by name "${query}"` });
    const body = JSON.stringify({ title: query, countries: ['GR'], page: 1, page_size: 20 });
    const data = await httpsRequest(`${POSOKANEI_BASE}/products/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    debug?.push({ t: new Date().toISOString(), msg: `✅ PosoKanei: name search returned ${data.products?.length || 0} products` });
    return (data.products || []).map((p) => ({
      source: 'posokanei',
      posokanei_id: p.id,
      name: p.name?.trim(),
      brand: p.brand?.trim(),
      image_url: p.image_url,
      category: p.category,
      unit: p.unit,
      unit_quantity: p.unit_quantity,
      price_stats: p.price_stats,
      retailers: p.retailers,
      retailer_prices: (p.retailer_prices || []).map((rp) => ({
        supermarket_name: rp.retailer_display_name || POSOKANEI_RETAILER_MAP[rp.retailer] || rp.retailer,
        supermarket_key: rp.retailer,
        price: rp.price,
      })),
    }));
  } catch (err) {
    debug?.push({ t: new Date().toISOString(), msg: `❌ PosoKanei: name search failed — ${err.message}` });
    return [];
  }
}

async function lookupOpenFoodFacts(barcode, debug) {
  try {
    debug?.push({ t: new Date().toISOString(), msg: `🔍 OpenFoodFacts: looking up barcode ${barcode}` });
    const data = await httpsRequest(
      `${OFF_BASE}/api/v2/product/${barcode}?fields=product_name,brands,image_front_url,nutrition_grades,categories,labels`
    );
    if (data.status !== 1) {
      debug?.push({ t: new Date().toISOString(), msg: `❌ OpenFoodFacts: product not found` });
      return null;
    }
    const p = data.product;
    debug?.push({ t: new Date().toISOString(), msg: `✅ OpenFoodFacts: found "${p.product_name}"` });
    return {
      source: 'openfoodfacts',
      name: p.product_name,
      brand: p.brands,
      image_url: p.image_front_url,
      category: p.categories,
      nutrition_grades: p.nutrition_grades,
    };
  } catch (err) {
    debug?.push({ t: new Date().toISOString(), msg: `❌ OpenFoodFacts: ${err.message}` });
    return null;
  }
}

async function fullLookup(barcode) {
  const debug = [];

  const [posokanei, off] = await Promise.all([
    lookupPosoKaneiByBarcode(barcode, debug),
    lookupOpenFoodFacts(barcode, debug),
  ]);

  let prices = posokanei?.prices || [];
  let price_stats = posokanei?.price_stats || null;

  // Fallback: text search PosoKanei when barcode gives no prices
  if (prices.length === 0) {
    const productName = posokanei?.name || off?.name;
    const brand = posokanei?.brand || off?.brand;
    const category = posokanei?.category || off?.category;

    const searchQueries = [];
    if (productName) searchQueries.push(productName);
    if (brand && category) searchQueries.push(`${brand} ${category}`);
    if (category) searchQueries.push(category);

    if (searchQueries.length > 0) {
      debug.push({ t: new Date().toISOString(), msg: `⚠️ Barcode lookups gave no prices — trying text search fallback` });
      for (const query of searchQueries) {
        if (prices.length > 0) break;
        debug.push({ t: new Date().toISOString(), msg: `🔍 Fallback: searching PosoKanei for "${query}"` });
        try {
          const searchResults = await searchPosoKanei(query, debug);
          for (const match of searchResults) {
            if (match.retailer_prices && match.retailer_prices.length > 0) {
              prices = match.retailer_prices.map((rp) => ({
                supermarket_name: rp.supermarket_name,
                supermarket_key: rp.supermarket_key,
                price: rp.price,
                is_discount: false,
                discount_percentage: null,
                last_updated: null,
                country: 'GR',
              }));
              price_stats = match.price_stats || null;
              debug.push({ t: new Date().toISOString(), msg: `✅ Fallback: matched ${prices.length} prices` });
              break;
            }
          }
        } catch {
          // Ignore search fallback errors
        }
      }
    }
  }

  // Prefer PosoKanei image, fall back to OpenFoodFacts
  const image = posokanei?.image_url || off?.image_url || null;

  const names = [];
  if (posokanei?.name) names.push('PosoKanei');
  if (off?.name) names.push('OpenFoodFacts');
  debug.push({ t: new Date().toISOString(), msg: `📦 Product data sources: ${names.length > 0 ? names.join(', ') : 'none'}` });

  return {
    barcode,
    product: {
      name: posokanei?.name || off?.name || null,
      brand: posokanei?.brand || off?.brand || null,
      image_url: image,
      category: posokanei?.category || off?.category || null,
      unit: posokanei?.unit || null,
      unit_quantity: posokanei?.unit_quantity || null,
    },
    sources: {
      posokanei: posokanei || null,
      openfoodfacts: off || null,
    },
    prices,
    price_stats,
    _debug: debug,
  };
}

module.exports = { fullLookup, searchPosoKanei };
