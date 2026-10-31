import type { LocalizedList, LocalizedText } from "../schemas/common";
import type { Role } from "../schemas/auth";
import type { PaymentMethod } from "../schemas/order";
import type { VoucherStatus } from "../schemas/voucher";

/** Response shapes shared by the API and the frontend. Money in cents, VAT/commission in basis points. */

export interface CityDTO {
  id: string;
  name: LocalizedText;
  abbr: string;
}

export interface CategoryDTO {
  id: string;
  name: LocalizedText;
  icon: string;
  dealCount: number;
}

export interface MetaDTO {
  cities: CityDTO[];
  categories: CategoryDTO[];
  commissionBps: number;
  commissionVatBps: number;
  voucherValidityMonths: number;
  refundWindowDays: number;
  /** Temporary test checkout: payment is skipped and vouchers are marked test/unpaid. */
  paymentBypass?: boolean;
}

export interface DealOptionDTO {
  id: string;
  label: LocalizedText | null;
  priceCents: number;
  /** Per-option reference price when options differ in value; falls back to the deal's. */
  referencePriceCents?: number | null;
  /** Heading the option is listed under when a deal has several kinds of options. */
  group?: LocalizedText | null;
  /** Compact label for the option tile, e.g. "3 h" (label stays the full name used in the cart). */
  shortLabel?: LocalizedText;
}

export interface MerchantPublicDTO {
  name: string;
  companyName: string;
  businessId: string;
  phone: string;
  email?: string;
  website?: string;
}


export interface DealSummaryDTO {
  id: string;
  slug: string;
  title: LocalizedText;
  restrictions: LocalizedText;
  categoryId: string;
  cityId: string;
  area: LocalizedText;
  imageUrl: string;
  vatBps: number;
  fromPriceCents: number;
  referencePriceCents: number | null;
  optionCount: number;
  /** Set when the deal has exactly one option, so it can be added to the cart from a card. */
  defaultOptionId: string | null;
  merchantName: string;
}

export interface DealDetailDTO extends DealSummaryDTO {
  baseTitle: LocalizedText | null;
  description: LocalizedText;
  inclusions: LocalizedList;
  terms: LocalizedList;
  howTo: LocalizedList;
  street: string;
  zip: string;
  meetingPoint: boolean;
  options: DealOptionDTO[];
  merchant: MerchantPublicDTO;
  status: DealStatus;
  /** Extra photos after imageUrl. */
  gallery?: string[];
  /** Set for services done at the customer's address: shown instead of a street address. */
  serviceArea?: LocalizedText;
}

export type DealStatus = "draft" | "pending" | "live" | "rejected";

export interface SplitDTO {
  grossCents: number;
  netCents: number;
  saleVatCents: number;
  commissionCents: number;
  commissionVatCents: number;
  feeCents: number;
  payoutCents: number;
}

export interface CartLineDTO {
  dealId: string;
  optionId: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
  vatBps: number;
  title: LocalizedText;
  baseTitle: LocalizedText | null;
  optionLabel: LocalizedText | null;
  merchantName: string;
  slug: string;
  imageUrl: string;
}

export interface CartQuoteDTO {
  lines: CartLineDTO[];
  totalCents: number;
  /** VAT included in the total, keyed by rate in basis points. */
  vatByRate: Record<string, number>;
  unavailable: { dealId: string; optionId: string; qty: number }[];
}

export interface SessionUserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  merchant: { id: string; name: string; companyName: string; businessId: string; status: string } | null;
}

export interface CreateOrderResponse {
  orderId: string;
  number: string;
  accessToken: string;
  totalCents: number;
  /** "none": nothing to pay (test checkout); vouchers are already issued. */
  payment: { provider: string; action: "confirm_mock" | "redirect" | "none"; redirectUrl?: string };
  /** Test/unpaid order created through the payment bypass. */
  test: boolean;
  /** Whether the voucher email (with the PDF) was sent. */
  emailSent: boolean;
}

export interface VoucherDTO {
  code: string;
  status: VoucherStatus;
  dealSlug: string;
  title: LocalizedText;
  optionLabel: LocalizedText | null;
  merchantName: string;
  street: string;
  zip: string;
  cityId: string;
  meetingPoint: boolean;
  /** The "how to book" step shown on the voucher. */
  howTo: LocalizedText | null;
  priceCents: number;
  issuedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  refundedAt: string | null;
  cancellableUntil: string | null;
  recipientName: string | null;
  orderNumber: string;
  imageUrl: string;
  /** What the voucher's QR code encodes: the redemption URL carrying the code. */
  qrPayload: string;
  /** Issued by a test/unpaid order. */
  test: boolean;
}

export interface OrderDTO {
  id: string;
  number: string;
  status: "pending" | "paid" | "failed" | "test_unpaid";
  test: boolean;
  emailStatus: "pending" | "sent" | "failed";
  email: string;
  totalCents: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  vouchers: VoucherDTO[];
}

export interface MerchantDealRowDTO {
  id: string;
  slug: string;
  title: LocalizedText;
  status: DealStatus;
  fromPriceCents: number;
  vatBps: number;
  payoutCents: number;
  sold: number;
}

export interface MerchantOverviewDTO {
  vouchersSold: number;
  vouchersRedeemed: number;
  grossSalesCents: number;
  nextPayoutCents: number;
  deals: MerchantDealRowDTO[];
}

export interface RedeemLookupDTO {
  code: string;
  /** Issued by a test/unpaid order. */
  test?: boolean;
  result: "valid" | "not_found" | "other_merchant" | "redeemed" | "refunded" | "expired";
  title?: LocalizedText;
  optionLabel?: LocalizedText | null;
  expiresAt?: string;
  redeemedAt?: string | null;
  recipientName?: string | null;
  payoutCents?: number;
}

export interface StatementRowDTO {
  dealId: string;
  title: LocalizedText;
  sold: number;
  refunded: number;
  grossCents: number;
  saleVatCents: number;
  netCents: number;
  commissionCents: number;
  commissionVatCents: number;
  refundCents: number;
  payoutCents: number;
}

export interface PayoutStatementDTO {
  periodStart: string;
  periodEnd: string;
  rows: StatementRowDTO[];
  totals: Omit<StatementRowDTO, "dealId" | "title">;
  pendingPayoutCents: number;
  payouts: { id: string; amountCents: number; status: string; createdAt: string }[];
  payoutAccountMasked: string;
}

export interface AdminDealRowDTO {
  id: string;
  slug: string;
  title: LocalizedText;
  merchantName: string;
  status: DealStatus;
  fromPriceCents: number;
  createdAt: string;
}

export interface AdminMerchantRowDTO {
  id: string;
  name: string;
  companyName: string;
  businessId: string;
  status: string;
  email: string;
  liveDeals: number;
  createdAt: string;
}

export interface AdminRefundRowDTO {
  code: string;
  title: LocalizedText;
  merchantName: string;
  priceCents: number;
  refundedAt: string;
  orderNumber: string;
  email: string;
}

export interface ApiErrorDTO {
  error: string;
  message: string;
  fields?: Record<string, string>;
}
