/**
 * fix-duplicates.ts
 * Finds and removes duplicate products, then exports everything to a seed JSON.
 * 
 * Usage:
 *   npx ts-node scripts/fix-duplicates.ts --dry-run   # preview only
 *   npx ts-node scripts/fix-duplicates.ts             # delete duplicates
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

function normalizeForDup(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/t-shirt/g, 'tshirt')
    .replace(/tshirt/g, 'tshirt')
    .replace(/hoody/g, 'hoodie')
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Duplicate Finder & Cleaner');
  if (DRY_RUN) console.log(' 🔵 DRY RUN — no DB writes');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Fetch all products with image/variant counts
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { images: true, variants: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total products in DB: ${products.length}`);

  // Group by normalized name
  const nameMap = new Map<string, typeof products>();
  for (const p of products) {
    const key = normalizeForDup(p.name);
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push(p);
  }

  const dupGroups = [...nameMap.entries()].filter(([, v]) => v.length > 1);
  console.log(`Duplicate groups found: ${dupGroups.length}\n`);

  if (dupGroups.length === 0) {
    console.log('✅ No duplicates found! DB is clean.');
    return;
  }

  const toDelete: string[] = [];

  for (const [, group] of dupGroups) {
    // Keep the one with the most images (best data), break ties by most variants, then oldest
    const sorted = group.sort((a, b) => {
      if (b._count.images !== a._count.images) return b._count.images - a._count.images;
      if (b._count.variants !== a._count.variants) return b._count.variants - a._count.variants;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const keep = sorted[0];
    const remove = sorted.slice(1);

    console.log(`  KEEP   → "${keep.name}" (${keep._count.images} imgs, ${keep._count.variants} variants)`);
    remove.forEach(r => {
      console.log(`  DELETE → "${r.name}" (${r._count.images} imgs, ${r._count.variants} variants)`);
      toDelete.push(r.id);
    });
    console.log();
  }

  console.log(`\nTotal to delete: ${toDelete.length} products`);

  if (DRY_RUN) {
    console.log('🔵 DRY RUN — skipping deletion.');
    return;
  }

  // Delete in proper order (cascade handles images/variants/favorites)
  // But we need to clear cart items and order items first
  console.log('\n🗑️  Cleaning up linked records...');
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: toDelete } },
    select: { id: true },
  });
  const variantIds = variants.map(v => v.id);

  if (variantIds.length > 0) {
    await prisma.cartItem.deleteMany({ where: { variantId: { in: variantIds } } });
    await prisma.orderItem.deleteMany({ where: { variantId: { in: variantIds } } });
  }
  await prisma.favorite.deleteMany({ where: { productId: { in: toDelete } } });
  await prisma.featuredProduct.deleteMany({ where: { productId: { in: toDelete } } });
  await prisma.productImage.deleteMany({ where: { productId: { in: toDelete } } });
  await prisma.productVariant.deleteMany({ where: { productId: { in: toDelete } } });

  const deleted = await prisma.product.deleteMany({ where: { id: { in: toDelete } } });
  console.log(`✅ Deleted ${deleted.count} duplicate products.\n`);

  const remaining = await prisma.product.count();
  console.log(`📦 Products remaining in DB: ${remaining}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(` ✅ Done. ${deleted.count} duplicates removed.`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(err => { console.error('\n💥 Fatal:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
