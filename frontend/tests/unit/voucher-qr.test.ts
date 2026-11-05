import { expect, it, vi } from 'vitest';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { voucherCodeFromQr, stopCamera } from '../../src/features/merchant/voucher-qr';

const code = 'VND-ABCD-EFGH';
const origin = 'https://www.vendelia.fi';
it('reads raw codes and generated voucher URLs without following links', () => {
  expect(voucherCodeFromQr(' vnd-abcd-efgh ', origin)).toBe(code);
  for (const locale of ['fi', 'en', 'sv']) {
    expect(voucherCodeFromQr(`${origin}/${locale}/voucher/${code}`, origin)).toBe(code);
  }
  expect(voucherCodeFromQr(`http://localhost:3000/en/voucher/${code}`, 'http://localhost:3000')).toBe(code);
  for (const payload of [
    `https://evil.example/fi/voucher/${code}`, `https://www.vendelia.fi.evil.example/fi/voucher/${code}`,
    `https://user@www.vendelia.fi/fi/voucher/${code}`, `javascript:alert('${code}')`,
    `${origin}/en/deals/${code}`, `${origin}/fi/voucher/${code}/extra`, `${origin}/fi/voucher/not-a-code`,
    `${origin}/fi/voucher/%`, `random text ${code}`, 'VND-0000-0000',
  ]) expect(voucherCodeFromQr(payload, origin)).toBeNull();
});

it('decodes a real QR matrix containing the existing PDF voucher URL', () => {
  const payload = `${origin}/fi/voucher/${code}`;
  const qr = QRCode.create(payload);
  const scale = 5, margin = 4;
  const size = (qr.modules.size + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const mx = Math.floor(x / scale) - margin, my = Math.floor(y / scale) - margin;
    const dark = mx >= 0 && my >= 0 && mx < qr.modules.size && my < qr.modules.size && qr.modules.get(my, mx);
    const index = (y * size + x) * 4;
    pixels[index] = pixels[index + 1] = pixels[index + 2] = dark ? 0 : 255;
    pixels[index + 3] = 255;
  }
  const decoded = jsQR(pixels, size, size);
  expect(decoded?.data).toBe(payload);
  expect(voucherCodeFromQr(decoded!.data, origin)).toBe(code);
});

it('releases every camera track and tolerates cleanup before a stream exists', () => {
  const first = vi.fn(), second = vi.fn();
  stopCamera({ getTracks: () => [{ stop: first }, { stop: second }] } as unknown as MediaStream);
  expect(first).toHaveBeenCalledOnce(); expect(second).toHaveBeenCalledOnce();
  expect(() => stopCamera(null)).not.toThrow();
});
