/**
 * seed-veirdo.ts — Auto-generated on 2026-09-25T16:22:31.149Z
 * Recreates all 820 products from the Veirdo import.
 *
 * Usage:
 *   npx ts-node scripts/clear-products.ts   # wipe DB first
 *   npx ts-node prisma/seed-veirdo.ts       # restore everything
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf-8'));
  const { categories, colors, sizes, products } = data;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Veirdo Seed — Restoring ' + products.length + ' products');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Categories
  console.log('📂 Seeding categories...');
  const catIdMap = new Map();
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug, description: cat.description, status: cat.status },
    });
    catIdMap.set(cat.id, c.id);
  }
  console.log('  ✅ ' + categories.length + ' categories');

  // 2. Sizes
  console.log('📏 Seeding sizes...');
  const sizeIdMap = new Map();
  for (const sz of sizes) {
    const s = await prisma.size.upsert({
      where: { code: sz.code },
      update: {},
      create: { name: sz.name, code: sz.code, sortOrder: sz.sortOrder, status: sz.status },
    });
    sizeIdMap.set(sz.id, s.id);
  }
  console.log('  ✅ ' + sizes.length + ' sizes');

  // 3. Colors
  console.log('🎨 Seeding colors...');
  const colorIdMap = new Map();
  for (const cl of colors) {
    const existing = await prisma.color.findFirst({ where: { name: cl.name } });
    if (existing) { colorIdMap.set(cl.id, existing.id); continue; }
    const codeExists = await prisma.color.findFirst({ where: { code: cl.code } });
    const finalCode = codeExists ? cl.code.slice(0,4) + Math.floor(Math.random()*99).toString().padStart(2,'0') : cl.code;
    const c = await prisma.color.create({
      data: { name: cl.name, code: finalCode, hexCode: cl.hexCode, status: cl.status },
    });
    colorIdMap.set(cl.id, c.id);
  }
  console.log('  ✅ ' + colors.length + ' colors');

  // 4. Products
  console.log('\n📦 Seeding ' + products.length + ' products...');
  let imported = 0, skipped = 0;
  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) { skipped++; continue; }

    const product = await prisma.product.create({
      data: {
        name: p.name, slug: p.slug, description: p.description,
        categoryId: catIdMap.get(p.categoryId) ?? p.categoryId,
        productType: p.productType,
        basePrice: p.basePrice, mrp: p.mrp,
        status: p.status, badge: p.badge,
        fabric: p.fabric, fit: p.fit, neckType: p.neckType,
        gsm: p.gsm, biowash: p.biowash,
      },
    });

    for (const img of p.images) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          imageUrl: img.imageUrl,
          imageType: img.imageType,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
          colorId: img.colorId ? (colorIdMap.get(img.colorId) ?? null) : null,
        },
      });
    }

    for (const v of p.variants) {
      const colorId = colorIdMap.get(v.colorId);
      const sizeId  = sizeIdMap.get(v.sizeId);
      if (!colorId || !sizeId) continue;
      try {
        await prisma.productVariant.create({
          data: {
            productId: product.id, colorId, sizeId,
            sku: v.sku, price: v.price,
            stockQuantity: v.stockQuantity, status: v.status, badge: v.badge,
          },
        });
      } catch(e: any) { if (e.code !== 'P2002') throw e; }
    }

    imported++;
    if (imported % 50 === 0) console.log('  → ' + imported + '/' + products.length + ' done...');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' ✅ Imported : ' + imported);
  console.log(' ⏭️  Skipped  : ' + skipped);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(err => { console.error('Fatal:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());