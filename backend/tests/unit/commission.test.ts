import { describe, expect, it } from "vitest";
import { splitSale } from "../../src/domain/commission";
import { netFromGross, vatIncluded } from "../../src/domain/vat";

describe("splitSale", () => {
  it("matches the brief's worked example at 25.5 % VAT", () => {
    const s = splitSale(10000, 2550);
    expect(s.netCents).toBe(7968);
    expect(s.saleVatCents).toBe(2032);
    expect(s.commissionCents).toBe(1195);
    expect(s.commissionVatCents).toBe(305);
    expect(s.feeCents).toBe(1500);
    expect(s.payoutCents).toBe(8500);
  });

  it("uses the deal's own VAT rate (13.5 % restaurant deal)", () => {
    const s = splitSale(10000, 1350);
    expect(s.netCents).toBe(8811);
    expect(s.commissionCents).toBe(1322);
    expect(s.commissionVatCents).toBe(337);
    expect(s.payoutCents).toBe(8341);
  });

  it("always balances: payout + fee = gross", () => {
    for (const gross of [100, 999, 3200, 5900, 15200, 123456]) {
      for (const vat of [2550, 1350, 1000]) {
        const s = splitSale(gross, vat);
        expect(s.payoutCents + s.feeCents).toBe(gross);
        expect(s.netCents + s.saleVatCents).toBe(gross);
      }
    }
  });

  it("supports a configurable commission rate", () => {
    expect(splitSale(10000, 2550, 1000).commissionCents).toBe(797);
    expect(splitSale(10000, 2550, 0).payoutCents).toBe(10000);
  });
});

describe("vat", () => {
  it("extracts VAT from VAT-inclusive prices", () => {
    expect(netFromGross(5900, 2550)).toBe(4701);
    expect(vatIncluded(5900, 2550)).toBe(1199);
    expect(vatIncluded(7900, 1350)).toBe(940);
  });
});
