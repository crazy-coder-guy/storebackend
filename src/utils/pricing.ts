export const FREE_DELIVERY_THRESHOLD = 399;
export const DELIVERY_FEE = 29;

export function calculateDeliveryFee(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}
