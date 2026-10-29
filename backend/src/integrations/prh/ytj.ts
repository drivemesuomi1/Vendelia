/**
 * Finnish Patent and Registration Office open data (YTJ) lookup.
 * Used to prefill and sanity-check a merchant's company name from their business ID.
 * Failures return null — sign-up must never depend on this service being up.
 */
export interface CompanyInfo {
  businessId: string;
  name: string;
}

export interface CompanyRegistry {
  lookup(businessId: string): Promise<CompanyInfo | null>;
}

export function createYtjRegistry(baseUrl: string): CompanyRegistry {
  return {
    async lookup(businessId) {
      try {
        const res = await fetch(`${baseUrl}/companies?businessId=${encodeURIComponent(businessId)}`, {
          signal: AbortSignal.timeout(4000),
          headers: { accept: "application/json" },
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          companies?: { names?: { name?: string; endDate?: string | null; type?: string }[] }[];
        };
        const names = data.companies?.[0]?.names ?? [];
        const current = names.find((n) => !n.endDate && n.name) ?? names.find((n) => n.name);
        return current?.name ? { businessId, name: current.name } : null;
      } catch {
        return null;
      }
    },
  };
}
