import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { SaveAddressInput } from '../validation/address.validation';

export const MAX_ADDRESSES_PER_USER = 3;

export function formatShippingAddress(parts: {
  doorNumber: string;
  streetName: string;
  city: string;
  state: string;
  pincode: string;
}) {
  return `${parts.doorNumber}, ${parts.streetName}, ${parts.city}, ${parts.state} - ${parts.pincode}`;
}

export async function listAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function saveAddress(userId: string, input: SaveAddressInput) {
  const existing = await prisma.address.findFirst({
    where: {
      userId,
      name: input.name,
      phone: input.phone,
      doorNumber: input.doorNumber,
      streetName: input.streetName,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
    },
  });
  if (existing) return existing;

  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES_PER_USER) {
    const oldest = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (oldest) await prisma.address.delete({ where: { id: oldest.id } });
  }

  return prisma.address.create({
    data: { userId, ...input, shippingAddress: formatShippingAddress(input) },
  });
}

export async function deleteAddress(userId: string, id: string) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new AppError(404, 'NOT_FOUND', 'Address not found');
  await prisma.address.delete({ where: { id } });
}
