import { ReliabilityAssessment } from "../types/analysis";

const LEVEL_CLASS: Record<ReliabilityAssessment["level"], string> = {
  faible: "reliability-low",
  moyenne: "reliability-mid",
  "élevée": "reliability-high",
};

export function ReliabilityBadge({ reliability }: { reliability: ReliabilityAssessment }) {
  return (
    <section className="reliability-card">
      <div className="reliability-header">
        <span className={`reliability-pill ${LEVEL_CLASS[reliability.level]}`}>
          Fiabilité {reliability.level} · {reliability.score}/5
        </span>
      </div>
      <ul>
        {reliability.rationale.map((reason, i) => (
          <li key={i}>{reason}</li>
        ))}
      </ul>
      <p className="reliability-caveat">⚠️ {reliability.caveat}</p>
    </section>
  );
}
