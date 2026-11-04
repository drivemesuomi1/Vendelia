"use client";

import { useRef, useState, type DragEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";

export const MAX_PHOTOS = 8;
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/**
 * A deal's photos in display order; the first one is the cover. Photos can be added by picking or dropping files,
 * reordered by dragging (or with the arrow buttons, which also work by keyboard and on touch screens) and removed.
 * `upload` stores one file and returns its URL.
 */
export function PhotoManager({ photos, onChange, upload, error }: {
  photos: string[];
  onChange: (next: string[]) => void;
  upload: (file: File) => Promise<string>;
  error?: string;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const [pending, setPending] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  // Uploads finish one after another; keep the latest list so each one appends to the current photos.
  const latest = useRef(photos);
  latest.current = photos;

  const commit = (next: string[]) => { latest.current = next; onChange(next); };
  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= photos.length) return;
    const next = [...photos];
    next.splice(to, 0, next.splice(from, 1)[0]!);
    commit(next);
    setStatus(t("business.photoMoved", { n: to + 1, m: next.length }));
  };
  const remove = (index: number) => {
    commit(photos.filter((_, i) => i !== index));
    setStatus(t("business.photoRemoved"));
  };

  async function add(files: FileList | File[]) {
    const list = [...files];
    const room = MAX_PHOTOS - latest.current.length;
    setProblem(null);
    const picked = list.filter((f) => ACCEPT.includes(f.type)).slice(0, Math.max(0, room));
    if (list.length > picked.length) setProblem(list.some((f) => !ACCEPT.includes(f.type)) ? "unsupported_file_type" : "tooManyPhotos");
    setPending((n) => n + picked.length);
    for (const file of picked) {
      try {
        const url = await upload(file);
        if (!latest.current.includes(url)) commit([...latest.current, url]);
      } catch (e) {
        setProblem(e instanceof ApiError ? e.code : e instanceof TypeError ? "network" : "unsupported_file_type");
      } finally {
        setPending((n) => n - 1);
      }
    }
  }

  const isFiles = (e: DragEvent) => dragFrom === null && [...e.dataTransfer.types].includes("Files");
  const full = photos.length + pending >= MAX_PHOTOS;

  return (
    <div className="ph">
      <ul className="ph-grid" aria-label={t("business.photos")}>
        {photos.map((src, i) => (
          <li
            key={src}
            className={`ph-tile${dragFrom === i ? " is-dragging" : ""}${over === i && dragFrom !== null && dragFrom !== i ? " is-over" : ""}`}
            draggable
            onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
            onDragOver={(e) => { if (dragFrom === null) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(i); }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => { if (dragFrom === null) return; e.preventDefault(); move(dragFrom, i); setDragFrom(null); setOver(null); }}
            onDragEnd={() => { setDragFrom(null); setOver(null); }}
          >
            <img src={src} alt={t("business.photoN", { n: i + 1 })} draggable={false} />
            {i === 0 && <span className="ph-cover">{t("business.cover")}</span>}
            <button type="button" className="ph-btn ph-remove" onClick={() => remove(i)} aria-label={t("business.removePhoto", { n: i + 1 })} title={t("business.removePhoto", { n: i + 1 })}><Icon name="x" /></button>
            <div className="ph-move">
              <button type="button" className="ph-btn" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={t("business.photoEarlier", { n: i + 1 })} title={t("business.photoEarlier", { n: i + 1 })}><Icon name="left" /></button>
              <button type="button" className="ph-btn" onClick={() => move(i, i + 1)} disabled={i === photos.length - 1} aria-label={t("business.photoLater", { n: i + 1 })} title={t("business.photoLater", { n: i + 1 })}><Icon name="right" /></button>
            </div>
          </li>
        ))}
        {Array.from({ length: pending }, (_, i) => <li key={`pending-${i}`} className="ph-tile ph-skel" aria-hidden="true" />)}
        {!full && (
          <li className="ph-add-cell">
            <label
              className={`ph-add${fileOver ? " is-over" : ""}`}
              onDragOver={(e) => { if (isFiles(e)) { e.preventDefault(); setFileOver(true); } }}
              onDragLeave={() => setFileOver(false)}
              onDrop={(e) => { if (!isFiles(e)) return; e.preventDefault(); setFileOver(false); void add(e.dataTransfer.files); }}
            >
              <Icon name="plus" />
              <span>{t("business.addPhotos")}</span>
              <small>{t("business.photoCount", { n: photos.length + pending, m: MAX_PHOTOS })}</small>
              <input
                ref={input}
                id="img"
                type="file"
                multiple
                accept={ACCEPT.join(",")}
                onChange={(e) => { if (e.target.files) void add(e.target.files); e.target.value = ""; }}
              />
            </label>
          </li>
        )}
      </ul>
      <p className="hint">{photos.length > 1 ? t("business.photosDragHint") : t("business.photoHint")}</p>
      {(problem || error) && <p className="err-msg"><Icon name="xc" />{t(`errors.${problem ?? error}`)}</p>}
      <p className="sr-only" role="status">{status}</p>
    </div>
  );
}
