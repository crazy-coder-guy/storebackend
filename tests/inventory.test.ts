import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/database/prisma';
import { uniqueSuffix } from './helpers';

describe('Inventory', () => {
  const suffix = uniqueSuffix();
  let categoryId: string;
  let productId: string;
  let colorId: string;
  let sizeId: string;
  let variantId: string;
  let zeroStockVariantId: string;
  let secondSizeId: string;

  beforeAll(async () => {
    const category = await prisma.category.create({
      data: { name: `Inv Test Category ${suffix}`, slug: `inv-test-cat-${suffix}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        name: `Inv Test Product ${suffix}`,
        slug: `inv-test-product-${suffix}`,
        categoryId,
        productType: 'T-Shirt',
        basePrice: 500,
        mrp: 700,
        status: 'ACTIVE',
      },
    });
    productId = product.id;

    const color = await prisma.color.create({
      data: { name: `Inv Color ${suffix}`, code: `IC${suffix}`.slice(0, 20), hexCode: '#654321' },
    });
    colorId = color.id;

    const size = await prisma.size.create({
      data: { name: `Inv Size ${suffix}`, code: `IS${suffix}`.slice(0, 20), sortOrder: 1 },
    });
    sizeId = size.id;

    const size2 = await prisma.size.create({
      data: { name: `Inv Size 2 ${suffix}`, code: `IS2${suffix}`.slice(0, 20), sortOrder: 2 },
    });
    secondSizeId = size2.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        colorId,
        sizeId,
        sku: `INV-TEST-${suffix}`,
        stockQuantity: 5,
        status: 'ACTIVE',
      },
    });
    variantId = variant.id;

    const zeroVariant = await prisma.productVariant.create({
      data: {
        productId,
        colorId,
        sizeId: secondSizeId,
        sku: `INV-TEST-ZERO-${suffix}`,
        stockQuantity: 0,
        status: 'ACTIVE',
      },
    });
    zeroStockVariantId = zeroVariant.id;
  });

  afterAll(async () => {
    await prisma.inventoryTransaction.deleteMany({
      where: { variantId: { in: [variantId, zeroStockVariantId] } },
    });
    await prisma.productVariant.deleteMany({ where: { id: { in: [variantId, zeroStockVariantId] } } });
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    await prisma.color.delete({ where: { id: colorId } }).catch(() => undefined);
    await prisma.size.delete({ where: { id: sizeId } }).catch(() => undefined);
    await prisma.size.delete({ where: { id: secondSizeId } }).catch(() => undefined);
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  });

  it('restocks a variant and records a transaction', async () => {
    const res = await request(app)
      .patch(`/api/v1/inventory/${variantId}`)
      .send({ type: 'RESTOCK', quantity: 10, reason: 'New stock delivery' });

    expect(res.status).toBe(200);
    expect(res.body.data.variant.stockQuantity).toBe(15);
    expect(res.body.data.transaction.previousStock).toBe(5);
    expect(res.body.data.transaction.newStock).toBe(15);
    expect(res.body.data.transaction.transactionType).toBe('RESTOCK');
  });

  it('decreases stock manually', async () => {
    const res = await request(app)
      .patch(`/api/v1/inventory/${variantId}`)
      .send({ type: 'MANUAL_DECREASE', quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.variant.stockQuantity).toBe(10);
    expect(res.body.data.transaction.transactionType).toBe('MANUAL_DECREASE');
  });

  it('rejects a decrease that would go negative', async () => {
    const res = await request(app)
      .patch(`/api/v1/inventory/${variantId}`)
      .send({ type: 'MANUAL_DECREASE', quantity: 1000 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('returns the transaction history newest first', async () => {
    const res = await request(app).get(`/api/v1/inventory/${variantId}/history`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.items[0].transactionType).toBe('MANUAL_DECREASE');
  });

  it('lists only low-stock variants at/under threshold', async () => {
    const res = await request(app).get('/api/v1/inventory/low-stock').query({ threshold: 10 });
    expect(res.status).toBe(200);
    const ids = res.body.data.map((v: { id: string }) => v.id);
    expect(ids).toContain(variantId);
    expect(ids).toContain(zeroStockVariantId);
    for (const v of res.body.data) {
      expect(v.stockQuantity).toBeLessThanOrEqual(10);
    }
  });

  it('lists only out-of-stock variants', async () => {
    const res = await request(app).get('/api/v1/inventory/out-of-stock');
    expect(res.status).toBe(200);
    const ids = res.body.data.map((v: { id: string }) => v.id);
    expect(ids).toContain(zeroStockVariantId);
    expect(ids).not.toContain(variantId);
    for (const v of res.body.data) {
      expect(v.stockQuantity).toBe(0);
    }
  });
});
