const successEnvelope = (dataSchema: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
    message: { type: 'string' },
  },
});

const errorEnvelope = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
    error: {
      type: 'object',
      properties: { code: { type: 'string' } },
    },
  },
};

const paginationMeta = {
  type: 'object',
  properties: {
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 20 },
    total: { type: 'integer', example: 0 },
    totalPages: { type: 'integer', example: 1 },
  },
};

const listResponse = (itemsRef: object) => ({
  type: 'object',
  properties: {
    items: { type: 'array', items: itemsRef },
    meta: paginationMeta,
  },
});

const errorResponses = {
  '400': { description: 'Bad request', content: { 'application/json': { schema: errorEnvelope } } },
  '404': { description: 'Not found', content: { 'application/json': { schema: errorEnvelope } } },
  '409': { description: 'Conflict', content: { 'application/json': { schema: errorEnvelope } } },
  '422': { description: 'Validation error', content: { 'application/json': { schema: errorEnvelope } } },
};

const pageParam = { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } };
const limitParam = { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } };

const entityStatusEnum = ['ACTIVE', 'INACTIVE'];

// ---- Schemas ----

const categorySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    badge: { type: 'string', nullable: true, description: 'e.g. "New", "Bestseller"' },
    status: { type: 'string', enum: entityStatusEnum },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const categoryCreateSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    badge: { type: 'string', nullable: true },
    status: { type: 'string', enum: entityStatusEnum },
  },
};

const sizeSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    code: { type: 'string' },
    sortOrder: { type: 'integer' },
    status: { type: 'string', enum: entityStatusEnum },
  },
};

const sizeCreateSchema = {
  type: 'object',
  required: ['name', 'code'],
  properties: {
    name: { type: 'string' },
    code: { type: 'string' },
    sortOrder: { type: 'integer' },
    status: { type: 'string', enum: entityStatusEnum },
  },
};

const colorSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    code: { type: 'string' },
    hexCode: { type: 'string' },
    status: { type: 'string', enum: entityStatusEnum },
  },
};

const colorCreateSchema = {
  type: 'object',
  required: ['name', 'code', 'hexCode'],
  properties: {
    name: { type: 'string' },
    code: { type: 'string' },
    hexCode: { type: 'string' },
    status: { type: 'string', enum: entityStatusEnum },
  },
};

const productSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    categoryId: { type: 'string', format: 'uuid' },
    productType: { type: 'string' },
    basePrice: { type: 'number' },
    mrp: { type: 'number' },
    badge: { type: 'string', nullable: true, description: 'e.g. "New", "Bestseller"' },
    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DRAFT'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const productDetailSchema = {
  allOf: [
    productSchema,
    {
      type: 'object',
      properties: {
        category: categorySchema,
        images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
        variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' } },
      },
    },
  ],
};

const productCreateSchema = {
  type: 'object',
  required: ['name', 'categoryId', 'productType', 'basePrice', 'mrp'],
  properties: {
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    categoryId: { type: 'string', format: 'uuid' },
    productType: { type: 'string' },
    basePrice: { type: 'number' },
    mrp: { type: 'number' },
    badge: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DRAFT'] },
  },
};

const productImageSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    productId: { type: 'string', format: 'uuid' },
    imageUrl: { type: 'string', format: 'uri' },
    imageType: { type: 'string', enum: ['PRODUCT', 'MODEL', 'LIFESTYLE'] },
    sortOrder: { type: 'integer' },
    isPrimary: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const productImageCreateSchema = {
  type: 'object',
  required: ['imageUrl'],
  properties: {
    imageUrl: { type: 'string', format: 'uri' },
    imageType: { type: 'string', enum: ['PRODUCT', 'MODEL', 'LIFESTYLE'] },
    sortOrder: { type: 'integer' },
    isPrimary: { type: 'boolean' },
  },
};

const productVariantSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    productId: { type: 'string', format: 'uuid' },
    colorId: { type: 'string', format: 'uuid' },
    sizeId: { type: 'string', format: 'uuid' },
    sku: { type: 'string' },
    price: { type: 'number', nullable: true },
    stockQuantity: { type: 'integer' },
    badge: { type: 'string', nullable: true, description: 'e.g. "New", "Bestseller"' },
    status: { type: 'string', enum: entityStatusEnum },
    color: colorSchema,
    size: sizeSchema,
  },
};

const productVariantCreateSchema = {
  type: 'object',
  required: ['colorId', 'sizeId'],
  properties: {
    colorId: { type: 'string', format: 'uuid' },
    sizeId: { type: 'string', format: 'uuid' },
    sku: { type: 'string', description: 'Optional; auto-generated as SLUG-COLORCODE-SIZECODE if omitted' },
    price: { type: 'number', nullable: true },
    stockQuantity: { type: 'integer', default: 0 },
    badge: { type: 'string', nullable: true },
    status: { type: 'string', enum: entityStatusEnum },
  },
};

const inventoryTransactionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    variantId: { type: 'string', format: 'uuid' },
    transactionType: {
      type: 'string',
      enum: ['RESTOCK', 'MANUAL_INCREASE', 'MANUAL_DECREASE', 'ADJUSTMENT'],
    },
    quantity: { type: 'integer' },
    previousStock: { type: 'integer' },
    newStock: { type: 'integer' },
    reason: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const adjustStockSchema = {
  type: 'object',
  required: ['type', 'quantity'],
  properties: {
    type: {
      type: 'string',
      enum: ['RESTOCK', 'MANUAL_INCREASE', 'MANUAL_DECREASE', 'ADJUSTMENT'],
    },
    quantity: { type: 'integer' },
    reason: { type: 'string', nullable: true },
  },
};

// ---- Paths ----

const categoriesPaths = {
  '/v1/categories': {
    get: {
      tags: ['Categories'],
      summary: 'List categories',
      parameters: [
        pageParam,
        limitParam,
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: entityStatusEnum } },
      ],
      responses: {
        '200': {
          description: 'Categories fetched',
          content: { 'application/json': { schema: successEnvelope(listResponse(categorySchema)) } },
        },
      },
    },
    post: {
      tags: ['Categories'],
      summary: 'Create a category',
      requestBody: { content: { 'application/json': { schema: categoryCreateSchema } } },
      responses: {
        '201': {
          description: 'Category created',
          content: { 'application/json': { schema: successEnvelope(categorySchema) } },
        },
        ...errorResponses,
      },
    },
  },
  '/v1/categories/{id}': {
    get: {
      tags: ['Categories'],
      summary: 'Get a category',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': {
          description: 'Category fetched',
          content: { 'application/json': { schema: successEnvelope(categorySchema) } },
        },
        ...errorResponses,
      },
    },
    patch: {
      tags: ['Categories'],
      summary: 'Update a category',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: { content: { 'application/json': { schema: categoryCreateSchema } } },
      responses: {
        '200': {
          description: 'Category updated',
          content: { 'application/json': { schema: successEnvelope(categorySchema) } },
        },
        ...errorResponses,
      },
    },
    delete: {
      tags: ['Categories'],
      summary: 'Soft-delete (deactivate) a category',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': {
          description: 'Category deactivated',
          content: { 'application/json': { schema: successEnvelope(categorySchema) } },
        },
        ...errorResponses,
      },
    },
  },
};

