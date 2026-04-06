import "./PollCard.css";

export default function PollCard({ poll, myName, onVote }) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);

  const myVoteIndex = poll.options.findIndex((o) => o.votes.includes(myName));

  return (
    <div className="poll-card">
      <p className="poll-question">{poll.question}</p>
      <p className="poll-meta">by {poll.createdBy} · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>

      <div className="poll-options">
        {poll.options.map((opt, i) => {
          const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          const isMyVote = myVoteIndex === i;

          return (
            <button
              key={i}
              className={`poll-option ${isMyVote ? "voted" : ""}`}
              onClick={() => onVote(poll.id, i)}
            >
              <div className="poll-bar" style={{ width: `${pct}%` }} />
              <span className="poll-opt-text">{opt.text}</span>
              <span className="poll-pct">{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
