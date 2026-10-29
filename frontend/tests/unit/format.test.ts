import { describe, expect, it } from "vitest";
import { discountPct, expiryFromToday, formatMoney, formatPct, itemTitle, loc } from "../../src/lib/format";
import { createTranslator } from "../../src/i18n/translate";
import en from "../../messages/en.json";
import fi from "../../messages/fi.json";
import sv from "../../messages/sv.json";

describe("format", () => {
  it("formats euros per locale", () => {
    expect(formatMoney(5900, "fi").replace(/\s/g, " ")).toBe("59,00 €");
    expect(formatMoney(5900, "en")).toBe("€59.00");
  });
  it("formats VAT rates from basis points", () => {
    expect(formatPct(2550, "fi")).toBe("25,5 %");
    expect(formatPct(2550, "en")).toBe("25.5%");
  });
  it("falls back to Finnish when a translation is empty", () => {
    expect(loc({ fi: "Hieronta", sv: "", en: "Massage" }, "sv")).toBe("Hieronta");
    expect(itemTitle({ fi: "Hieronta 60 tai 90 min", sv: "", en: "" }, { fi: "Hieronta", sv: "", en: "" }, { fi: "90 min", sv: "", en: "" }, "fi")).toBe("Hieronta – 90 min");
  });
  it("only shows a discount when the reference price is higher", () => {
    expect(discountPct(3900, 5500)).toBe(29);
    expect(discountPct(3900, null)).toBeNull();
    expect(discountPct(3900, 3000)).toBeNull();
  });
  it("computes voucher expiry 3 calendar months ahead, clamped to month end", () => {
    expect(expiryFromToday(3, new Date(2026, 10, 30)).getDate()).toBe(28);
  });
});

describe("translations", () => {
  const flatten = (o: object, p = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? flatten(v, `${p}${k}.`) : [`${p}${k}`]));

  it("has the same keys in fi, sv and en", () => {
    const keys = flatten(fi).sort();
    expect(flatten(sv).sort()).toEqual(keys);
    expect(flatten(en).sort()).toEqual(keys);
  });

  it("interpolates and falls back", () => {
    const t = createTranslator(sv, fi);
    expect(t("deal.validUntil", { date: "1.1.2027" })).toBe("Giltigt till 1.1.2027");
    expect(t("errors.someUnknownCode")).toBe(sv.errors.generic);
  });
});
