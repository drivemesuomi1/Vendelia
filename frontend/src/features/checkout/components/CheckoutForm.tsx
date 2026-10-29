"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BANKS, checkoutSchema, type PaymentMethod } from "@vendelia/shared";
import { Dialog } from "@/components/ui/Dialog";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatMoney, itemTitle, expiryFromToday } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { useCartQuote } from "@/features/cart/api";
import { CartTotals } from "@/features/cart/components/CartLines";
import { useCart } from "@/features/cart/store";
import { confirmMockPayment, createOrder, rememberOrderToken } from "../api";
import { CheckoutSteps } from "./CheckoutSteps";

type Errors = Record<string, string>;


export function CheckoutForm() {
  const { t, locale } = useI18n();
  const { meta, user } = useAppData();
  const router = useRouter();
  const cart = useCart();
  const { quote } = useCartQuote(cart.items, cart.ready);
  const [form, setForm] = useState({
    email: user?.email ?? "",
    firstName: "",
    lastName: "",
    phone: "",
    gift: false,
    recipientName: "",
    message: "",
    method: "bank" as PaymentMethod,
    bank: "",
    acceptTerms: false,
    newsletter: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [paying, setPaying] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cart.ready && !cart.items.length && !paying) router.replace(`/${locale}/cart`);
  }, [cart.ready, cart.items.length, paying, locale, router]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const err = (path: string) => (errors[path] ? t(`errors.${errors[path]}`) : undefined);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const payload = {
      items: cart.items,
      contact: { email: form.email, firstName: form.firstName, lastName: form.lastName, phone: form.phone },
      gift: { enabled: form.gift, recipientName: form.recipientName, message: form.message },
      payment: { method: form.method, bank: form.method === "bank" ? form.bank : undefined },
      acceptTerms: form.acceptTerms,
      newsletter: form.newsletter,
    };
    // Same Zod schema as the API, so the user sees errors before a round-trip.
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Errors = {};
      for (const i of parsed.error.issues) next[i.path.join(".")] ??= i.message;
      setErrors(next);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setErrors({});
    const methodName = form.method === "bank" ? form.bank : form.method === "mobilepay" ? "MobilePay" : t("checkout.cardPayment");
    setPaying(methodName);
    try {
      const order = await createOrder(parsed.data, locale);
      rememberOrderToken(order.orderId, order.accessToken);
      if (order.payment.action === "redirect" && order.payment.redirectUrl) {
        window.location.href = order.payment.redirectUrl;
        return;
      }
      // Mock provider: simulate the bank/MobilePay step, then confirm.
      await new Promise((r) => setTimeout(r, 1200));
      await confirmMockPayment(order.orderId, order.accessToken);
      cart.clear();
      router.push(`/${locale}/checkout/success?order=${order.orderId}`);
    } catch (e2) {
      setPaying(null);
      if (e2 instanceof ApiError && Object.keys(e2.fields).length) setErrors(e2.fields);
      // A missing or failing payment API is not the customer's mistake: say so instead of "check the details".
      const down = e2 instanceof ApiError && (e2.status === 404 || e2.status >= 500);
      setServerError(down ? "paymentUnavailable" : e2 instanceof ApiError ? e2.code : "network");
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  const errorList = Object.entries(errors);
  const fieldIdFor = (path: string) =>
    ({ "contact.email": "email", "contact.firstName": "fn", "contact.lastName": "ln", "gift.recipientName": "gname", "payment.bank": "bank-OP", acceptTerms: "terms" })[path] ?? "email";

  return (
    <main className="wrap" style={{ paddingTop: "var(--s4)" }}>
      <Link className="btn btn-ghost" href={`/${locale}/cart`} style={{ marginLeft: -8 }}>
        <Icon name="left" /> {t("checkout.backToCart")}
      </Link>
      <h1 style={{ fontSize: "clamp(26px,4vw,34px)", margin: "8px 0 var(--s2)" }}>{t("checkout.title")}</h1>
      <CheckoutSteps current={2} />

      <form className="checkout" onSubmit={submit} noValidate>
        <div className="stack">
          {(errorList.length > 0 || serverError) && (
            <div className="err-sum" role="alert" tabIndex={-1} ref={summaryRef}>
              {errorList.length > 0 ? (
                <>
                  <b>{t("checkout.checkFields")}</b>
                  <ul>
                    {errorList.map(([path, code]) => (
                      <li key={path}>
                        <a href={`#${fieldIdFor(path)}`}>{t(`errors.${code}`)}</a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>{t(`errors.${serverError}`)}</p>
              )}
            </div>
          )}

          <fieldset className="card pad stack">
            <legend className="sr-only">{t("checkout.contact")}</legend>
            <h2 style={{ fontSize: 20 }} aria-hidden="true">{t("checkout.contact")}</h2>
            <Field id="email" label={t("checkout.email")} required error={err("contact.email")} hint={t("checkout.emailHint")}>
              <TextInput id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} error={err("contact.email")} hint />
            </Field>
            <div className="form-grid two">
              <Field id="fn" label={t("checkout.firstName")} required error={err("contact.firstName")}>
                <TextInput id="fn" autoComplete="given-name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} error={err("contact.firstName")} />
              </Field>
              <Field id="ln" label={t("checkout.lastName")} required error={err("contact.lastName")}>
                <TextInput id="ln" autoComplete="family-name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} error={err("contact.lastName")} />
              </Field>
            </div>
            <Field id="tel" label={<>{t("checkout.phone")} <span className="muted">{t("common.optional")}</span></>} hint={t("checkout.phoneHint")}>
              <TextInput id="tel" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} hint />
            </Field>
          </fieldset>

          <fieldset className="card pad stack">
            <legend className="sr-only">{t("checkout.gift")}</legend>
            <label className="check">
              <input type="checkbox" checked={form.gift} onChange={(e) => set("gift", e.target.checked)} />
              <span>
                <b>{t("checkout.buyAsGift")}</b>
                <br />
                <span className="muted small">{t("checkout.giftHint")}</span>
              </span>
            </label>
            {form.gift && (
              <div className="stack">
                <Field id="gname" label={t("checkout.recipient")} required error={err("gift.recipientName")}>
                  <TextInput id="gname" value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} error={err("gift.recipientName")} autoFocus />
                </Field>
                <Field id="gmsg" label={<>{t("checkout.message")} <span className="muted">{t("checkout.messageHint")}</span></>}>
                  <TextArea id="gmsg" maxLength={200} value={form.message} onChange={(e) => set("message", e.target.value)} />
                </Field>
              </div>
            )}
          </fieldset>

          <fieldset className="card pad stack">
            <legend className="sr-only">{t("checkout.paymentMethod")}</legend>
            <h2 style={{ fontSize: 20 }} aria-hidden="true">{t("checkout.paymentMethod")}</h2>
            <div className="pay-opts" role="radiogroup" aria-label={t("checkout.paymentMethod")}>
              <label className="pay-opt">
                <input type="radio" name="pm" checked={form.method === "bank"} onChange={() => set("method", "bank")} />
                <Icon name="bank" />
                <span>{t("checkout.bank")}<span className="d">{t("checkout.bankHint")}</span></span>
              </label>
              {form.method === "bank" && (
                <div>
                  <p className="label" id="bank-l" style={{ margin: "4px 0" }}>{t("checkout.chooseBank")}</p>
                  <div className="banks" role="radiogroup" aria-labelledby="bank-l">
                    {BANKS.map((b) => (
                      <label className="bank" key={b}>
                        <input type="radio" name="bank" id={`bank-${b}`} checked={form.bank === b} onChange={() => set("bank", b)} />
                        {b}
                      </label>
                    ))}
                  </div>
                  {err("payment.bank") && <span className="err-msg"><Icon name="xc" />{err("payment.bank")}</span>}
                </div>
              )}
              <label className="pay-opt">
                <input type="radio" name="pm" checked={form.method === "mobilepay"} onChange={() => set("method", "mobilepay")} />
                <Icon name="phone" />
                <span>MobilePay<span className="d">{t("checkout.mobilepayHint")}</span></span>
              </label>
              <label className="pay-opt">
                <input type="radio" name="pm" checked={form.method === "card"} onChange={() => set("method", "card")} />
                <Icon name="card" />
                <span>{t("checkout.card")}<span className="d">{t("checkout.cardHint")}</span></span>
                <span className="brand">VISA · MC</span>
              </label>
            </div>
          </fieldset>

          <fieldset className="card pad stack">
            <legend className="sr-only">{t("checkout.consent")}</legend>
            <label className="check">
              <input type="checkbox" id="terms" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} aria-invalid={errors.acceptTerms ? true : undefined} />
              <span>
                {t("checkout.acceptTerms", { date: formatDate(expiryFromToday(meta.voucherValidityMonths), locale) })} <span className="req" aria-hidden="true">*</span>
              </span>
            </label>
            {err("acceptTerms") && <span className="err-msg"><Icon name="xc" />{err("acceptTerms")}</span>}
            <label className="check">
              <input type="checkbox" checked={form.newsletter} onChange={(e) => set("newsletter", e.target.checked)} />
              <span>{t("checkout.newsletter")} <span className="muted">{t("common.optional")}</span></span>
            </label>
            <p className="hint">{t("checkout.privacy")}</p>
          </fieldset>
        </div>

        <aside className="card pad stack" aria-label={t("checkout.orderSummary")}>
          <h2 style={{ fontSize: 20 }}>{t("checkout.yourOrder")}</h2>
          {quote ? (
            <>
              <div>
                {quote.lines.map((l) => (
                  <div className="mini-line" key={l.optionId}>
                    <div className="thumb"><img src={l.imageUrl} alt="" /></div>
                    <div className="t">
                      <b>{itemTitle(l.title, l.baseTitle, l.optionLabel, locale)}</b>
                      <span className="muted">{l.qty} × {formatMoney(l.unitPriceCents, locale)} · {l.merchantName}</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{formatMoney(l.totalCents, locale)}</span>
                  </div>
                ))}
              </div>
              <CartTotals quote={quote} totalLabel={t("checkout.totalToPay")} />
              <button className="btn btn-primary btn-block" type="submit" disabled={!!paying}>
                <Icon name="lock" />
                {t("checkout.pay", { amount: formatMoney(quote.totalCents, locale) })}
              </button>
            </>
          ) : (
            <div className="empty"><div className="spin" aria-hidden="true" /></div>
          )}
          <p className="hint" style={{ textAlign: "center" }}>{t("checkout.redirectNote")}</p>
        </aside>
      </form>

      <Dialog open={!!paying} onClose={() => {}}>
        <div className="pad stack" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div className="spin" aria-hidden="true" />
          <p style={{ fontWeight: 600 }} role="status">{t("checkout.redirecting", { method: paying ?? "" })}</p>
          <p className="hint">{t("checkout.mockNote")}</p>
        </div>
      </Dialog>
    </main>
  );
}
