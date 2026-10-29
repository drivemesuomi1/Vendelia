"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { loc } from "@/lib/format";

const CITY_COOKIE = "vd_city";

function readCity() {
  const m = document.cookie.match(/(?:^|; )vd_city=([^;]*)/);
  return m ? decodeURIComponent(m[1]!) : "";
}

/** City pill in the header; choosing a city opens the filtered deal list. */
export function CityPicker() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState("");
  useEffect(() => setCity(readCity()), []);

  const name = city ? loc(meta.cities.find((c) => c.id === city)?.name, locale) : t("common.allCities");
  function pick(id: string) {
    document.cookie = `${CITY_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    setCity(id);
    setOpen(false);
    router.push(`/${locale}/deals${id ? `?city=${id}` : ""}`);
  }

  return (
    <>
      <button className="city-btn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={t("nav.cityLabel", { city: name })}>
        <Icon name="pin" />
        <span>{name}</span>
        <Icon name="chev" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="city-title">
        <div className="pad stack">
          <div className="row between">
            <h2 id="city-title" style={{ fontSize: 20 }}>{t("nav.chooseCity")}</h2>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} aria-label={t("common.close")}><Icon name="x" /></button>
          </div>
          <div className="stack" role="group" aria-label={t("nav.cities")}>
            {[{ id: "", label: t("common.allCities") }, ...meta.cities.map((c) => ({ id: c.id, label: loc(c.name, locale) }))].map((c) => (
              <button key={c.id || "all"} className="pay-opt" onClick={() => pick(c.id)}>
                <Icon name="pin" />
                <span>{c.label}</span>
                {c.id === city && <span className="brand" style={{ color: "var(--indigo)" }}>{t("nav.selected")}</span>}
              </button>
            ))}
          </div>
        </div>
      </Dialog>
    </>
  );
}
