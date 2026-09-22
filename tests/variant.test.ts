import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/database/prisma';
import { uniqueSuffix } from './helpers';

describe('Product Variants', () => {
  const suffix = uniqueSuffix();
  let categoryId: string;
  let productId: string;
  let colorId: string;
  let sizeId: string;
  let secondSizeId: string;
  const variantIds: string[] = [];

  beforeAll(async () => {
    const category = await prisma.category.create({
      data: { name: `Variant Test Category ${suffix}`, slug: `variant-test-cat-${suffix}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        name: `Variant Test Product ${suffix}`,
        slug: `variant-test-product-${suffix}`,
        categoryId,
        productType: 'T-Shirt',
        basePrice: 500,
        mrp: 700,
        status: 'ACTIVE',
      },
    });
    productId = product.id;

    const color = await prisma.color.create({
      data: { name: `Test Color ${suffix}`, code: `TC${suffix}`.slice(0, 20), hexCode: '#123456' },
    });
    colorId = color.id;

    const size = await prisma.size.create({
      data: { name: `Test Size ${suffix}`, code: `TS${suffix}`.slice(0, 20), sortOrder: 1 },
    });
    sizeId = size.id;

    const size2 = await prisma.size.create({
      data: { name: `Test Size 2 ${suffix}`, code: `TS2${suffix}`.slice(0, 20), sortOrder: 2 },
    });
    secondSizeId = size2.id;
  });

  afterAll(async () => {
    if (variantIds.length) {
      await prisma.productVariant.deleteMany({ where: { id: { in: variantIds } } }).catch(() => undefined);
    }
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    await prisma.color.delete({ where: { id: colorId } }).catch(() => undefined);
    await prisma.size.delete({ where: { id: sizeId } }).catch(() => undefined);
    await prisma.size.delete({ where: { id: secondSizeId } }).catch(() => undefined);
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  });

  it('creates a variant with an auto-generated SKU', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${productId}/variants`)
      .send({ colorId, sizeId, stockQuantity: 10 });

    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBeTruthy();
    variantIds.push(res.body.data.id);
  });

  it('rejects a duplicate product/color/size combination', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${productId}/variants`)
      .send({ colorId, sizeId, stockQuantity: 5 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_VARIANT');
  });

  it('rejects a duplicate explicit SKU', async () => {
    const existing = await prisma.productVariant.findFirst({ where: { id: variantIds[0] } });
    const res = await request(app)
      .post(`/api/v1/products/${productId}/variants`)
      .send({ colorId, sizeId: secondSizeId, sku: existing?.sku });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_SKU');
  });
});
