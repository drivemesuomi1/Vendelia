import { z } from 'zod';
import { businessIdSchema } from './common';

/** Same check-digit rule used by the admin form, enforced on the server too. */
export function validFinnishBusinessId(value: string): boolean {
  const match = /^(\d{7})-(\d)$/.exec(value.trim());
  if (!match) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2];
  const remainder = [...match[1]!].reduce((sum, digit, i) => sum + Number(digit) * weights[i]!, 0) % 11;
  return remainder !== 1 && (remainder === 0 ? 0 : 11 - remainder) === Number(match[2]);
}
const name = z.string().trim().min(1, { message: 'required' }).max(150, { message: 'validation_failed' });
export const merchantStatusSchema = z.enum(['active', 'pending', 'suspended']);
export type MerchantStatus = z.infer<typeof merchantStatusSchema>;
export const adminMerchantSchema = z.object({
  name,
  companyName: name,
  businessId: businessIdSchema.refine(validFinnishBusinessId, { message: 'invalidBusinessId' }),
  contactName: z.string().trim().min(1, { message: 'required' }).max(120, { message: 'validation_failed' }),
  publicEmail: z.string().trim().toLowerCase().max(254, { message: 'invalidEmail' }).refine(value => !value || z.string().email().safeParse(value).success, { message: 'invalidEmail' }).default(''),
  phone: z.string().trim().max(40, { message: 'validation_failed' }).default(''),
  cityId: z.string().trim().min(1, { message: 'required' }).max(100, { message: 'validation_failed' }),
  categoryId: z.string().trim().min(1, { message: 'required' }).max(100, { message: 'validation_failed' }),
  status: merchantStatusSchema.default('active'),
}).strict();
export type AdminMerchantInput = z.infer<typeof adminMerchantSchema>;
export const adminMerchantCreateSchema = adminMerchantSchema.extend({
  allowDuplicateBusinessId: z.boolean().optional(),
  login: z.object({
    email: z.string().trim().toLowerCase().max(254).email({ message: 'invalidEmail' }),
    password: z.string().min(12, { message: 'merchantPasswordLength' }).max(72, { message: 'merchantPasswordLength' })
      .refine(value => new TextEncoder().encode(value).length <= 72, { message: 'merchantPasswordLength' }),
  }).strict().optional(),
}).strict();
export type AdminMerchantCreateInput = z.infer<typeof adminMerchantCreateSchema>;

export interface BusinessIdMatch { id: string; name: string; companyName: string }

export interface AdminMerchantDTO {
  id: string;
  name: string;
  companyName: string;
  businessId: string;
  contactName: string | null;
  publicEmail: string | null;
  phone: string | null;
  website: string | null;
  cityId: string | null;
  categoryId: string | null;
  status: MerchantStatus;
  createdAt: string;
  updatedAt: string;
  dealCount: number;
  liveDealCount: number;
}

/** A business user's own saved deal list; no draft data from another merchant is included. */
export interface MerchantDealDTO {
  id: string;
  slug: string;
  title: import('./common').LocalizedText;
  imageUrl: string;
  status: 'draft' | 'pending' | 'live' | 'rejected';
  createdAt: string;
  fromPriceCents: number | null;
  optionCount: number;
}

/** A business's own deal with what it needs for the portal card (review outcome included). */
export interface MerchantDealCardDTO extends MerchantDealDTO {
  vatBps: number;
  reviewNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

/** One deal as stored, in the same shape the deal form submits, plus its review state. */
export interface DealRecordDTO {
  id: string;
  slug: string;
  status: MerchantDealDTO['status'];
  reviewNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  input: import('./deal').DealInput;
}

export interface AdminDealDTO extends DealRecordDTO {
  merchantId: string;
  merchantName: string;
  merchantStatus: MerchantStatus;
}

/** Photo upload from the business portal: base64 bytes of an image already resized in the browser. */
export const dealImageUploadSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  // Base64 expansion for a 1 MiB decoded image.
  data: z.string().min(4).max(1_398_104),
});
