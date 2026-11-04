import type { DealDetailDTO, DealInput, SessionUserDTO } from "@vendelia/shared";

/** postMessage types between the deal editor and the preview frame (same origin only). */
export const PREVIEW_DEAL = "vendelia:deal-preview";
export const PREVIEW_READY = "vendelia:deal-preview-ready";

const NO_PHOTO = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#ECECF1"/></svg>',
);
const text = (fi: string) => ({ fi, sv: "", en: "" });

/**
 * A draft from the deal form shaped like the public deal page's data, built the same way the backend stores
 * options: the option name is its tile, and the full name includes the section ("Home cleaning: 3 h").
 */
export function toPreviewDeal(input: DealInput, merchant: Pick<NonNullable<SessionUserDTO["merchant"]>, "name" | "companyName" | "businessId">): DealDetailDTO {
  const options = (input.options.length ? input.options : [{ label: null, group: null, priceCents: 0, referencePriceCents: null }]).map((o, i) => ({
    id: ("id" in o && o.id) || `draft-${i}`,
    label: o.label && o.group ? text(`${o.group.fi}: ${o.label.fi}`) : o.label,
    shortLabel: o.label ?? undefined,
    group: o.group,
    priceCents: o.priceCents,
    referencePriceCents: o.referencePriceCents,
  }));
  const cheapest = options.reduce((a, b) => (b.priceCents < a.priceCents ? b : a));
  return {
    id: "preview", slug: "preview", status: "pending",
    title: input.title, baseTitle: null, description: input.description, restrictions: input.restrictions,
    inclusions: input.inclusions, terms: input.terms, howTo: input.howTo,
    categoryId: input.categoryId, cityId: input.cityId, area: text(input.area), street: input.street, zip: input.zip, meetingPoint: false,
    imageUrl: input.imageUrl || NO_PHOTO, gallery: input.galleryUrls, vatBps: input.vatBps,
    fromPriceCents: cheapest.priceCents, referencePriceCents: input.referencePriceCents,
    options, optionCount: options.length, defaultOptionId: options.length === 1 ? options[0]!.id : null,
    merchantName: merchant.name, merchant: { name: merchant.name, companyName: merchant.companyName, businessId: merchant.businessId, phone: "" },
  };
}
