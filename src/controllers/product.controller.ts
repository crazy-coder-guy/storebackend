import { Request, Response } from 'express';
import * as productService from '../services/product.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

const VALID_FITS = new Set(['REGULAR', 'SLIM', 'OVERSIZED', 'RELAXED']);
const VALID_NECK_TYPES = new Set(['CREW', 'V_NECK', 'POLO', 'ROUND', 'MOCK']);

function parseCsv(value: unknown): string[] | undefined {
  if (!value) return undefined;
  const items = String(value).split(',').map((v) => v.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const categoryId = req.query.category_id ? String(req.query.category_id) : undefined;
  const status = req.query.status
    ? (String(req.query.status) as 'ACTIVE' | 'INACTIVE' | 'DRAFT')
    : undefined;
  const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
  const ids = req.query.ids
    ? String(req.query.ids).split(',').map((id) => id.trim()).filter(Boolean)
    : undefined;

  const result = await productService.listProducts({
    page,
    limit,
    skip,
    take,
    search,
    categoryId,
    status,
    sortBy,
    sortOrder,
    ids,
  });
  return sendSuccess(res, result, 'Products fetched');
});

/**
 * Public "All Products" listing for the customer storefront — always
 * ACTIVE-only (unlike the admin listProducts above, which exposes every
 * status), with the extra filters a shopper-facing filter sidebar needs:
 * category, color, size, fit, neck type, price range, and in-stock only.
 */
export const listStorefrontProducts = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

  const categoryIdList = parseCsv(req.query.category_id);
  const colorIds = parseCsv(req.query.color_id);
  const sizeIds = parseCsv(req.query.size_id);
  const fits = parseCsv(req.query.fit)?.filter((f) => VALID_FITS.has(f));
  const neckTypes = parseCsv(req.query.neck_type)?.filter((n) => VALID_NECK_TYPES.has(n));
  const minPrice = parseNumber(req.query.min_price);
  const maxPrice = parseNumber(req.query.max_price);
  const inStock = req.query.in_stock === 'true';

  const result = await productService.listProducts({
    page,
    limit,
    skip,
    take,
    search,
    status: 'ACTIVE',
    sortBy,
    sortOrder,
    categoryId: categoryIdList && categoryIdList.length === 1 ? categoryIdList[0] : undefined,
    categoryIds: categoryIdList && categoryIdList.length > 1 ? categoryIdList : undefined,
    colorIds,
    sizeIds,
    fits,
    neckTypes,
    minPrice,
    maxPrice,
    inStock,
  });
  return sendSuccess(res, result, 'Products fetched');
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.params.id);
  return sendSuccess(res, product, 'Product fetched');
});

export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductBySlug(req.params.slug);
  return sendSuccess(res, product, 'Product fetched');
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  return sendSuccess(res, product, 'Product created', 201);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  return sendSuccess(res, product, 'Product updated');
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.softDeleteProduct(req.params.id);
  return sendSuccess(res, product, 'Product deactivated');
});

export const deleteProductPermanently = asyncHandler(async (req: Request, res: Response) => {
  await productService.deleteProductPermanently(req.params.id);
  return sendSuccess(res, null, 'Product permanently deleted');
});
