/**
 * generate-seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads the entire current DB state and writes two files:
 *   1. prisma/seed-data.json  — raw data snapshot (fast to re-read)
 *   2. prisma/seed-veirdo.ts  — runnable TypeScript seed that recreates everything
 *
 * Usage:
 *   npx ts-node scripts/generate-seed.ts
 *
 * To re-seed from scratch:
 *   npx ts-node scripts/clear-products.ts
 *   npx ts-node prisma/seed-veirdo.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Seed File Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Fetch everything ──────────────────────────────────────────────────────
  console.log('📖 Reading DB...');

  const categories = await prisma.category.findMany({ orderBy: { createdAt: 'asc' } });
  const colors     = await prisma.color.findMany({ orderBy: { name: 'asc' } });
  const sizes      = await prisma.size.findMany({ orderBy: { sortOrder: 'asc' } });
  const products   = await prisma.product.findMany({
    include: {
      images:   { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`  Categories : ${categories.length}`);
  console.log(`  Colors     : ${colors.length}`);
  console.log(`  Sizes      : ${sizes.length}`);
  console.log(`  Products   : ${products.length}`);
  console.log(`  Images     : ${products.reduce((s, p) => s + p.images.length, 0)}`);
  console.log(`  Variants   : ${products.reduce((s, p) => s + p.variants.length, 0)}`);

  // ── Build JSON snapshot ───────────────────────────────────────────────────
  const snapshot = { categories, colors, sizes, products };
  const jsonPath = path.join(__dirname, '..', 'prisma', 'seed-data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`\n✅ JSON snapshot written: prisma/seed-data.json (${(fs.statSync(jsonPath).size / 1024).toFixed(1)} KB)`);

  // ── Generate seed-veirdo.ts ────────────────────────────────────────────────
  console.log('\n🔨 Generating prisma/seed-veirdo.ts ...');

  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * seed-veirdo.ts — Auto-generated on ${new Date().toISOString()}`);
  lines.push(` * Recreates all ${products.length} products from the Veirdo import.`);
  lines.push(` *`);
  lines.push(` * Usage:`);
  lines.push(` *   npx ts-node scripts/clear-products.ts   # wipe DB first`);
  lines.push(` *   npx ts-node prisma/seed-veirdo.ts       # restore everything`);
  lines.push(` */`);
  lines.push(`import { PrismaClient } from '@prisma/client';`);
  lines.push(`import * as dotenv from 'dotenv';`);
  lines.push(`import * as path from 'path';`);
  lines.push(`import * as fs from 'fs';`);
  lines.push(`dotenv.config({ path: path.join(__dirname, '..', '.env') });`);
  lines.push(`const prisma = new PrismaClient();`);
  lines.push(``);
  lines.push(`async function main() {`);
  lines.push(`  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf-8'));`);
  lines.push(`  const { categories, colors, sizes, products } = data;`);
  lines.push(``);
  lines.push(`  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');`);
  lines.push(`  console.log(' Veirdo Seed — Restoring ' + products.length + ' products');`);
  lines.push(`  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n');`);
  lines.push(``);
  lines.push(`  // 1. Categories`);
  lines.push(`  console.log('📂 Seeding categories...');`);
  lines.push(`  const catIdMap = new Map();`);
  lines.push(`  for (const cat of categories) {`);
  lines.push(`    const c = await prisma.category.upsert({`);
  lines.push(`      where: { slug: cat.slug },`);
  lines.push(`      update: {},`);
  lines.push(`      create: { name: cat.name, slug: cat.slug, description: cat.description, status: cat.status },`);
  lines.push(`    });`);
  lines.push(`    catIdMap.set(cat.id, c.id);`);
  lines.push(`  }`);
  lines.push(`  console.log('  ✅ ' + categories.length + ' categories');`);
  lines.push(``);
  lines.push(`  // 2. Sizes`);
  lines.push(`  console.log('📏 Seeding sizes...');`);
  lines.push(`  const sizeIdMap = new Map();`);
  lines.push(`  for (const sz of sizes) {`);
  lines.push(`    const s = await prisma.size.upsert({`);
  lines.push(`      where: { code: sz.code },`);
  lines.push(`      update: {},`);
  lines.push(`      create: { name: sz.name, code: sz.code, sortOrder: sz.sortOrder, status: sz.status },`);
  lines.push(`    });`);
  lines.push(`    sizeIdMap.set(sz.id, s.id);`);
  lines.push(`  }`);
  lines.push(`  console.log('  ✅ ' + sizes.length + ' sizes');`);
  lines.push(``);
  lines.push(`  // 3. Colors`);
  lines.push(`  console.log('🎨 Seeding colors...');`);
  lines.push(`  const colorIdMap = new Map();`);
  lines.push(`  for (const cl of colors) {`);
  lines.push(`    const existing = await prisma.color.findFirst({ where: { name: cl.name } });`);
  lines.push(`    if (existing) { colorIdMap.set(cl.id, existing.id); continue; }`);
  lines.push(`    const codeExists = await prisma.color.findFirst({ where: { code: cl.code } });`);
  lines.push(`    const finalCode = codeExists ? cl.code.slice(0,4) + Math.floor(Math.random()*99).toString().padStart(2,'0') : cl.code;`);
  lines.push(`    const c = await prisma.color.create({`);
  lines.push(`      data: { name: cl.name, code: finalCode, hexCode: cl.hexCode, status: cl.status },`);
  lines.push(`    });`);
  lines.push(`    colorIdMap.set(cl.id, c.id);`);
  lines.push(`  }`);
  lines.push(`  console.log('  ✅ ' + colors.length + ' colors');`);
  lines.push(``);
  lines.push(`  // 4. Products`);
  lines.push(`  console.log('\\n📦 Seeding ' + products.length + ' products...');`);
  lines.push(`  let imported = 0, skipped = 0;`);
  lines.push(`  for (const p of products) {`);
  lines.push(`    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });`);
  lines.push(`    if (existing) { skipped++; continue; }`);
  lines.push(``);
  lines.push(`    const product = await prisma.product.create({`);
  lines.push(`      data: {`);
  lines.push(`        name: p.name, slug: p.slug, description: p.description,`);
  lines.push(`        categoryId: catIdMap.get(p.categoryId) ?? p.categoryId,`);
  lines.push(`        productType: p.productType,`);
  lines.push(`        basePrice: p.basePrice, mrp: p.mrp,`);
  lines.push(`        status: p.status, badge: p.badge,`);
  lines.push(`        fabric: p.fabric, fit: p.fit, neckType: p.neckType,`);
  lines.push(`        gsm: p.gsm, biowash: p.biowash,`);
  lines.push(`      },`);
  lines.push(`    });`);
  lines.push(``);
  lines.push(`    for (const img of p.images) {`);
  lines.push(`      await prisma.productImage.create({`);
  lines.push(`        data: {`);
  lines.push(`          productId: product.id,`);
  lines.push(`          imageUrl: img.imageUrl,`);
  lines.push(`          imageType: img.imageType,`);
  lines.push(`          sortOrder: img.sortOrder,`);
  lines.push(`          isPrimary: img.isPrimary,`);
  lines.push(`          colorId: img.colorId ? (colorIdMap.get(img.colorId) ?? null) : null,`);
  lines.push(`        },`);
  lines.push(`      });`);
  lines.push(`    }`);
  lines.push(``);
  lines.push(`    for (const v of p.variants) {`);
  lines.push(`      const colorId = colorIdMap.get(v.colorId);`);
  lines.push(`      const sizeId  = sizeIdMap.get(v.sizeId);`);
  lines.push(`      if (!colorId || !sizeId) continue;`);
  lines.push(`      try {`);
  lines.push(`        await prisma.productVariant.create({`);
  lines.push(`          data: {`);
  lines.push(`            productId: product.id, colorId, sizeId,`);
  lines.push(`            sku: v.sku, price: v.price,`);
  lines.push(`            stockQuantity: v.stockQuantity, status: v.status, badge: v.badge,`);
  lines.push(`          },`);
  lines.push(`        });`);
  lines.push(`      } catch(e: any) { if (e.code !== 'P2002') throw e; }`);
  lines.push(`    }`);
  lines.push(``);
  lines.push(`    imported++;`);
  lines.push(`    if (imported % 50 === 0) console.log('  → ' + imported + '/' + products.length + ' done...');`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  console.log('\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');`);
  lines.push(`  console.log(' ✅ Imported : ' + imported);`);
  lines.push(`  console.log(' ⏭️  Skipped  : ' + skipped);`);
  lines.push(`  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`main()`);
  lines.push(`  .catch(err => { console.error('Fatal:', err); process.exit(1); })`);
  lines.push(`  .finally(() => prisma.$disconnect());`);

  const seedPath = path.join(__dirname, '..', 'prisma', 'seed-veirdo.ts');
  fs.writeFileSync(seedPath, lines.join('\n'), 'utf-8');

  const jsonSize = (fs.statSync(jsonPath).size / 1024 / 1024).toFixed(2);
  const tsSize   = (fs.statSync(seedPath).size / 1024).toFixed(1);

  console.log(`✅ Seed TS written:   prisma/seed-veirdo.ts (${tsSize} KB)`);
  console.log(`✅ Seed JSON written: prisma/seed-data.json (${jsonSize} MB)`);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(` To restore from scratch:`);
  console.log(`   npx ts-node scripts/clear-products.ts`);
  console.log(`   npx ts-node prisma/seed-veirdo.ts`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main()
  .catch(err => { console.error('\n💥 Fatal:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
