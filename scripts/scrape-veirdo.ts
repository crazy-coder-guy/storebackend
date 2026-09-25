/**
 * scrape-veirdo.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Scrapes all products from multiple Veirdo Shopify collections via the free
 * Shopify JSON API and imports them into your Postgres database via Prisma.
 *
 * Collections scraped:
 *   1. mens-graphic-t-shirts  → "Men's Graphic T-Shirts"
 *   2. mens-polo-tshirts      → "Men's Polo T-Shirts"
 *   3. the-print-club         → "The Print Club"
 *   4. premium-collection     → "Premium Collection"
 *
 * Usage:
 *   npx ts-node scripts/scrape-veirdo.ts
 *   npx ts-node scripts/scrape-veirdo.ts --dry-run
 *   npx ts-node scripts/scrape-veirdo.ts --limit=10
 */

import { PrismaClient, ProductFit, NeckType } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

// ─── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT_ARG = args.find((a: string) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : Infinity;

// ─── Collections to scrape ────────────────────────────────────────────────────
const COLLECTIONS = [
  { handle: 'mens-graphic-t-shirts', categoryName: "Men's Graphic T-Shirts", categorySlug: 'mens-graphic-tshirts', productType: 'T-Shirt' },
  { handle: 'mens-polo-tshirts',     categoryName: "Men's Polo T-Shirts",    categorySlug: 'mens-polo-tshirts',    productType: 'Polo T-Shirt' },
  { handle: 'the-print-club',        categoryName: 'The Print Club',          categorySlug: 'the-print-club',       productType: 'T-Shirt' },
  { handle: 'premium-collection',    categoryName: 'Premium Collection',      categorySlug: 'premium-collection',   productType: 'T-Shirt' },
];

const BASE_URL = 'https://veirdo.in';
const PAGE_SIZE = 250;
const REQUEST_DELAY_MS = 400;

// ─── Shopify types ────────────────────────────────────────────────────────────
interface ShopifyImage {
  id: number;
  src: string;
  variant_ids: number[];
  position: number;
}

interface ShopifyVariant {
  id: number;
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  sku: string;
  price: string;
  compare_at_price: string | null;
  available: boolean;
  inventory_quantity: number;
}

interface ShopifyOption {
  name: string;
  values: string[];
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  tags: string;
  options: ShopifyOption[];
  variants: ShopifyVariant[];
  images: ShopifyImage[];
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; product-importer/1.0)',
        'Accept': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseDescriptionTable(html: string): {
  fabric?: string;
  neckType?: NeckType;
  fit?: ProductFit;
  description?: string;
} {
  const result: { fabric?: string; neckType?: NeckType; fit?: ProductFit; description?: string } = {};
  const rowRegex = /<tr[^>]*>.*?<td[^>]*>(.*?)<\/td>.*?<td[^>]*>(.*?)<\/td>.*?<\/tr>/gis;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const key = stripHtml(match[1]).toLowerCase().trim();
    const val = stripHtml(match[2]).trim();

    if (key.includes('made of') || key.includes('fabric') || key.includes('material')) {
      result.fabric = val;
    } else if (key.includes('neck')) {
      const neck = val.toLowerCase();
      if (neck.includes('round') || neck.includes('crew')) result.neckType = 'CREW';
      else if (neck.includes('v-neck') || neck.includes('v neck')) result.neckType = 'V_NECK';
      else if (neck.includes('polo')) result.neckType = 'POLO';
      else if (neck.includes('mock')) result.neckType = 'MOCK';
      else result.neckType = 'ROUND';
    } else if (key.includes('fit')) {
      const fit = val.toLowerCase();
      if (fit.includes('oversized')) result.fit = 'OVERSIZED';
      else if (fit.includes('slim')) result.fit = 'SLIM';
      else if (fit.includes('relaxed')) result.fit = 'RELAXED';
      else result.fit = 'REGULAR';
    }
  }
  result.description = stripHtml(html).replace(/\s+/g, ' ').slice(0, 1000);
  return result;
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function colorNameToHex(name: string): string {
  const map: Record<string, string> = {
    black: '#000000', white: '#FFFFFF', red: '#E53935', blue: '#1E88E5',
    navy: '#0D1B2A', green: '#43A047', yellow: '#FDD835', orange: '#FB8C00',
    pink: '#E91E63', purple: '#8E24AA', grey: '#757575', gray: '#757575',
    maroon: '#880E4F', brown: '#6D4C41', beige: '#F5F0E8', cream: '#FFFDD0',
    mint: '#98FF98', olive: '#808000', khaki: '#C3B091', coral: '#FF6B6B',
    teal: '#009688', cyan: '#00BCD4', lime: '#CDDC39', violet: '#7E57C2',
    indigo: '#3949AB', charcoal: '#36454F', offwhite: '#FAF9F6',
    swanwhite: '#F8F8F5', marshmallow: '#FEF9F0', fogg: '#B5C4B1',
    dusk: '#8B9BB4', salsa: '#E34234', aubergine: '#614051',
    royalblue: '#4169E1', 'royal blue': '#4169E1',
    'dutch canal': '#4682B4', rust: '#B7410E',
  };
  const lower = name.toLowerCase().trim();
  for (const [key, hex] of Object.entries(map)) {
    if (lower.includes(key)) return hex;
  }
  // Deterministic hash fallback
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return '#' + ((hash >>> 0) & 0xFFFFFF).toString(16).padStart(6, '0');
}