const sizesPaths = {
  '/v1/sizes': {
    get: {
      tags: ['Sizes'],
      summary: 'List sizes',
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string', enum: entityStatusEnum } }],
      responses: {
        '200': {
          description: 'Sizes fetched',
          content: { 'application/json': { schema: successEnvelope(listResponse(sizeSchema)) } },
        },
      },
    },
    post: {
      tags: ['Sizes'],
      summary: 'Create a size',
      requestBody: { content: { 'application/json': { schema: sizeCreateSchema } } },
      responses: {
        '201': { description: 'Size created', content: { 'application/json': { schema: successEnvelope(sizeSchema) } } },
        ...errorResponses,
      },
    },
  },
  '/v1/sizes/{id}': {
    patch: {
      tags: ['Sizes'],
      summary: 'Update a size',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: { content: { 'application/json': { schema: sizeCreateSchema } } },
      responses: {
        '200': { description: 'Size updated', content: { 'application/json': { schema: successEnvelope(sizeSchema) } } },
        ...errorResponses,
      },
    },
    delete: {
      tags: ['Sizes'],
      summary: 'Soft-delete (deactivate) a size',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Size deactivated', content: { 'application/json': { schema: successEnvelope(sizeSchema) } } },
        ...errorResponses,
      },
    },
  },
};

const colorsPaths = {
  '/v1/colors': {
    get: {
      tags: ['Colors'],
      summary: 'List colors',
      parameters: [pageParam, limitParam, { name: 'status', in: 'query', schema: { type: 'string', enum: entityStatusEnum } }],
      responses: {
        '200': {
          description: 'Colors fetched',
          content: { 'application/json': { schema: successEnvelope(listResponse(colorSchema)) } },
        },
      },
    },
    post: {
      tags: ['Colors'],
      summary: 'Create a color',
      requestBody: { content: { 'application/json': { schema: colorCreateSchema } } },
      responses: {
        '201': { description: 'Color created', content: { 'application/json': { schema: successEnvelope(colorSchema) } } },
        ...errorResponses,
      },
    },
  },
  '/v1/colors/{id}': {
    patch: {
      tags: ['Colors'],
      summary: 'Update a color',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: { content: { 'application/json': { schema: colorCreateSchema } } },
      responses: {
        '200': { description: 'Color updated', content: { 'application/json': { schema: successEnvelope(colorSchema) } } },
        ...errorResponses,
      },
    },
    delete: {
      tags: ['Colors'],
      summary: 'Soft-delete (deactivate) a color',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Color deactivated', content: { 'application/json': { schema: successEnvelope(colorSchema) } } },
        ...errorResponses,
      },
    },
  },
};

