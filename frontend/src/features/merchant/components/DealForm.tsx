"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { dealInputSchema, VAT_RATES_BPS, type DealDetailDTO, type DealInput, type SplitDTO } from "@vendelia/shared";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { formatMoney, formatPct, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { createDeal, previewCommission, updateDeal, uploadImage } from "../api";
import { splitPrice } from "@/features/portal-demo/money";

const toCents = (euros: string) => Math.round(parseFloat(euros.replace(",", ".")) * 100);
const toEuros = (cents: number | null | undefined) => (cents ? (cents / 100).toFixed(2) : "");
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const VAT_KEYS: Record<number, string> = { 2550: "business.vatGeneral", 1350: "business.vatReduced", 1000: "business.vatLow" };

interface OptionRow { id?: string; label: string; price: string }

/** Shrinks a photo to at most 1200px JPEG so it fits in browser storage (demo mode). */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create or edit a deal. Shows what the merchant receives per voucher as they type.
 * With `onSave` (demo mode, no API) the deal is handed to the caller, the split is computed locally
 * and photos are kept as resized data URLs.
 */
export function DealForm({
  deal,
  initial,
  onSave,
}: {
  deal?: DealDetailDTO & { merchantId: string };
  initial?: DealInput;
  onSave?: (input: DealInput) => void | Promise<void>;
}) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const router = useRouter();
  const toast = useToast();
  const src = deal ?? initial;
  const [f, setF] = useState({
    titleFi: src?.title.fi ?? "",
    titleSv: src?.title.sv ?? "",
    titleEn: src?.title.en ?? "",
    descFi: src?.description.fi ?? "",
    restrictions: src?.restrictions.fi ?? "",
    inclusions: src?.inclusions.fi.join("\n") ?? "",
    terms: src?.terms.fi.join("\n") ?? "",
    howTo: src?.howTo.fi.join("\n") ?? "",
    categoryId: src?.categoryId ?? meta.categories[0]?.id ?? "",
    cityId: src?.cityId ?? meta.cities[0]?.id ?? "",
    area: deal?.area.fi ?? initial?.area ?? "",
    street: src?.street ?? "",
    zip: src?.zip ?? "",
    vatBps: src?.vatBps ?? 2550,
    reference: toEuros(src?.referencePriceCents),
    imageUrl: src?.imageUrl ?? "",
  });
  const [options, setOptions] = useState<OptionRow[]>(
    src?.options.map((o) => ({ id: o.id, label: o.label?.fi ?? "", price: toEuros(o.priceCents) })) ?? [{ label: "", price: "" }],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [split, setSplit] = useState<SplitDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const err = (k: string) => (errors[k] ? t(`errors.${errors[k]}`) : undefined);

  const firstPrice = toCents(options[0]?.price ?? "");
  useEffect(() => {
    if (!Number.isFinite(firstPrice) || firstPrice <= 0) return setSplit(null);
    if (onSave) return setSplit(splitPrice(firstPrice, f.vatBps, meta.commissionBps, meta.commissionVatBps));
    const timer = setTimeout(() => previewCommission(firstPrice, f.vatBps).then((r) => setSplit(r.split)).catch(() => setSplit(null)), 250);
    return () => clearTimeout(timer);
  }, [firstPrice, f.vatBps, onSave, meta.commissionBps, meta.commissionVatBps]);

  function build(): DealInput | null {
    const ref = f.reference ? toCents(f.reference) : null;
    const raw = {
      title: { fi: f.titleFi, sv: f.titleSv, en: f.titleEn },
      description: { fi: f.descFi, sv: "", en: "" },
      restrictions: { fi: f.restrictions, sv: "", en: "" },
      inclusions: { fi: lines(f.inclusions), sv: [], en: [] },
      terms: { fi: lines(f.terms), sv: [], en: [] },
      howTo: { fi: lines(f.howTo), sv: [], en: [] },
      categoryId: f.categoryId,
      cityId: f.cityId,
      area: f.area,
      street: f.street,
      zip: f.zip,
      vatBps: f.vatBps,
      referencePriceCents: ref,
      imageUrl: f.imageUrl,
      options: options.map((o) => ({ id: o.id, label: o.label ? { fi: o.label, sv: "", en: "" } : null, priceCents: toCents(o.price) || 0 })),
    };
    const parsed = dealInputSchema.safeParse(raw);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[i.path.join(".")] ??= i.message;
      setErrors(next);
      return null;
    }
    setErrors({});
    return parsed.data;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const input = build();
    if (!input) return;
    setBusy(true);
    try {
      if (onSave) await onSave(input);
      else if (deal) await updateDeal(deal.id, input);
      else await createDeal(input);
      toast(t("business.submitted"));
      router.push(`/${locale}/business`);
      router.refresh();
    } catch (e2) {
      if (e2 instanceof ApiError) setErrors(Object.keys(e2.fields).length ? e2.fields : { _: e2.code });
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      set("imageUrl", onSave ? await resizeImage(file) : (await uploadImage(file)).url);
    } catch (e2) {
      setErrors((p) => ({ ...p, imageUrl: e2 instanceof ApiError ? e2.code : "network" }));
    } finally {
      setUploading(false);
    }
  }

  const L = ({ k, label, cls = "" }: { k: keyof SplitDTO; label: string; cls?: string }) =>
    split ? <div className={`summary-line ${cls}`}><span>{label}</span><span>{k === "commissionCents" || k === "commissionVatCents" ? "−" : ""}{formatMoney(split[k], locale)}</span></div> : null;

  return (
    <form className="split" style={{ marginTop: "var(--s3)" }} onSubmit={submit} noValidate>
      <div className="card pad form-grid">
        {errors._ && <Notice tone="danger" icon="xc">{t(`errors.${errors._}`)}</Notice>}
        <Field id="t-fi" label={t("business.offerTitle")} required error={err("title.fi")}>
          <TextInput id="t-fi" value={f.titleFi} onChange={(e) => set("titleFi", e.target.value)} error={err("title.fi")} />
        </Field>
        <details>
          <summary className="label" style={{ cursor: "pointer" }}>{t("business.translations")}</summary>
          <div className="form-grid two" style={{ marginTop: 12 }}>
            <Field id="t-sv" label={t("business.titleSv")}><TextInput id="t-sv" value={f.titleSv} onChange={(e) => set("titleSv", e.target.value)} /></Field>
            <Field id="t-en" label={t("business.titleEn")}><TextInput id="t-en" value={f.titleEn} onChange={(e) => set("titleEn", e.target.value)} /></Field>
          </div>
        </details>
        <Field id="desc" label={t("business.description")} required error={err("description.fi")}>
          <TextArea id="desc" value={f.descFi} onChange={(e) => set("descFi", e.target.value)} error={err("description.fi")} />
        </Field>
        <div className="form-grid two">
          <Field id="cat" label={t("business.category")}>
            <select id="cat" className="select" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {meta.categories.map((c) => <option key={c.id} value={c.id}>{loc(c.name, locale)}</option>)}
            </select>
          </Field>
          <Field id="city" label={t("business.city")}>
            <select id="city" className="select" value={f.cityId} onChange={(e) => set("cityId", e.target.value)}>
              {meta.cities.map((c) => <option key={c.id} value={c.id}>{loc(c.name, locale)}</option>)}
            </select>
          </Field>
        </div>
        <div className="form-grid two">
          <Field id="street" label={t("business.street")} required error={err("street")}>
            <TextInput id="street" value={f.street} onChange={(e) => set("street", e.target.value)} error={err("street")} />
          </Field>
          <div className="form-grid two">
            <Field id="zip" label={t("business.zip")} required error={err("zip")}>
              <TextInput id="zip" inputMode="numeric" value={f.zip} onChange={(e) => set("zip", e.target.value)} error={err("zip")} />
            </Field>
            <Field id="area" label={t("business.area")}>
              <TextInput id="area" value={f.area} onChange={(e) => set("area", e.target.value)} />
            </Field>
          </div>
        </div>

        <fieldset className="stack">
          <legend className="label" style={{ marginBottom: 8 }}>{t("business.options")}</legend>
          {options.map((o, i) => (
            <div className="form-grid two" key={o.id ?? i} style={{ alignItems: "end" }}>
              <Field id={`ol-${i}`} label={t("business.optionLabel")} hint={i === 0 && options.length === 1 ? t("business.optionLabelHint") : undefined}>
                <TextInput id={`ol-${i}`} value={o.label} placeholder={t("business.optionPlaceholder")} onChange={(e) => setOptions((p) => p.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
              </Field>
              <div className="row" style={{ alignItems: "end" }}>
                <Field id={`op-${i}`} label={t("business.priceInclVat")} required error={err(`options.${i}.priceCents`)}>
                  <TextInput id={`op-${i}`} inputMode="decimal" value={o.price} placeholder="35,00" onChange={(e) => setOptions((p) => p.map((x, k) => (k === i ? { ...x, price: e.target.value } : x)))} error={err(`options.${i}.priceCents`)} />
                </Field>
                {options.length > 1 && (
                  <button type="button" className="btn btn-ghost" aria-label={t("business.removeOption")} onClick={() => setOptions((p) => p.filter((_, k) => k !== i))}><Icon name="trash" /></button>
                )}
              </div>
            </div>
          ))}
          {options.length < 6 && (
            <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setOptions((p) => [...p, { label: "", price: "" }])}>
              <Icon name="plus" />{t("business.addOption")}
            </button>
          )}
        </fieldset>

        <div className="form-grid two">
          <Field id="vat" label={t("business.vatRate")} hint={t("business.vatHint")}>
            <select id="vat" className="select" value={f.vatBps} onChange={(e) => set("vatBps", Number(e.target.value))}>
              {VAT_RATES_BPS.map((v) => <option key={v} value={v}>{formatPct(v, locale)} – {t(VAT_KEYS[v]!)}</option>)}
            </select>
          </Field>
          <Field id="ref" label={t("business.referencePrice")} hint={t("business.referenceHint")}>
            <TextInput id="ref" inputMode="decimal" value={f.reference} placeholder="45,00" onChange={(e) => set("reference", e.target.value)} hint />
          </Field>
        </div>
        <Field id="restr" label={t("business.restrictionsShort")} required error={err("restrictions.fi")}>
          <TextInput id="restr" value={f.restrictions} placeholder={t("business.restrictionsPlaceholder")} onChange={(e) => set("restrictions", e.target.value)} error={err("restrictions.fi")} />
        </Field>
        <Field id="incl" label={t("business.inclusions")} required error={err("inclusions.fi")}>
          <TextArea id="incl" value={f.inclusions} onChange={(e) => set("inclusions", e.target.value)} error={err("inclusions.fi")} />
        </Field>
        <Field id="terms" label={t("business.terms")} required error={err("terms.fi")}>
          <TextArea id="terms" value={f.terms} onChange={(e) => set("terms", e.target.value)} error={err("terms.fi")} />
        </Field>
        <Field id="how" label={t("business.howTo")} required error={err("howTo.fi")} hint={t("business.howToHint")}>
          <TextArea id="how" value={f.howTo} onChange={(e) => set("howTo", e.target.value)} error={err("howTo.fi")} />
        </Field>
        <Field id="img" label={t("business.photo")} required error={err("imageUrl")} hint={t("business.photoHint")}>
          <input id="img" className="input" type="file" accept="image/jpeg,image/png,image/webp" style={{ paddingTop: 11 }} onChange={(e) => onFile(e.target.files?.[0])} />
        </Field>
        {uploading && <p className="hint">{t("business.uploading")}</p>}
        {f.imageUrl && <img src={f.imageUrl} alt="" style={{ maxWidth: 240, borderRadius: 8 }} />}
        <div className="row wrap-row">
          <button className="btn btn-primary" type="submit" disabled={busy || uploading}>{t("business.submitReview")}</button>
        </div>
      </div>

      <aside className="card pad stack breakdown" aria-labelledby="bd" style={{ position: "sticky", top: 24 }}>
        <h2 id="bd" style={{ fontSize: 18 }}>{t("business.perVoucher")}</h2>
        <div aria-live="polite">
          {split ? (
            <>
              <L k="grossCents" label={t("business.customerPays")} />
              <L k="saleVatCents" label={t("business.saleVat", { rate: formatPct(f.vatBps, locale) })} cls="muted" />
              <L k="netCents" label={t("business.commissionBase")} cls="muted" />
              <L k="commissionCents" label={t("business.commission", { rate: formatPct(meta.commissionBps, locale) })} />
              <L k="commissionVatCents" label={t("business.commissionVat", { rate: formatPct(meta.commissionVatBps, locale) })} />
              <L k="payoutCents" label={t("business.yourPayout")} cls="total" />
              <p className="hint" style={{ marginTop: 8 }}>
                {t("business.totalDeduction", { amount: formatMoney(split.feeCents, locale), pct: formatPct(Math.round((split.feeCents / split.grossCents) * 10000), locale) })}
              </p>
            </>
          ) : (
            <p className="muted small">{t("business.enterPrice")}</p>
          )}
        </div>
        <p className="hint">{t("business.commissionNote", { rate: formatPct(meta.commissionBps, locale) })}</p>
      </aside>
    </form>
  );
}
