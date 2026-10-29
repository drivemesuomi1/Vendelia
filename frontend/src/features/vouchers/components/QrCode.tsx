/**
 * Placeholder QR pattern derived from the code (deterministic, NOT scannable).
 * Swap for a real encoder (e.g. the `qrcode` package) before launch.
 */
export function QrCode({ code, label }: { code: string; label: string }) {
  const N = 25;
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => {
    h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
  const cells: [number, number][] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!finder(x, y) && rnd() > 0.52) cells.push([x, y]);
  const F = ({ x, y }: { x: number; y: number }) => (
    <>
      <rect x={x} y={y} width={7} height={7} />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} />
    </>
  );
  return (
    <svg className="qr" viewBox={`0 0 ${N} ${N}`} role="img" aria-label={label} shapeRendering="crispEdges" fill="#17223B">
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />)}
      <F x={0} y={0} />
      <F x={N - 7} y={0} />
      <F x={0} y={N - 7} />
    </svg>
  );
}