const productsPaths = {
  '/v1/products': {
    get: {
      tags: ['Products'],
      summary: 'List products',
      parameters: [
        pageParam,
        limitParam,
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'category_id', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DRAFT'] } },
        { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['created_at', 'base_price', 'name'] } },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
      ],
      responses: {
        '200': {
          description: 'Products fetched',
          content: { 'application/json': { schema: successEnvelope(listResponse(productSchema)) } },
        },
      },
    },
    post: {
      tags: ['Products'],
      summary: 'Create a product',
      requestBody: { content: { 'application/json': { schema: productCreateSchema } } },
      responses: {
        '201': { description: 'Product created', content: { 'application/json': { schema: successEnvelope(productSchema) } } },
        ...errorResponses,
      },
    },
  },
  '/v1/products/{id}': {
    get: {
      tags: ['Products'],
      summary: 'Get a product (with images and variants)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': {
          description: 'Product fetched',
          content: { 'application/json': { schema: successEnvelope(productDetailSchema) } },
        },
        ...errorResponses,
      },
    },
    patch: {
      tags: ['Products'],
      summary: 'Update a product',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: { content: { 'application/json': { schema: productCreateSchema } } },
      responses: {
        '200': { description: 'Product updated', content: { 'application/json': { schema: successEnvelope(productSchema) } } },
        ...errorResponses,
      },
    },
    delete: {
      tags: ['Products'],
      summary: 'Soft-delete (deactivate) a product',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Product deactivated', content: { 'application/json': { schema: successEnvelope(productSchema) } } },
        ...errorResponses,
      },
    },
  },
  '/v1/products/{productId}/images': {
    get: {
      tags: ['Product Images'],
      summary: 'List images for a product',
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': {
          description: 'Product images fetched',
          content: { 'application/json': { schema: successEnvelope({ type: 'array', items: productImageSchema }) } },
        },
      },
    },
    post: {
      tags: ['Product Images'],
      summary: 'Add an image to a product',
      description:
        'Accepts an image URL string only (Phase 1 has no upload pipeline). Ready to be wired to Cloudinary/S3 later via config.s3.',
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: { content: { 'application/json': { schema: productImageCreateSchema } } },
      responses: {
        '201': {
          description: 'Product image created',
          content: { 'application/json': { schema: successEnvelope(productImageSchema) } },
        },
        ...errorResponses,
      },
    },
  },
  '/v1/products/{productId}/images/{imageId}': {
    patch: {
      tags: ['Product Images'],
      summary: 'Update a product image',
      parameters: [
        { name: 'productId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'imageId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: { content: { 'application/json': { schema: productImageCreateSchema } } },
      responses: {
        '200': {
          description: 'Product image updated',
          content: { 'application/json': { schema: successEnvelope(productImageSchema) } },
        },
        ...errorResponses,
      },
    },
    delete: {
      tags: ['Product Images'],
      summary: 'Delete a product image (hard delete)',
      parameters: [
        { name: 'productId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'imageId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Product image deleted', content: { 'application/json': { schema: successEnvelope({ type: 'null' }) } } },
        ...errorResponses,
      },
    },
  },
  '/v1/products/{productId}/variants': {
    get: {
      tags: ['Product Variants'],
      summary: 'List variants for a product',
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': {
          description: 'Product variants fetched',
          content: { 'application/json': { schema: successEnvelope({ type: 'array', items: productVariantSchema }) } },
        },
      },
    },
    post: {
      tags: ['Product Variants'],
      summary: 'Create a product variant',
      description:
        'SKU is auto-generated from product slug + color code + size code (e.g. KAI-OV-BLK-S) when omitted. Rejects duplicate SKU (409 DUPLICATE_SKU) and duplicate product/color/size combos (409 DUPLICATE_VARIANT).',
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: { content: { 'application/json': { schema: productVariantCreateSchema } } },
      responses: {
        '201': {
          description: 'Product variant created',
          content: { 'application/json': { schema: successEnvelope(productVariantSchema) } },
        },
        ...errorResponses,
      },
    },
  },
  '/v1/products/{productId}/variants/{variantId}': {
    get: {
      tags: ['Product Variants'],
      summary: 'Get a product variant',
      parameters: [
        { name: 'productId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'variantId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Product variant fetched',
          content: { 'application/json': { schema: successEnvelope(productVariantSchema) } },
        },
        ...errorResponses,
      },
    },
    patch: {
      tags: ['Product Variants'],
      summary: 'Update a product variant',
      parameters: [
        { name: 'productId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'variantId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: { content: { 'application/json': { schema: productVariantCreateSchema } } },
      responses: {
        '200': {
          description: 'Product variant updated',
          content: { 'application/json': { schema: successEnvelope(productVariantSchema) } },
        },
        ...errorResponses,
      },
    },
    delete: {
      tags: ['Product Variants'],
      summary: 'Soft-delete (deactivate) a product variant',
      parameters: [
        { name: 'productId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'variantId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Product variant deactivated',
          content: { 'application/json': { schema: successEnvelope(productVariantSchema) } },
        },
        ...errorResponses,
      },
    },
  },
};

const inventoryPaths = {
  '/v1/inventory': {
    get: {
      tags: ['Inventory'],
      summary: 'List variants with inventory info (joined product/size/color)',
      parameters: [
        pageParam,
        limitParam,
        { name: 'sku', in: 'query', schema: { type: 'string' } },
        { name: 'product_id', in: 'query', schema: { type: 'string' } },
        { name: 'product_name', in: 'query', schema: { type: 'string' } },
        { name: 'size_id', in: 'query', schema: { type: 'string' } },
        { name: 'color_id', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Inventory fetched',
          content: { 'application/json': { schema: successEnvelope(listResponse(productVariantSchema)) } },
        },
      },
    },
  },
  '/v1/inventory/low-stock': {
    get: {
      tags: ['Inventory'],
      summary: 'List ACTIVE variants at or under a stock threshold',
      parameters: [{ name: 'threshold', in: 'query', schema: { type: 'integer', default: 10 } }],
      responses: {
        '200': {
          description: 'Low-stock variants fetched',
          content: { 'application/json': { schema: successEnvelope({ type: 'array', items: productVariantSchema }) } },
        },
      },
    },
  },
  '/v1/inventory/out-of-stock': {
    get: {
      tags: ['Inventory'],
      summary: 'List ACTIVE variants with zero stock',
      responses: {
        '200': {
          description: 'Out-of-stock variants fetched',
          content: { 'application/json': { schema: successEnvelope({ type: 'array', items: productVariantSchema }) } },
        },
      },
    },
  },
  '/v1/inventory/{variantId}': {
    patch: {
      tags: ['Inventory'],
      summary: 'Adjust stock for a variant (atomic; writes an InventoryTransaction)',
      parameters: [{ name: 'variantId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: { content: { 'application/json': { schema: adjustStockSchema } } },
      responses: {
        '200': {
          description: 'Stock adjusted',
          content: {
            'application/json': {
              schema: successEnvelope({
                type: 'object',
                properties: { variant: productVariantSchema, transaction: inventoryTransactionSchema },
              }),
            },
          },
        },
        ...errorResponses,
      },
    },
  },
  '/v1/inventory/{variantId}/history': {
    get: {
      tags: ['Inventory'],
      summary: 'Paginated inventory transaction history for a variant (newest first)',
      parameters: [
        { name: 'variantId', in: 'path', required: true, schema: { type: 'string' } },
        pageParam,
        limitParam,
      ],
      responses: {
        '200': {
          description: 'Inventory history fetched',
          content: { 'application/json': { schema: successEnvelope(listResponse(inventoryTransactionSchema)) } },
        },
        ...errorResponses,
      },
    },
  },
};

const dashboardSummarySchema = {
  type: 'object',
  properties: {
    products: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        active: { type: 'integer' },
        inactive: { type: 'integer' },
        draft: { type: 'integer' },
      },
    },
    inventory: {
      type: 'object',
      properties: {
        totalStock: { type: 'integer' },
        lowStock: { type: 'integer' },
        outOfStock: { type: 'integer' },
      },
    },
    catalog: {
      type: 'object',
      properties: {
        categories: { type: 'integer' },
        sizes: { type: 'integer' },
        colors: { type: 'integer' },
      },
    },
    lowStockProducts: { type: 'array', items: productVariantSchema },
    recentActivity: { type: 'array', items: inventoryTransactionSchema },
  },
};

const storefrontSettingsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'default' },
    announcementText: { type: 'string' },
    heroTitle: { type: 'string' },
    heroSubtitle: { type: 'string' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const updateStorefrontSettingsRequestSchema = {
  type: 'object',
  properties: {
    announcementText: { type: 'string' },
    heroTitle: { type: 'string' },
    heroSubtitle: { type: 'string' },
  },
};

const featuredProductSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    productId: { type: 'string', format: 'uuid' },
    sortOrder: { type: 'integer' },
    createdAt: { type: 'string', format: 'date-time' },
    product: productDetailSchema,
  },
};

