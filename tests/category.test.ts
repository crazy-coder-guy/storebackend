import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/database/prisma';
import { uniqueSuffix } from './helpers';

describe('Categories', () => {
  const suffix = uniqueSuffix();
  const categoryName = `Test Category ${suffix}`;
  const categorySlug = `test-category-${suffix}`;
  let categoryId: string;

  afterAll(async () => {
    if (categoryId) {
      await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
    }
  });

  it('creates a category', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .send({ name: categoryName, slug: categorySlug });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe(categorySlug);
    categoryId = res.body.data.id;
  });

  it('rejects a duplicate slug', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .send({ name: `${categoryName} dup`, slug: categorySlug });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_SLUG');
  });

  it('fetches the category by id', async () => {
    const res = await request(app).get(`/api/v1/categories/${categoryId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(categoryId);
  });
});
