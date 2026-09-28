"use client";

export default function ExamPalette({ total, answers, currentIndex, onJump, disabled }) {
  const isAnswered = (i) => {
    const a = answers?.[i];
    if (!a) return false;
    const picked = Array.isArray(a.selectedOptionIndexes) ? a.selectedOptionIndexes : [];
    return picked.length > 0 || Boolean(a.textAnswer && a.textAnswer.trim());
  };
  const isReview = (i) => Boolean(answers?.[i]?.markedForReview);
  const answeredCount = Array.from({ length: total }, (_, i) => i).filter(isAnswered).length;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          Question Palette
          <span className="card-title-tamil tamil">கேள்வி பட்டி</span>
        </div>
      </div>
      <div className="card-body card-body-tight">
        <div className="palette">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onJump(i)}
              className={`palette-btn ${isAnswered(i) ? "answered" : ""} ${isReview(i) ? "review" : ""} ${
                currentIndex === i ? "current" : ""
              }`}
              title={`Question ${i + 1} — ${isAnswered(i) ? "answered" : "not answered"}${
                isReview(i) ? ", marked for review" : ""
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="divider" />

        <div className="spread small">
          <span className="muted">
            Answered <strong>{answeredCount}</strong> of {total}
          </span>
          <span className="muted">
            Left <strong>{total - answeredCount}</strong>
          </span>
        </div>

        <div className="meter mt-1">
          <div className="meter-fill" style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }} />
        </div>

        <div className="palette-legend mt-2">
          <span>
            <span className="legend-swatch answered" /> Answered
          </span>
          <span>
            <span className="legend-swatch review" /> Review
          </span>
          <span>
            <span className="legend-swatch unanswered" /> Not answered
          </span>
        </div>
      </div>
    </div>
  );
}
