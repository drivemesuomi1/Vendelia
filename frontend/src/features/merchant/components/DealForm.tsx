"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { dealInputSchema, VAT_RATES_BPS, type DealInput, type SplitDTO } from "@vendelia/shared";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { formatMoney, formatPct, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { createDeal, resizeImage, updateDeal, uploadImage } from "../api";
import { PhotoManager } from "./PhotoManager";
import { splitPrice } from "@/features/portal-demo/money";

const toCents = (euros: string) => Math.round(parseFloat(euros.replace(",", ".")) * 100);
const toEuros = (cents: number | null | undefined) => (cents ? (cents / 100).toFixed(2) : "");
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const fiOnly = (text: string) => ({ fi: text, sv: "", en: "" });
const VAT_KEYS: Record<number, string> = { 2550: "business.vatGeneral", 1350: "business.vatReduced", 1000: "business.vatLow" };
const MAX_OPTIONS = 12;
const MAX_SECTIONS = 4;

interface OptionRow { key: string; id?: string; label: string; price: string; reference: string }
interface Section { key: string; name: string; options: OptionRow[] }

// Keys for rows added while editing; rows from the saved deal get fixed keys so server and browser render the same ids.
let keySeq = 0;
const newKey = () => `n${++keySeq}`;
const emptyOption = (key = newKey()): OptionRow => ({ key, label: "", price: "", reference: "" });

/** Options as the form edits them: consecutive options with the same section heading form one section. */
function toSections(input?: DealInput): Section[] {
  let n = 0;
  const initialKey = () => `i${n++}`;
  if (!input?.options.length) return [{ key: initialKey(), name: "", options: [emptyOption(initialKey())] }];
  // Older deals have one regular price for the whole deal: show it on the cheapest option.
  const cheapest = input.options.reduce((a, b) => (b.priceCents < a.priceCents ? b : a));
  const perOption = input.options.some((o) => o.referencePriceCents);
  const sections: Section[] = [];
  for (const o of input.options) {
    const reference = perOption ? o.referencePriceCents : o === cheapest ? input.referencePriceCents : null;
    const row = { key: initialKey(), id: o.id, label: o.label?.fi ?? "", price: toEuros(o.priceCents), reference: toEuros(reference) };
    const last = sections[sections.length - 1];
    if (last && last.name === (o.group?.fi ?? "")) last.options.push(row);
    else sections.push({ key: initialKey(), name: o.group?.fi ?? "", options: [row] });
  }
  return sections;
}

/**
 * Create or edit a deal. Shows what the merchant receives per voucher as they type, and reports every change
 * through `onDraft` so a live preview can follow. Options can optionally be grouped into sections
 * ("Home cleaning", "Move-out cleaning"), shown to customers as tabs with one tile per option.
 * With `dealId` the deal is updated (and goes back to review); without it a new deal is submitted.
 * With `onSave` (demo mode, no API) the deal is handed to the caller and photos are kept as resized data URLs.
 * `onPreview` adds a Preview button next to submit; `onInvalid` runs when a submit is refused, so a caller showing
 * the preview instead of the form can bring the form (and its errors) back.
 * `admin` edits a business's deal as an admin: saved through the admin API (status kept), photos stored under the
 * deal's business, then back to `admin.doneHref`.
 */
