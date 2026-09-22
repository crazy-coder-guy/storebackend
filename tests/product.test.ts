import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/database/prisma';
import { uniqueSuffix } from './helpers';

describe('Products', () => {
  const suffix = uniqueSuffix();
  const categorySlug = `test-product-cat-${suffix}`;
  let categoryId: string;
  const productIds: string[] = [];

  beforeAll(async () => {
    const category = await prisma.category.create({
      data: { name: `Product Test Category ${suffix}`, slug: categorySlug },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    if (productIds.length) {
      await prisma.product.deleteMany({ where: { id: { in: productIds } } }).catch(() => undefined);
    }
    if (categoryId) {
      await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
    }
  });

  it('creates a product', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .send({
        name: `Alpha Tee ${suffix}`,
        slug: `alpha-tee-${suffix}`,
        categoryId,
        productType: 'T-Shirt',
        basePrice: 500,
        mrp: 700,
        status: 'ACTIVE',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.categoryId).toBe(categoryId);
    productIds.push(res.body.data.id);
  });

  it('creates a second product for listing/filtering tests', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .send({
        name: `Beta Tee ${suffix}`,
        slug: `beta-tee-${suffix}`,
        categoryId,
        productType: 'T-Shirt',
        basePrice: 900,
        mrp: 1100,
        status: 'ACTIVE',
      });

    expect(res.status).toBe(201);
    productIds.push(res.body.data.id);
  });

  it('lists products filtered by category with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .query({ category_id: categoryId, page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(2);
    expect(res.body.data.meta.total).toBe(2);
  });

  it('searches products by name', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .query({ search: `Alpha Tee ${suffix}` });

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].name).toBe(`Alpha Tee ${suffix}`);
  });

  it('sorts products by base_price desc', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .query({ category_id: categoryId, sortBy: 'base_price', sortOrder: 'desc' });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].name).toBe(`Beta Tee ${suffix}`);
  });
});
