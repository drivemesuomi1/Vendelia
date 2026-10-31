import QRCode from "qrcode";

/** Scannable QR code for a voucher, drawn as SVG (the same payload as on the PDF). */
export function QrCode({ value, label }: { value: string; label: string }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 2;
  // One path of 1x1 squares, merged into horizontal runs, keeps the DOM small.
  let d = "";
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!qr.modules.get(row, col)) continue;
      let end = col;
      while (end + 1 < n && qr.modules.get(row, end + 1)) end++;
      d += `M${col + quiet} ${row + quiet}h${end - col + 1}v1h-${end - col + 1}z`;
      col = end;
    }
  }
  const size = n + quiet * 2;
  return (
    <svg className="qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#17223B" />
    </svg>
  );
}