function colorNameToCode(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function detectOptionRoles(options: ShopifyOption[]): { sizeIdx: number | null; colorIdx: number | null } {
  let sizeIdx: number | null = null;
  let colorIdx: number | null = null;

  options.forEach((opt, idx) => {
    const name = opt.name.toLowerCase();
    if (name.includes('size')) sizeIdx = idx;
    else if (name.includes('color') || name.includes('colour')) colorIdx = idx;
  });

  if (sizeIdx === null && colorIdx === null) {
    options.forEach((opt, idx) => {
      const vals = opt.values.map(v => v.toUpperCase());
      if (vals.some(v => ['S', 'M', 'L', 'XL', 'XXL', 'XS', '2XL'].includes(v))) sizeIdx = idx;
      else colorIdx = idx;
    });
  }

  return { sizeIdx, colorIdx };
}

const STANDARD_SIZES: Record<string, { name: string; code: string; sortOrder: number }> = {
  'XS':  { name: 'Extra Small',          code: 'XS',  sortOrder: 0 },
  'S':   { name: 'Small',                code: 'S',   sortOrder: 1 },
  'M':   { name: 'Medium',               code: 'M',   sortOrder: 2 },
  'L':   { name: 'Large',                code: 'L',   sortOrder: 3 },
  'XL':  { name: 'Extra Large',          code: 'XL',  sortOrder: 4 },
  'XXL': { name: 'Double Extra Large',   code: 'XXL', sortOrder: 5 },
  '2XL': { name: 'Double Extra Large',   code: 'XXL', sortOrder: 5 },
  '3XL': { name: 'Triple Extra Large',   code: '3XL', sortOrder: 6 },
};

async function fetchCollectionProducts(handle: string): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let page = 1;

  console.log(`\n  📦 Fetching: ${BASE_URL}/collections/${handle}`);

  while (true) {
    const url = `${BASE_URL}/collections/${handle}/products.json?limit=${PAGE_SIZE}&page=${page}`;
    const raw = await fetchJson(url);

    let data: ShopifyProductsResponse;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error(`  ✗ Failed to parse JSON for ${handle} page ${page}`);
      break;
    }

    if (!data.products || data.products.length === 0) break;

    all.push(...data.products);
    console.log(`    Page ${page}: ${data.products.length} products (running total: ${all.length})`);

    if (data.products.length < PAGE_SIZE) break;
    page++;
    await sleep(REQUEST_DELAY_MS);
  }

  return all;
}

// ─── Caches to avoid duplicate lookups across all collections ─────────────────
const sizeCache  = new Map<string, string>(); // code → id
const colorCache = new Map<string, string>(); // normalized name → id
// Track all Shopify product IDs we've already imported to deduplicate across collections
const importedHandles = new Set<string>();

async function getOrCreateSize(raw: string): Promise<string | null> {
  const code = raw.toUpperCase().replace(/\s+/g, '').replace('2XL', 'XXL');
  if (sizeCache.has(code)) return sizeCache.get(code)!;

  const def = STANDARD_SIZES[code];
  if (!def) return null; // silently skip unknown sizes

  if (!DRY_RUN) {
    const size = await prisma.size.upsert({
      where: { code: def.code },
      update: {},
      create: { name: def.name, code: def.code, sortOrder: def.sortOrder, status: 'ACTIVE' },
    });
    sizeCache.set(code, size.id);
    return size.id;
  }
  sizeCache.set(code, `DRY-${code}`);
  return `DRY-${code}`;
}

