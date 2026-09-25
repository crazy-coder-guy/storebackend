import { z } from 'zod';

export const createReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(1).max(2000),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const listReviewsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  rating: z.string().optional(),
});

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
