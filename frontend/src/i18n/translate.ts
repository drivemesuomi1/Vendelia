export type Messages = { [key: string]: string | Messages };
export type Vars = Record<string, string | number>;

function lookup(messages: Messages, key: string): string | undefined {
  let node: string | Messages | undefined = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Returns a translator: t("cart.title"), t("deal.validUntil", { date }).
 * Missing keys fall back to Finnish, then to the key itself (visible in dev).
 */
export function createTranslator(messages: Messages, fallback?: Messages) {
  return function t(key: string, vars?: Vars): string {
    const raw =
      lookup(messages, key) ??
      (fallback ? lookup(fallback, key) : undefined) ??
      // Unknown API/validation error codes get a generic, translated message instead of the raw code.
      (key.startsWith("errors.") ? lookup(messages, "errors.generic") : undefined) ??
      key;
    return vars ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : raw;
  };
}

export type Translator = ReturnType<typeof createTranslator>;
