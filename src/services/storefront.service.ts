import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import {
  SetFeaturedProductsInput,
  UpdateStorefrontSettingsInput,
} from '../validation/storefront.validation';

const SETTINGS_ID = 'default';

const DEFAULT_SETTINGS = {
  announcementText: 'Free Express Shipping Over ₹399 • 3-Day Easy Exchange',
  heroTitle: 'Premium Oversized & Streetwear T-Shirts in India',
  heroSubtitle:
    'Refined apparel crafted from exceptional fabrics, built for everyday wear. Designed by KAIIRA.',
};

export async function getStorefrontSettings() {
  const setting = await prisma.storefrontSetting.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS },
  });

  // If maintenance mode is enabled and the expected end time has arrived/passed,
  // automatically disable maintenance mode in the database!
  if (setting.isMaintenance && setting.maintenanceUntil) {
    if (new Date() >= new Date(setting.maintenanceUntil)) {
      return prisma.storefrontSetting.update({
        where: { id: SETTINGS_ID },
        data: {
          isMaintenance: false,
          maintenanceUntil: null,
        },
      });
    }
  }

  return setting;
}

export async function updateStorefrontSettings(input: UpdateStorefrontSettingsInput) {
  await getStorefrontSettings();
  const data: Record<string, any> = { ...input };
  if (input.maintenanceUntil !== undefined) {
    data.maintenanceUntil = input.maintenanceUntil ? new Date(input.maintenanceUntil) : null;
  }
  return prisma.storefrontSetting.update({
    where: { id: SETTINGS_ID },
    data,
  });
}

const featuredProductInclude = {
  product: {
    include: {
      category: true,
      images: true,
      variants: { where: { status: 'ACTIVE' }, select: { color: true, stockQuantity: true } },
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
    const colorMap = new Map<string, NonNullable<(typeof variants)[number]['color']>>();
    for (const variant of variants) {
      if (variant.color) colorMap.set(variant.color.id, variant.color);
    }
    const inStock = variants.some((v) => v.stockQuantity > 0);
    return { ...featured, product: { ...productRest, colors: [...colorMap.values()], inStock } };
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
