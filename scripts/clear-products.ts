/**
 * clear-products.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Wipes all scraped product data from the DB:
 *   product_images → product_variants → products → colors → categories
 *
 * Does NOT delete: sizes, users, orders, reviews, carts, storefront_settings
 *
 * Usage:
 *   npx ts-node scripts/clear-products.ts
 *   npx ts-node scripts/clear-products.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' DB Product Cleanup');
  if (DRY_RUN) console.log(' 🔵 DRY RUN — no DB writes');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Count before
  const productCount  = await prisma.product.count();
  const imageCount    = await prisma.productImage.count();
  const variantCount  = await prisma.productVariant.count();
  const colorCount    = await prisma.color.count();
  const categoryCount = await prisma.category.count();

  console.log('Current counts:');
  console.log(`  Products        : ${productCount}`);
  console.log(`  Product Images  : ${imageCount}`);
  console.log(`  Product Variants: ${variantCount}`);
  console.log(`  Colors          : ${colorCount}`);
  console.log(`  Categories      : ${categoryCount}`);
  console.log();

  if (DRY_RUN) {
    console.log('🔵 DRY RUN — would delete all of the above. Exiting.');
    return;
  }

  console.log('🗑️  Deleting featured products...');
  const fp = await prisma.featuredProduct.deleteMany({});
  console.log(`   → ${fp.count} deleted`);

  console.log('🗑️  Deleting favorites...');
  const fav = await prisma.favorite.deleteMany({});
  console.log(`   → ${fav.count} deleted`);

  console.log('🗑️  Deleting cart items (linked to variants)...');
  const ci = await prisma.cartItem.deleteMany({});
  console.log(`   → ${ci.count} deleted`);

  console.log('🗑️  Deleting reviews...');
  const rv = await prisma.review.deleteMany({});
  console.log(`   → ${rv.count} deleted`);

  console.log('🗑️  Deleting order items (linked to variants)...');
  const oi = await prisma.orderItem.deleteMany({});
  console.log(`   → ${oi.count} deleted`);

  console.log('🗑️  Deleting product images...');
  const pi = await prisma.productImage.deleteMany({});
  console.log(`   → ${pi.count} deleted`);

  console.log('🗑️  Deleting product variants...');
  const pv = await prisma.productVariant.deleteMany({});
  console.log(`   → ${pv.count} deleted`);

  console.log('🗑️  Deleting products...');
  const pr = await prisma.product.deleteMany({});
  console.log(`   → ${pr.count} deleted`);

  console.log('🗑️  Deleting colors...');
  const co = await prisma.color.deleteMany({});
  console.log(`   → ${co.count} deleted`);

  console.log('🗑️  Deleting categories...');
  const ca = await prisma.category.deleteMany({});
  console.log(`   → ${ca.count} deleted`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' ✅ DB cleared. Ready for fresh import.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(err => { console.error('\n💥 Fatal:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
