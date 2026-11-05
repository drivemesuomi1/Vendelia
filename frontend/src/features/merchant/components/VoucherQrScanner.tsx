'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import { useI18n } from '@/i18n/I18nProvider';
import { stopCamera, voucherCodeFromQr } from '../voucher-qr';

/** Mounted only after the merchant explicitly opens the scanner. Frames stay on the device. */
export function VoucherQrScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const tr = (key: string) => t(`business.qrScanner.${key}`);
  const video = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onCode, onClose });
  callbacks.current = { onCode, onClose };
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setReady(false); setError(null); setInvalid(false);
    const cleanup = () => {
      cancelled = true;
      clearTimeout(timer);
      stopCamera(stream);
      if (video.current) video.current.srcObject = null;
    };
    const closeWhenHidden = () => { if (document.hidden) { cleanup(); callbacks.current.onClose(); } };
    const closeOnPageHide = () => { cleanup(); callbacks.current.onClose(); };
    document.addEventListener('visibilitychange', closeWhenHidden);
    window.addEventListener('pagehide', closeOnPageHide);
    const start = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('unsupported'); return;
      }
      try {
        // Browser decoder: supports QR reading without relying on the limited BarcodeDetector API.
        const { default: decode } = await import('jsqr');
        if (cancelled) return;
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
          facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 },
        } });
        if (cancelled) { stopCamera(stream); return; }
        const element = video.current;
        if (!element) { cleanup(); return; }
        element.srcObject = stream;
        await element.play();
        if (cancelled) return;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('canvasUnavailable');
        setReady(true);
        const scan = () => {
          if (cancelled) return;
          try {
            if (element.readyState >= 2 && element.videoWidth && element.videoHeight) {
              const scale = Math.min(1, 960 / Math.max(element.videoWidth, element.videoHeight));
              canvas.width = Math.round(element.videoWidth * scale);
              canvas.height = Math.round(element.videoHeight * scale);
              ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
              const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = decode(frame.data, frame.width, frame.height, { inversionAttempts: 'attemptBoth' });
              if (qr) {
                const code = voucherCodeFromQr(qr.data, window.location.origin);
                if (code) { cleanup(); callbacks.current.onCode(code); return; }
                setInvalid(true);
              }
            }
            timer = setTimeout(scan, 200);
          } catch { cleanup(); setError('unavailable'); }
        };
        scan();
      } catch (e) {
        if (cancelled) return;
        cleanup();
        const name = e instanceof DOMException ? e.name : '';
        setError(['NotAllowedError', 'SecurityError'].includes(name) ? 'denied'
          : ['NotFoundError', 'DevicesNotFoundError'].includes(name) ? 'missing' : 'unavailable');
      }
    };
    void start();
    return () => {
      cleanup();
      document.removeEventListener('visibilitychange', closeWhenHidden);
      window.removeEventListener('pagehide', closeOnPageHide);
    };
  }, [attempt]);

  return (
    <Dialog open onClose={onClose} labelledBy="voucher-scanner-title" className="voucher-scanner">
      <div className="row between"><h2 id="voucher-scanner-title">{tr('title')}</h2><button type="button" className="btn btn-ghost btn-icon" aria-label={tr('close')} onClick={onClose}><Icon name="x" /></button></div>
      <p className="muted small">{tr('instructions')}</p>
      <div className="voucher-camera" hidden={!!error}><video ref={video} autoPlay muted playsInline aria-label={tr('camera')} /><div className="voucher-camera-guide" aria-hidden="true" /><p role="status">{tr(ready ? 'scanning' : 'starting')}</p></div>
      {error && <Notice tone="warn">{tr(error)}</Notice>}
      {invalid && !error && <p className="err-msg" role="status">{tr('invalid')}</p>}
      <p className="muted small">{tr('privacy')}</p>
      <div className="row wrap-row" style={{ gap: 10 }}>
        {error && <button type="button" className="btn btn-secondary" onClick={() => setAttempt(v => v + 1)}>{tr('retry')}</button>}
        <button type="button" className="btn btn-ghost" onClick={onClose}>{tr('manual')}</button>
      </div>
    </Dialog>
  );
}
