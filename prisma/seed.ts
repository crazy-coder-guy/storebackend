import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertCategory(name: string, slug: string, description: string) {
  return prisma.category.upsert({
    where: { slug },
    update: {},
    create: { name, slug, description, status: 'ACTIVE' },
  });
}

async function upsertSize(name: string, code: string, sortOrder: number) {
  return prisma.size.upsert({
    where: { code },
    update: {},
    create: { name, code, sortOrder, status: 'ACTIVE' },
  });
}

async function upsertColor(name: string, code: string, hexCode: string) {
  return prisma.color.upsert({
    where: { code },
    update: {},
    create: { name, code, hexCode, status: 'ACTIVE' },
  });
}

async function main() {
  console.log('Seeding categories...');
  const [oversized, regular, polo, women, sweatshirts] = await Promise.all([
    upsertCategory('Oversized', 'oversized', 'Oversized fit t-shirts'),
    upsertCategory('Regular Fit', 'regular-fit', 'Regular fit t-shirts'),
    upsertCategory('Polo', 'polo', 'Polo t-shirts'),
    upsertCategory('Women', 'women', "Women's t-shirts"),
    upsertCategory('Sweatshirts', 'sweatshirts', 'Sweatshirts and hoodies'),
  ]);

  console.log('Seeding sizes...');
  const [s, m, l, xl, xxl] = await Promise.all([
    upsertSize('Small', 'S', 1),
    upsertSize('Medium', 'M', 2),
    upsertSize('Large', 'L', 3),
    upsertSize('Extra Large', 'XL', 4),
    upsertSize('Double Extra Large', 'XXL', 5),
  ]);

  console.log('Seeding colors...');
  const [black, white, red, purple, yellow] = await Promise.all([
    upsertColor('Black', 'BLK', '#000000'),
    upsertColor('White', 'WHT', '#FFFFFF'),
    upsertColor('Red', 'RED', '#FF0000'),
    upsertColor('Purple', 'PUR', '#800080'),
    upsertColor('Yellow', 'YLW', '#FFFF00'),
  ]);

  console.log('Seeding products...');

  const productsData = [
    {
      name: 'Kai Oversized Vest',
      slug: 'kai-oversized-vest',
      description: 'A relaxed oversized vest tee in premium cotton.',
      categoryId: oversized.id,
      productType: 'T-Shirt',
      basePrice: 799,
      mrp: 999,
      status: 'ACTIVE' as const,
      colors: [black, white],
      sizes: [s, m, l],
      images: [
        { imageUrl: 'https://picsum.photos/seed/kai-oversized-1/800/1000', imageType: 'PRODUCT' as const, sortOrder: 0, isPrimary: true },
        { imageUrl: 'https://picsum.photos/seed/kai-oversized-2/800/1000', imageType: 'MODEL' as const, sortOrder: 1, isPrimary: false },
      ],
    },
    {
      name: 'Classic Regular Tee',
      slug: 'classic-regular-tee',
      description: 'A wardrobe staple regular-fit crew neck tee.',
      categoryId: regular.id,
      productType: 'T-Shirt',
      basePrice: 599,
      mrp: 799,
      status: 'ACTIVE' as const,
      colors: [red, purple],
      sizes: [m, l, xl],
      images: [
        { imageUrl: 'https://picsum.photos/seed/classic-regular-1/800/1000', imageType: 'PRODUCT' as const, sortOrder: 0, isPrimary: true },
        { imageUrl: 'https://picsum.photos/seed/classic-regular-2/800/1000', imageType: 'LIFESTYLE' as const, sortOrder: 1, isPrimary: false },
      ],
    },
    {
      name: 'Heritage Polo',
      slug: 'heritage-polo',
      description: 'A tailored polo shirt with ribbed collar.',
      categoryId: polo.id,
      productType: 'Polo',
      basePrice: 899,
      mrp: 1199,
      status: 'ACTIVE' as const,
      colors: [black, yellow],
      sizes: [s, m, l, xl],
      images: [
        { imageUrl: 'https://picsum.photos/seed/heritage-polo-1/800/1000', imageType: 'PRODUCT' as const, sortOrder: 0, isPrimary: true },
      ],
    },
    {
      name: 'Women Essential Crop Tee',
      slug: 'women-essential-crop-tee',
      description: 'A cropped essential tee for everyday wear.',
      categoryId: women.id,
      productType: 'T-Shirt',
      basePrice: 649,
      mrp: 849,
      status: 'ACTIVE' as const,
      colors: [white, purple],
      sizes: [s, m, l],
      images: [
        { imageUrl: 'https://picsum.photos/seed/women-crop-1/800/1000', imageType: 'PRODUCT' as const, sortOrder: 0, isPrimary: true },
        { imageUrl: 'https://picsum.photos/seed/women-crop-2/800/1000', imageType: 'MODEL' as const, sortOrder: 1, isPrimary: false },
      ],
    },
    {
      name: 'Storm Pullover Sweatshirt',
      slug: 'storm-pullover-sweatshirt',
      description: 'A cozy fleece-lined pullover sweatshirt.',
      categoryId: sweatshirts.id,
      productType: 'Sweatshirt',
      basePrice: 1299,
      mrp: 1599,
      status: 'ACTIVE' as const,
      colors: [black, red],
      sizes: [m, l, xl, xxl],
      images: [
        { imageUrl: 'https://picsum.photos/seed/storm-pullover-1/800/1000', imageType: 'PRODUCT' as const, sortOrder: 0, isPrimary: true },
      ],
    },
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId: p.categoryId,
        productType: p.productType,
        basePrice: p.basePrice,
        mrp: p.mrp,
        status: p.status,
      },
    });

    for (const image of p.images) {
      const exists = await prisma.productImage.findFirst({
        where: { productId: product.id, imageUrl: image.imageUrl },
      });
      if (!exists) {
        await prisma.productImage.create({ data: { ...image, productId: product.id } });
      }
    }

    for (const color of p.colors) {
      for (const size of p.sizes) {
        const fragment = p.slug
          .split('-')
          .slice(0, 2)
          .map((s2) => s2.slice(0, 3))
          .join('-')
          .toUpperCase();
        const sku = `${fragment}-${color.code}-${size.code}`;

        await prisma.productVariant.upsert({
          where: {
            productId_colorId_sizeId: {
              productId: product.id,
              colorId: color.id,
              sizeId: size.id,
            },
          },
          update: {},
          create: {
            productId: product.id,
            colorId: color.id,
            sizeId: size.id,
            sku,
            stockQuantity: Math.floor(Math.random() * 40),
            status: 'ACTIVE',
          },
        });
      }
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