async function getOrCreateColor(rawName: string): Promise<string | null> {
  const name = rawName.trim();
  if (!name) return null;

  const displayName = name
    .split(/\s+/)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  if (colorCache.has(displayName)) return colorCache.get(displayName)!;

  const hexCode = colorNameToHex(displayName);

  if (!DRY_RUN) {
    const existing = await prisma.color.findFirst({ where: { name: displayName } });
    if (existing) {
      colorCache.set(displayName, existing.id);
      return existing.id;
    }

    let code = colorNameToCode(displayName).slice(0, 6);
    const codeExists = await prisma.color.findFirst({ where: { code } });
    if (codeExists) {
      code = code.slice(0, 4) + Math.floor(Math.random() * 99).toString().padStart(2, '0');
    }

    const color = await prisma.color.create({
      data: { name: displayName, code, hexCode, status: 'ACTIVE' },
    });
    colorCache.set(displayName, color.id);
    return color.id;
  }

  colorCache.set(displayName, `DRY-${colorNameToCode(displayName)}`);
  return `DRY-${colorNameToCode(displayName)}`;
}

async function ensureCategory(name: string, slug: string): Promise<string> {
  if (DRY_RUN) return `DRY-${slug}`;

  const cat = await prisma.category.upsert({
    where: { slug },
    update: {},
    create: { name, slug, description: name, status: 'ACTIVE' },
  });
  return cat.id;
}

