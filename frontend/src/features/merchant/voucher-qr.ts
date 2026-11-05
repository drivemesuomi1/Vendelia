import { VOUCHER_CODE_RE } from '@vendelia/shared';

/** Read data only. Never navigate to a scanned URL or send an unrelated payload to the API. */
export function voucherCodeFromQr(raw: string, siteOrigin: string): string | null {
  const text = raw.trim();
  if (VOUCHER_CODE_RE.test(text.toUpperCase())) return text.toUpperCase();
  try {
    const url = new URL(text);
    if (url.username || url.password || ![siteOrigin, 'https://www.vendelia.fi', 'https://vendelia.fi'].includes(url.origin)) return null;
    const match = /^\/(fi|sv|en)\/voucher\/([^/]+)\/?$/.exec(url.pathname);
    if (!match) return null;
    const code = decodeURIComponent(match[2]!).toUpperCase();
    return VOUCHER_CODE_RE.test(code) ? code : null;
  } catch { return null; }
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach(track => track.stop());
}
