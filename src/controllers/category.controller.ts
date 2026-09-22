import { Request, Response } from 'express';
import * as categoryService from '../services/category.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const status = req.query.status ? (String(req.query.status) as 'ACTIVE' | 'INACTIVE') : undefined;

  const result = await categoryService.listCategories({ page, limit, skip, take, search, status });
  return sendSuccess(res, result, 'Categories fetched');
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getCategoryById(req.params.id);
  return sendSuccess(res, category, 'Category fetched');
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  return sendSuccess(res, category, 'Category created', 201);
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return sendSuccess(res, category, 'Category updated');
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.softDeleteCategory(req.params.id);
  return sendSuccess(res, category, 'Category deactivated');
});

export const deleteCategoryPermanently = asyncHandler(async (req: Request, res: Response) => {
  await categoryService.deleteCategoryPermanently(req.params.id);
  return sendSuccess(res, null, 'Category permanently deleted');
});
