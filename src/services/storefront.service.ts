import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import {
  SetFeaturedProductsInput,
  UpdateStorefrontSettingsInput,
} from '../validation/storefront.validation';

const SETTINGS_ID = 'default';

const DEFAULT_SETTINGS = {
  announcementText: 'Free Express Shipping Over ₹1,999 • 7-Day Easy Returns',
  heroTitle: 'Modern Essentials for Everyday Style',
  heroSubtitle:
    'Refined apparel crafted from exceptional fabrics, built for everyday wear. Designed by Kaiira.',
};

export async function getStorefrontSettings() {
  return prisma.storefrontSetting.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS },
  });
}

export async function updateStorefrontSettings(input: UpdateStorefrontSettingsInput) {
  await getStorefrontSettings();
  return prisma.storefrontSetting.update({
    where: { id: SETTINGS_ID },
    data: input,
  });
}

const featuredProductInclude = {
  product: {
    include: {
      category: true,
      images: true,
      variants: { where: { status: 'ACTIVE' }, select: { color: true } },
    },
  },
} as const;

export async function listFeaturedProducts() {
  const rows = await prisma.featuredProduct.findMany({
    include: featuredProductInclude,
    orderBy: { sortOrder: 'asc' },
  });

  return rows.map(({ product, ...featured }) => {
    const { variants, ...productRest } = product;
    const colorMap = new Map<string, (typeof variants)[number]['color']>();
    for (const variant of variants) {
      if (variant.color) colorMap.set(variant.color.id, variant.color);
    }
    return { ...featured, product: { ...productRest, colors: [...colorMap.values()] } };
  });
}

export async function setFeaturedProducts(input: SetFeaturedProductsInput) {
  const productIds = [...new Set(input.productIds)];

  if (productIds.length > 0) {
    const existing = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    if (existing.length !== productIds.length) {
      const foundIds = new Set(existing.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      throw new AppError(404, 'NOT_FOUND', `Product(s) not found: ${missing.join(', ')}`);
    }
  }

  await prisma.$transaction([
    prisma.featuredProduct.deleteMany({}),
    ...productIds.map((productId, index) =>
      prisma.featuredProduct.create({
        data: { productId, sortOrder: index },
      })
    ),
  ]);

  return listFeaturedProducts();
}