const setFeaturedProductsRequestSchema = {
  type: 'object',
  required: ['productIds'],
  properties: {
    productIds: {
      type: 'array',
      items: { type: 'string', format: 'uuid' },
      description: 'Full replacement list, in display order. Any number of products may be selected.',
    },
  },
};

const storefrontPaths = {
  '/v1/storefront/settings': {
    get: {
      tags: ['Storefront'],
      summary: 'Get the customer storefront announcement bar and hero copy',
      responses: {
        '200': {
          description: 'Storefront settings fetched',
          content: { 'application/json': { schema: successEnvelope(storefrontSettingsSchema) } },
        },
      },
    },
    patch: {
      tags: ['Storefront'],
      summary: 'Update the announcement bar and/or hero copy',
      requestBody: {
        content: { 'application/json': { schema: updateStorefrontSettingsRequestSchema } },
      },
      responses: {
        '200': {
          description: 'Storefront settings updated',
          content: { 'application/json': { schema: successEnvelope(storefrontSettingsSchema) } },
        },
        ...errorResponses,
      },
    },
  },
  '/v1/storefront/featured-products': {
    get: {
      tags: ['Storefront'],
      summary: 'List the products selected as "Top Selling" on the storefront, in display order',
      responses: {
        '200': {
          description: 'Featured products fetched',
          content: {
            'application/json': { schema: successEnvelope({ type: 'array', items: featuredProductSchema }) },
          },
        },
      },
    },
    put: {
      tags: ['Storefront'],
      summary: 'Replace the full set of "Top Selling" products (any number may be selected)',
      requestBody: {
        content: { 'application/json': { schema: setFeaturedProductsRequestSchema } },
      },
      responses: {
        '200': {
          description: 'Featured products updated',
          content: {
            'application/json': { schema: successEnvelope({ type: 'array', items: featuredProductSchema }) },
          },
        },
        ...errorResponses,
      },
    },
  },
};

const searchResultItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    slug: { type: 'string' },
    basePrice: { type: 'number' },
    mrp: { type: 'number' },
    badge: { type: 'string', nullable: true },
    categoryName: { type: 'string' },
    image: { type: 'string', nullable: true },
  },
};

const topSearchItemSchema = {
  type: 'object',
  properties: {
    term: { type: 'string' },
    searchCount: { type: 'integer' },
    avgResults: { type: 'number' },
    lastSearchedAt: { type: 'string', format: 'date-time' },
  },
};

const searchPaths = {
  '/v1/search/top': {
    get: {
      tags: ['Search'],
      summary:
        'Admin-facing: most-searched terms on the storefront over a time window, with average result count (useful for spotting zero-result catalog gaps)',
      parameters: [
        { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
      ],
      responses: {
        '200': {
          description: 'Top searches fetched',
          content: {
            'application/json': { schema: successEnvelope({ type: 'array', items: topSearchItemSchema }) },
          },
        },
      },
    },
  },
  '/v1/search': {
    get: {
      tags: ['Search'],
      summary:
        'Fuzzy, ranked product search (typo-tolerant via PostgreSQL trigram similarity) across name, description, category, and product type. ACTIVE products only.',
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
        pageParam,
        limitParam,
      ],
      responses: {
        '200': {
          description: 'Search results fetched',
          content: {
            'application/json': { schema: successEnvelope(listResponse(searchResultItemSchema)) },
          },
        },
      },
    },
  },
};

const dashboardPaths = {
  '/v1/dashboard/summary': {
    get: {
      tags: ['Dashboard'],
      summary: 'Aggregate counts, low-stock products, and recent inventory activity for the admin overview',
      parameters: [{ name: 'threshold', in: 'query', schema: { type: 'integer', default: 10 } }],
      responses: {
        '200': {
          description: 'Dashboard summary fetched',
          content: { 'application/json': { schema: successEnvelope(dashboardSummarySchema) } },
        },
      },
    },
  },
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Backend API',
    version: '1.0.0',
    description: 'API reference and testing playground — Product Catalog, Variants & Inventory (Phase 1)',
  },
  servers: [{ url: '/api', description: 'API base path' }],
  tags: [
    { name: 'Health' },
    { name: 'Categories' },
    { name: 'Products' },
    { name: 'Product Images' },
    { name: 'Product Variants' },
    { name: 'Sizes' },
    { name: 'Colors' },
    { name: 'Inventory' },
    { name: 'Dashboard' },
    { name: 'Storefront' },
    { name: 'Search' },
  ],
  components: {
    schemas: {
      ProductImage: productImageSchema,
      ProductVariant: productVariantSchema,
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    ...categoriesPaths,
    ...productsPaths,
    ...sizesPaths,
    ...colorsPaths,
    ...inventoryPaths,
    ...dashboardPaths,
    ...storefrontPaths,
    ...searchPaths,
  },
};