async function importProduct(
  sp: ShopifyProduct,
  categoryId: string,
  productType: string,
  productIndex: number,
  total: number,
): Promise<boolean> {
  // Skip already-imported (dedup across collections)
  if (importedHandles.has(sp.handle)) {
    console.log(`  [${productIndex}/${total}] ⏭️  Dup: "${sp.title}" (already imported)`);
    return false;
  }

  const { fabric, neckType, fit, description } = parseDescriptionTable(sp.body_html);
  const name = sp.title.trim();
  const baseSlug = toSlug(name);

  const firstVariant = sp.variants[0];
  if (!firstVariant) return false;

  const basePrice = parseFloat(firstVariant.price) || 0;
  const mrp = parseFloat(firstVariant.compare_at_price ?? firstVariant.price) || basePrice;
  if (basePrice <= 0) return false;

  const { sizeIdx, colorIdx } = detectOptionRoles(sp.options);
  const colorNames = colorIdx !== null ? sp.options[colorIdx]?.values ?? [] : ['Default'];
  const sizeCodes  = sizeIdx  !== null ? sp.options[sizeIdx]?.values  ?? [] : ['M'];

  const colorIdMap = new Map<string, string>();
  for (const cn of colorNames) {
    const id = await getOrCreateColor(cn);
    if (id) colorIdMap.set(cn, id);
  }

  const sizeIdMap = new Map<string, string>();
  for (const sc of sizeCodes) {
    const id = await getOrCreateSize(sc);
    if (id) sizeIdMap.set(sc, id);
  }

  if (colorIdMap.size === 0 || sizeIdMap.size === 0) return false;

  if (DRY_RUN) {
    console.log(`  [${productIndex}/${total}] [DRY] "${name}" ₹${basePrice}/₹${mrp} | ${sp.images.length} imgs`);
    importedHandles.add(sp.handle);
    return true;
  }

  // Check for slug collision
  const existing = await prisma.product.findUnique({ where: { slug: baseSlug } });
  if (existing) {
    console.log(`  [${productIndex}/${total}] ℹ️  Already exists: "${name}" — skipping`);
    importedHandles.add(sp.handle);
    return false;
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug: baseSlug,
      description: description || sp.tags || null,
      categoryId,
      productType,
      basePrice,
      mrp,
      status: 'ACTIVE',
      fabric: fabric || '100% Cotton',
      fit: fit || 'OVERSIZED',
      neckType: neckType || 'CREW',
      biowash: false,
    },
  });

  // Images
  for (let i = 0; i < sp.images.length; i++) {
    const img = sp.images[i];
    const imageUrl = img.src.split('?')[0];

    let colorId: string | null = null;
    if (img.variant_ids.length > 0 && colorIdx !== null) {
      const rel = sp.variants.find(v => img.variant_ids.includes(v.id));
      if (rel) {
        const vc = colorIdx === 0 ? rel.option1 : colorIdx === 1 ? rel.option2 : rel.option3;
        if (vc) colorId = colorIdMap.get(vc) ?? null;
      }
    }

    await prisma.productImage.create({
      data: {
        productId: product.id,
        imageUrl,
        imageType: i === 0 ? 'PRODUCT' : 'MODEL',
        sortOrder: i,
        isPrimary: i === 0,
        colorId,
      },
    });
  }

  // Variants
  let variantCount = 0;
  for (const [colorName, colorId] of colorIdMap.entries()) {
    for (const [sizeCode, sizeId] of sizeIdMap.entries()) {
      const sv = sp.variants.find(v => {
        const opts = [v.option1, v.option2, v.option3];
        const mc = colorIdx !== null ? opts[colorIdx]?.toLowerCase() === colorName.toLowerCase() : true;
        const ms = sizeIdx  !== null ? opts[sizeIdx]?.toUpperCase().replace('2XL', 'XXL') === sizeCode.toUpperCase().replace('2XL', 'XXL') : true;
        return mc && ms;
      });

      const variantPrice = sv ? parseFloat(sv.price) : basePrice;
      const stock = sv?.inventory_quantity ?? 10;
      const rawSku = sv?.sku || `${baseSlug}-${colorNameToCode(colorName)}-${sizeCode}`;
      const sku = rawSku.slice(0, 50);

      try {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            colorId,
            sizeId,
            sku,
            price: variantPrice !== basePrice ? variantPrice : null,
            stockQuantity: Math.max(stock, 0),
            status: 'ACTIVE',
          },
        });
        variantCount++;
      } catch (err: any) {
        if (err.code !== 'P2002') throw err;
      }
    }
  }

  console.log(`  [${productIndex}/${total}] ✅ "${name}" — ${sp.images.length} imgs, ${variantCount} variants`);
  importedHandles.add(sp.handle);
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Veirdo Multi-Collection Importer');
  if (DRY_RUN) console.log(' 🔵 DRY RUN — no DB writes');
  if (LIMIT !== Infinity) console.log(` 🔵 LIMIT: ${LIMIT} per collection`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let totalImported = 0;
  let totalSkipped  = 0;
  let totalFailed   = 0;

  for (const col of COLLECTIONS) {
    console.log(`\n${'═'.repeat(52)}`);
    console.log(` 📂 Collection: "${col.categoryName}"`);
    console.log(` 🔗 ${BASE_URL}/collections/${col.handle}`);
    console.log('═'.repeat(52));

    // Fetch
    const allProducts = await fetchCollectionProducts(col.handle);
    const products = LIMIT !== Infinity ? allProducts.slice(0, LIMIT) : allProducts;

    console.log(`  → ${products.length} products to import\n`);

    // Ensure category
    const categoryId = await ensureCategory(col.categoryName, col.categorySlug);
    console.log(`  Category ID: ${categoryId}\n`);

    let colImported = 0, colSkipped = 0, colFailed = 0;

    for (let i = 0; i < products.length; i++) {
      try {
        const ok = await importProduct(products[i], categoryId, col.productType, i + 1, products.length);
        if (ok) colImported++; else colSkipped++;
      } catch (err: any) {
        console.error(`  [${i + 1}/${products.length}] ✗ ${products[i].title}: ${err.message}`);
        colFailed++;
      }
      if (!DRY_RUN && i % 10 === 9) await sleep(150);
    }

    console.log(`\n  ─── "${col.categoryName}" done: ✅ ${colImported} imported | ⏭️ ${colSkipped} skipped | ❌ ${colFailed} failed`);
    totalImported += colImported;
    totalSkipped  += colSkipped;
    totalFailed   += colFailed;

    // Delay between collections
    if (!DRY_RUN) await sleep(500);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(` TOTAL ACROSS ALL COLLECTIONS`);
  console.log(` ✅ Imported : ${totalImported}`);
  console.log(` ⏭️  Skipped  : ${totalSkipped}`);
  console.log(` ❌ Failed   : ${totalFailed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(err => { console.error('\n💥 Fatal:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