export function DealForm({
  dealId,
  initial,
  onSave,
  onDraft,
  onPreview,
  onInvalid,
  formId,
  admin,
}: {
  dealId?: string;
  initial?: DealInput;
  onSave?: (input: DealInput) => void | Promise<void>;
  onDraft?: (draft: DealInput) => void;
  onPreview?: () => void;
  onInvalid?: () => void;
  formId?: string;
  admin?: { save: (input: DealInput) => Promise<unknown>; upload: (file: File) => Promise<string>; doneHref: string };
}) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const router = useRouter();
  const toast = useToast();
  const src = initial;
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
    area: src?.area ?? "",
    street: src?.street ?? "",
    zip: src?.zip ?? "",
    vatBps: src?.vatBps ?? 2550,
  });
  // Cover photo first, then the gallery in display order.
  const [photos, setPhotos] = useState<string[]>(src ? [src.imageUrl, ...(src.galleryUrls ?? [])].filter(Boolean) : []);
  const [sections, setSections] = useState<Section[]>(() => toSections(src));
  const [sectioned, setSectioned] = useState(() => !!src?.options.some((o) => o.group));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // The option whose breakdown the payout box shows: the one last edited (the first until then).
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const err = (k: string) => (errors[k] ? t(`errors.${errors[k]}`) : undefined);

  const rows = sections.flatMap((s) => s.options.map((o) => ({ section: s, option: o })));
  const indexOf = new Map(rows.map((r, i) => [r.option.key, i]));
  const editSection = (key: string, change: (s: Section) => Section) => setSections((p) => p.map((s) => (s.key === key ? change(s) : s)));
  const editOption = (key: string, change: Partial<OptionRow>) =>
    setSections((p) => p.map((s) => ({ ...s, options: s.options.map((o) => (o.key === key ? { ...o, ...change } : o)) })));
  const removeOption = (key: string) => setSections((p) => p.map((s) => ({ ...s, options: s.options.filter((o) => o.key !== key) })));
  const toggleSections = (on: boolean) => {
    setSectioned(on);
    // Turning sections off keeps every option, in order, in one list.
    if (!on) setSections((p) => [{ key: p[0]!.key, name: "", options: p.flatMap((s) => s.options) }]);
  };

  // Same rule as the backend: commission on the VAT-exclusive price, VAT on the commission.
  const splitOf = (price: string): SplitDTO | null => {
    const cents = toCents(price);
    return Number.isFinite(cents) && cents > 0 ? splitPrice(cents, f.vatBps, meta.commissionBps, meta.commissionVatBps) : null;
  };
  const shown = rows.find((r) => r.option.key === focusKey) ?? rows[0];
  const split = shown ? splitOf(shown.option.price) : null;
  const nameOf = ({ section, option }: (typeof rows)[number], i: number) =>
    [sectioned ? section.name.trim() : "", option.label.trim()].filter(Boolean).join(": ") || t("business.optionN", { n: i + 1 });

  /** The form as a deal, before validation (the preview shows it as typed). */
  function raw() {
    const options = rows.map(({ section, option }) => ({
      id: option.id,
      label: option.label.trim() ? fiOnly(option.label.trim()) : null,
      group: sectioned ? fiOnly(section.name.trim()) : null,
      priceCents: toCents(option.price) || 0,
      referencePriceCents: option.reference.trim() ? toCents(option.reference) || 0 : null,
    }));
    // Cards show the cheapest option's regular price.
    const cheapest = options.reduce<(typeof options)[number] | null>((a, b) => (!a || b.priceCents < a.priceCents ? b : a), null);
    return {
      title: { fi: f.titleFi, sv: f.titleSv, en: f.titleEn },
      description: fiOnly(f.descFi),
      restrictions: fiOnly(f.restrictions),
      inclusions: { fi: lines(f.inclusions), sv: [], en: [] },
      terms: { fi: lines(f.terms), sv: [], en: [] },
      howTo: { fi: lines(f.howTo), sv: [], en: [] },
      categoryId: f.categoryId,
      cityId: f.cityId,
      area: f.area,
      street: f.street,
      zip: f.zip,
      vatBps: f.vatBps,
      referencePriceCents: cheapest?.referencePriceCents ?? null,
      imageUrl: photos[0] ?? "",
      galleryUrls: photos.slice(1),
      options,
    };
  }

  useEffect(() => {
    if (!onDraft) return;
    const timer = setTimeout(() => onDraft(raw() as DealInput), 120);
    return () => clearTimeout(timer);
    // raw() reads exactly these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, sections, sectioned, photos, onDraft]);

  function build(): DealInput | null {
    const parsed = dealInputSchema.safeParse(raw());
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[i.path.join(".")] ??= i.message;
      setErrors(next);
      onInvalid?.();
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
      if (admin) await admin.save(input);
      else if (onSave) await onSave(input);
      else if (dealId) await updateDeal(dealId, input);
      else await createDeal(input);
      toast(t(admin ? "admin.de.saved" : "business.submitted"));
      router.push(admin ? admin.doneHref : `/${locale}/business`);
      router.refresh();
    } catch (e2) {
      if (e2 instanceof ApiError) setErrors(Object.keys(e2.fields).length ? e2.fields : { _: e2.code });
      onInvalid?.();
      setBusy(false);
    }
  }

  // Browser demo mode keeps resized photos as data URLs; otherwise each file is stored and its URL returned.
  const uploadPhoto = async (file: File) => (admin ? admin.upload(file) : onSave ? resizeImage(file) : (await uploadImage(file)).url);

  const L = ({ k, label, cls = "" }: { k: keyof SplitDTO; label: string; cls?: string }) =>
    split ? <div className={`summary-line ${cls}`}><span>{label}</span><span>{k === "commissionCents" || k === "commissionVatCents" ? "−" : ""}{formatMoney(split[k], locale)}</span></div> : null;

  const optionRow = (section: Section, o: OptionRow) => {
    const i = indexOf.get(o.key)!;
    const canRemove = section.options.length > 1;
    return (
      <div className="opt-row" key={o.key} onFocusCapture={() => setFocusKey(o.key)}>
        <Field id={`ol-${o.key}`} label={t("business.optionLabel")} required={sectioned} error={err(`options.${i}.label.fi`)}>
          <TextInput id={`ol-${o.key}`} value={o.label} placeholder={t(sectioned ? "business.optionTilePlaceholder" : "business.optionPlaceholder")} onChange={(e) => editOption(o.key, { label: e.target.value })} error={err(`options.${i}.label.fi`)} />
        </Field>
        <Field id={`op-${o.key}`} label={t("business.priceInclVat")} required error={err(`options.${i}.priceCents`)}>
          <TextInput id={`op-${o.key}`} inputMode="decimal" value={o.price} placeholder="35,00" onChange={(e) => editOption(o.key, { price: e.target.value })} error={err(`options.${i}.priceCents`)} />
        </Field>
        <Field id={`or-${o.key}`} label={t("business.regularPrice")} error={err(`options.${i}.referencePriceCents`)}>
          <div className="input-action">
            <TextInput id={`or-${o.key}`} inputMode="decimal" value={o.reference} placeholder="45,00" onChange={(e) => editOption(o.key, { reference: e.target.value })} error={err(`options.${i}.referencePriceCents`)} />
            {canRemove && (
              <button type="button" className="btn btn-ghost btn-icon" aria-label={t("business.removeOption")} title={t("business.removeOption")} onClick={() => removeOption(o.key)}><Icon name="trash" /></button>
            )}
          </div>
        </Field>
      </div>
    );
  };
  const addOptionButton = (section: Section) => rows.length < MAX_OPTIONS && (
    <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => editSection(section.key, (s) => ({ ...s, options: [...s.options, emptyOption()] }))}>
      <Icon name="plus" />{t("business.addOption")}
    </button>
  );

  const payout = (
    <aside className="card pad stack breakdown breakdown-side" aria-labelledby="bd">
      <h2 id="bd" style={{ fontSize: 18 }}>{t("business.perVoucher")}</h2>
      {rows.length > 1 && split && shown && <p className="breakdown-for">{t("business.breakdownFor", { name: nameOf(shown, rows.indexOf(shown)) })}</p>}
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
      {rows.length > 1 && (
        <div className="payout-list">
          <h3>{t("business.allOptions")}</h3>
          <ul>
            {rows.map((r, i) => {
              const sp = splitOf(r.option.price);
              return (
                <li key={r.option.key} className={r.option === shown?.option ? "is-shown" : undefined}>
                  <button type="button" onClick={() => setFocusKey(r.option.key)} aria-pressed={r.option === shown?.option}>
                    <span className="payout-name">{nameOf(r, i)}</span>
                    <span className="payout-gross">{sp ? formatMoney(sp.grossCents, locale) : "–"}</span>
                    <b className="payout-net">{sp ? formatMoney(sp.payoutCents, locale) : "–"}</b>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="payout-head"><span /><span>{t("business.customerPays")}</span><span>{t("business.yourPayout")}</span></p>
        </div>
      )}
      <p className="hint">{t("business.commissionNote", { rate: formatPct(meta.commissionBps, locale) })}</p>
    </aside>
  );

  return (
    <form id={formId} className="split" style={{ marginTop: "var(--s3)" }} onSubmit={submit} noValidate>
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

        <fieldset className="stack opt-fieldset">
          <legend className="label">{t("business.options")}</legend>
          <label className="opt-toggle">
            <input type="checkbox" checked={sectioned} onChange={(e) => toggleSections(e.target.checked)} />
            <span>
              <b>{t("business.useSections")}</b>
              <small className="muted">{t("business.useSectionsHint")}</small>
            </span>
          </label>

          {sectioned ? (
            <>
              {sections.map((section, k) => {
                const nameError = section.options.map((o) => err(`options.${indexOf.get(o.key)}.group.fi`)).find(Boolean);
                return (
                  <div className="opt-section" key={section.key}>
                    <Field id={`sec-${section.key}`} label={t("business.sectionName", { n: k + 1 })} required error={nameError}>
                      <div className="input-action">
                        <TextInput id={`sec-${section.key}`} value={section.name} placeholder={t(k === 0 ? "business.sectionPlaceholder1" : "business.sectionPlaceholder2")} onChange={(e) => editSection(section.key, (s) => ({ ...s, name: e.target.value }))} error={nameError} />
                        {sections.length > 1 && (
                          <button type="button" className="btn btn-ghost btn-icon" aria-label={t("business.removeSection")} title={t("business.removeSection")} onClick={() => setSections((p) => p.filter((s) => s.key !== section.key))}><Icon name="trash" /></button>
                        )}
                      </div>
                    </Field>
                    {section.options.map((o) => optionRow(section, o))}
                    {addOptionButton(section)}
                  </div>
                );
              })}
              {sections.length < MAX_SECTIONS && rows.length < MAX_OPTIONS && (
                <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setSections((p) => [...p, { key: newKey(), name: "", options: [emptyOption()] }])}>
                  <Icon name="plus" />{t("business.addSection")}
                </button>
              )}
            </>
          ) : (
            <>
              {sections[0]!.options.map((o) => optionRow(sections[0]!, o))}
              {rows.length === 1 && <p className="hint">{t("business.optionLabelHint")}</p>}
              {addOptionButton(sections[0]!)}
            </>
          )}
          <p className="hint">{t("business.referenceHint")}</p>
        </fieldset>

        <Field id="vat" label={t("business.vatRate")} hint={t("business.vatHint")}>
          <select id="vat" className="select" value={f.vatBps} onChange={(e) => set("vatBps", Number(e.target.value))}>
            {VAT_RATES_BPS.map((v) => <option key={v} value={v}>{formatPct(v, locale)} – {t(VAT_KEYS[v]!)}</option>)}
          </select>
        </Field>
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
        <Field id="img" label={t("business.photos")} required>
          <PhotoManager photos={photos} onChange={setPhotos} upload={uploadPhoto} error={errors.imageUrl ?? errors["galleryUrls"] ?? Object.entries(errors).find(([k]) => k.startsWith("galleryUrls."))?.[1]} />
        </Field>
        <div className="form-actions">
          <p className="form-actions-note"><Icon name={admin ? "info" : "clock"} />{t(admin ? "admin.de.note" : "business.reviewNote")}</p>
          <div className="form-actions-btns">
            {onPreview && <button className="btn btn-secondary" type="button" onClick={onPreview}><Icon name="eye" />{t("business.preview")}</button>}
            <button className="btn btn-primary" type="submit" disabled={busy}><Icon name={admin ? "check" : "send"} />{t(busy ? (admin ? "admin.de.saving" : "business.submitting") : admin ? "admin.de.save" : "business.submitReview")}</button>
          </div>
        </div>
      </div>
      {payout}
    </form>
  );
}
