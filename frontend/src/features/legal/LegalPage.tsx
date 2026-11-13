import type { LegalDoc } from "./content";

/** Privacy policy and terms: a plain, readable document page inside the shop layout. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <main className="wrap legal-page">
      <article className="card pad">
        <h1>{doc.title}</h1>
        <p className="muted small">{doc.updated}</p>
        <p className="legal-intro">{doc.intro}</p>
        {doc.sections.map((s, i) => (
          <div className="legal-sec" key={s.h}>
            <h2>{i + 1}. {s.h}</h2>
            {s.p.map((text) => <p key={text}>{text}</p>)}
          </div>
        ))}
      </article>
    </main>
  );
}
