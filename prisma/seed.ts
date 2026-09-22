import { OrderStatus, PaymentStatus, PrismaClient } from '@prisma/client';

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

  console.log('Seeding customers and orders...');

  const sampleVariants = await prisma.productVariant.findMany({
    take: 12,
    orderBy: { sku: 'asc' },
    include: { product: true },
  });

  function variantAt(index: number) {
    return sampleVariants[index % sampleVariants.length];
  }

  interface SeedOrder {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    shippingAddress: string;
    createdAt: Date;
    lines: { variantIndex: number; quantity: number }[];
    decrementStock: boolean;
  }

  const seedOrders: SeedOrder[] = [
    {
      orderNumber: '#ORD-1001',
      customerName: 'Alexander Wright',
      customerEmail: 'alex.wright@gmail.com',
      customerPhone: '+1 (555) 234-5678',
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      shippingAddress: '742 Evergreen Terrace, Springfield, OR 97477',
      createdAt: new Date(Date.now() - 3600000 * 2),
      lines: [{ variantIndex: 0, quantity: 2 }],
      decrementStock: true,
    },
    {
      orderNumber: '#ORD-1002',
      customerName: 'Sophia Chen',
      customerEmail: 'sophia.chen@outlook.com',
      customerPhone: '+1 (555) 876-5432',
      status: 'SHIPPED',
      paymentStatus: 'PAID',
      shippingAddress: '1204 Pine Crest Ave, Seattle, WA 98101',
      createdAt: new Date(Date.now() - 3600000 * 8),
      lines: [
        { variantIndex: 1, quantity: 1 },
        { variantIndex: 2, quantity: 2 },
      ],
      decrementStock: true,
    },
    {
      orderNumber: '#ORD-1003',
      customerName: 'Marcus Vance',
      customerEmail: 'm.vance@techcorp.io',
      customerPhone: '+1 (555) 432-1098',
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      shippingAddress: '450 Mission St, San Francisco, CA 94105',
      createdAt: new Date(Date.now() - 3600000 * 26),
      lines: [{ variantIndex: 3, quantity: 1 }],
      decrementStock: true,
    },
    {
      orderNumber: '#ORD-1004',
      customerName: 'Emma Watson',
      customerEmail: 'emma.w@designstudio.co',
      customerPhone: '+1 (555) 345-6789',
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      shippingAddress: '88 Tech Boulevard, Austin, TX 78701',
      createdAt: new Date(Date.now() - 3600000 * 42),
      lines: [{ variantIndex: 4, quantity: 1 }],
      decrementStock: true,
    },
    {
      orderNumber: '#ORD-1005',
      customerName: "Liam O'Connor",
      customerEmail: 'liam.oc@gmail.com',
      customerPhone: '+1 (555) 901-2345',
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED',
      shippingAddress: '312 Beacon Street, Boston, MA 02116',
      createdAt: new Date(Date.now() - 3600000 * 70),
      lines: [{ variantIndex: 5, quantity: 1 }],
      decrementStock: false,
    },
    {
      orderNumber: '#ORD-1006',
      customerName: 'Sophia Chen',
      customerEmail: 'sophia.chen@outlook.com',
      customerPhone: '+1 (555) 876-5432',
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      shippingAddress: '1204 Pine Crest Ave, Seattle, WA 98101',
      createdAt: new Date(Date.now() - 3600000 * 240),
      lines: [{ variantIndex: 6, quantity: 3 }],
      decrementStock: true,
    },
  ];

  if (sampleVariants.length > 0) {
    for (const seedOrder of seedOrders) {
      const existing = await prisma.order.findUnique({ where: { orderNumber: seedOrder.orderNumber } });
      if (existing) continue;

      const customer = await prisma.customer.upsert({
        where: { email: seedOrder.customerEmail },
        update: {},
        create: {
          name: seedOrder.customerName,
          email: seedOrder.customerEmail,
          phone: seedOrder.customerPhone,
        },
      });

      const lines = seedOrder.lines.map((line) => {
        const variant = variantAt(line.variantIndex);
        const unitPrice = variant.price ?? variant.product.basePrice;
        return { variant, quantity: line.quantity, unitPrice };
      });

      const totalAmount = lines.reduce(
        (sum, line) => sum + Number(line.unitPrice) * line.quantity,
        0
      );

      await prisma.order.create({
        data: {
          orderNumber: seedOrder.orderNumber,
          customerId: customer.id,
          status: seedOrder.status,
          paymentStatus: seedOrder.paymentStatus,
          totalAmount,
          shippingAddress: seedOrder.shippingAddress,
          createdAt: seedOrder.createdAt,
          items: {
            create: lines.map((line) => ({
              variantId: line.variant.id,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
        },
      });

      if (seedOrder.decrementStock) {
        for (const line of lines) {
          const previousStock = line.variant.stockQuantity;
          const newStock = Math.max(0, previousStock - line.quantity);
          await prisma.productVariant.update({
            where: { id: line.variant.id },
            data: { stockQuantity: newStock },
          });
          await prisma.inventoryTransaction.create({
            data: {
              variantId: line.variant.id,
              transactionType: 'MANUAL_DECREASE',
              quantity: line.quantity,
              previousStock,
              newStock,
              reason: `Order ${seedOrder.orderNumber}`,
            },
          });
        }
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
