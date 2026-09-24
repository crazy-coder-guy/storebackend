import { Request, Response } from 'express';
import * as productService from '../services/product.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

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
