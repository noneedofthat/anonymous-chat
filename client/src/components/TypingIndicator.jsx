import "./TypingIndicator.css";

export default function TypingIndicator({ typers }) {
  if (!typers || typers.length === 0) return null;
  const label = typers.length === 1
    ? `${typers[0]} is typing`
    : typers.length === 2
    ? `${typers[0]} and ${typers[1]} are typing`
    : `${typers.length} people are typing`;

  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span /><span /><span />
      </span>
      <span className="typing-label">{label}</span>
    </div>
  );
}
