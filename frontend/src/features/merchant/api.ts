"use client";

import type { DealInput, RedeemLookupDTO } from "@vendelia/shared";
import { api } from "@/lib/api-client";

export const createDeal = (input: DealInput) => api<{ id: string; slug: string; status: string }>("/api/merchant/deals", { body: input });
export const updateDeal = (id: string, input: DealInput) => api<{ id: string; status: string }>(`/api/merchant/deals/${id}`, { method: "PUT", body: input });

/** Shrinks a photo to at most 1600px and re-encodes it as JPEG, stepping quality down until it is under ~700 KB. */
export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      let quality = 0.85;
      let url = canvas.toDataURL("image/jpeg", quality);
      while (url.length > 950_000 && quality > 0.4) url = canvas.toDataURL("image/jpeg", (quality -= 0.1));
      resolve(url);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/** Resizes in the browser and stores the photo with the deal data; returns its public URL. */
export async function uploadImage(file: File, endpoint = "/api/merchant/uploads") {
  const dataUrl = await resizeImage(file);
  return api<{ url: string }>(endpoint, { body: { contentType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) } });
}

export const lookupVoucher = (code: string) => api<RedeemLookupDTO>("/api/merchant/vouchers/lookup", { body: { code } });
export const redeemVoucher = (code: string) => api<RedeemLookupDTO>("/api/merchant/vouchers/redeem", { body: { code } });
