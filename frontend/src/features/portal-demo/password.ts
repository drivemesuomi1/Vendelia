/** 14-character password from the browser's secure random source, avoiding look-alike characters. */
export function generatePassword(length = 14) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!#%+?@"];
  const all = sets.join("");
  const rnd = new Uint32Array(length);
  crypto.getRandomValues(rnd);
  const chars = Array.from(rnd, (n, i) => {
    const pool = i < sets.length ? sets[i]! : all;
    return pool[n % pool.length]!;
  });
  // Shuffle so the guaranteed character types are not always first.
  const order = new Uint32Array(length);
  crypto.getRandomValues(order);
  return chars.map((c, i) => [order[i]!, c] as const).sort((a, b) => a[0] - b[0]).map(([, c]) => c).join("");
}

