import "./PreviewBanner.css";

/** Site-wide launch notice. Static and non-dismissible so every visitor sees the preview status. */
export function PreviewBanner({ label, message }: { label: string; message: string }) {
  return (
    <aside className="preview-banner" aria-label={label}>
      <div className="preview-banner__inner">
        <span className="preview-banner__label">{label}</span>
        <p className="preview-banner__message">{message}</p>
      </div>
    </aside>
  );
}
