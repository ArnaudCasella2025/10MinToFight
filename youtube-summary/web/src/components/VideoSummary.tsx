import { AnalyzeResponse } from "../types/analysis";
import { ReliabilityBadge } from "./ReliabilityBadge";

export function VideoSummary({ result }: { result: AnalyzeResponse }) {
  return (
    <section className="video-summary">
      <div className="video-header">
        <img src={result.thumbnailUrl} alt="" className="video-thumb" />
        <div>
          <h2>{result.title}</h2>
          {result.authorName && <p className="video-author">{result.authorName}</p>}
        </div>
      </div>

      <h3>Résumé</h3>
      <ul className="summary-list">
        {result.analysis.summary.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>

      {result.analysis.keyClaims.length > 0 && (
        <>
          <h3>Affirmations notables</h3>
          <ul className="claims-list">
            {result.analysis.keyClaims.map((c, i) => (
              <li key={i}>
                <strong>{c.claim}</strong>
                <span> — {c.note}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Fiabilité du discours</h3>
      <ReliabilityBadge reliability={result.analysis.reliability} />
    </section>
  );
}
