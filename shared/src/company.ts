/** Vendelia's own company and contact details, shown in the site footer, emails and voucher PDFs. */
export const COMPANY = {
  name: "Vendelia Oy",
  businessId: "3666248-7",
  phone: "+358 50 357 2836",
  /** Customer service: buyers and voucher holders. */
  customerEmail: "info@vendelia.fi",
  /** Business support: merchants selling on Vendelia. */
  businessEmail: "tuki@vendelia.fi",
} as const;

/** Phone number as a tel: link target (no spaces). */
export const COMPANY_TEL = `tel:${COMPANY.phone.replace(/\s/g, "")}`;
