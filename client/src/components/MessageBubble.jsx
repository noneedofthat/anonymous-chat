import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github-dark.css";
import EditModal from "./EditModal";
import "./MessageBubble.css";

const REACTIONS = [
  { emoji: "fire",  label: "🔥", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2C9 7 6 9 6 13a6 6 0 0012 0c0-4-3-6-6-11z"/></svg>' },
  { emoji: "like",  label: "👍", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>' },
  { emoji: "heart", label: "❤️", svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' },
  { emoji: "laugh", label: "😂", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
  { emoji: "wow",   label: "😮", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="14" r="2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
  { emoji: "sad",   label: "😢", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
];

const LABELS = Object.fromEntries(REACTIONS.map(r => [r.emoji, r.label]));

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const ReplyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);

export default function MessageBubble({ msg, myName, onReact, onDelete, onReply, onEdit, polls }) {
  const [showActions, setShowActions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const isMe = msg.sender === myName;

  const totalReactions = msg.reactions
    ? Object.entries(msg.reactions).filter(([, voters]) => voters.length > 0)
    : [];

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleCopy = () => {
    if (msg.text) navigator.clipboard.writeText(msg.text);
  };

  const handleReplyClick = () => {
    if (!msg.replyTo?.id) return;
    const targetMsg = document.querySelector(`[data-msg-id="${msg.replyTo.id}"]`);
    if (targetMsg) {
      targetMsg.scrollIntoView({ behavior: "smooth", block: "center" });
      targetMsg.style.animation = "highlightFlash 1s ease";
      setTimeout(() => { targetMsg.style.animation = ""; }, 1000);
    }
  };

  const handleEdit = (newText) => {
    onEdit(msg.id, newText);
    setShowEditModal(false);
  };

  // Inline poll
  if (msg.type === "poll" && msg.pollId) {
    const poll = polls?.find(p => p.id === msg.pollId);
    if (poll) {
      const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
      const myVoteIndex = poll.options.findIndex(o => o.votes.includes(myName));
      return (
        <div className={`bubble-wrap ${isMe ? "me" : "other"}`}>
          {!isMe && <span className="sender-name">{msg.sender}</span>}
          <div className="inline-poll">
            <div className="inline-poll-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              Poll · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
            </div>
            <p className="inline-poll-question">{poll.question}</p>
            <div className="inline-poll-options">
              {poll.options.map((opt, i) => {
                const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                return (
                  <button key={i} className={`inline-poll-opt ${myVoteIndex === i ? "voted" : ""}`}
                    onClick={() => onReact(poll.id, i, "vote")}>
                    <div className="inline-poll-bar" style={{ width: `${pct}%` }} />
                    <span className="inline-poll-text">{opt.text}</span>
                    <span className="inline-poll-pct">{pct}%</span>
                  </button>
                );
              })}
            </div>
          </div>
          <span className="msg-time">{formatTime(msg.timestamp)}</span>
        </div>
      );
    }
  }

  if (msg.type === "poll") {
    return (
      <div className="system-msg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        {msg.sender} created a poll
      </div>
    );
  }

  return (
    <div
      className={`bubble-wrap ${isMe ? "me" : "other"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      data-msg-id={msg.id}
    >
      {!isMe && <span className="sender-name">{msg.sender}</span>}

      {/* Reply context */}
      {msg.replyTo && (
        <div 
          className={`reply-context ${isMe ? "reply-me" : ""}`}
          onClick={handleReplyClick}
          title="Click to jump to original message"
        >
          <span className="reply-ctx-sender">{msg.replyTo.sender}</span>
          <span className="reply-ctx-text">{msg.replyTo.text?.substring(0, 80)}</span>
        </div>
      )}

      <div className="bubble-row">
        {showActions && (
          <div className={`action-bar ${isMe ? "action-bar-left" : "action-bar-right"}`}>
            {REACTIONS.map((r) => (
              <button key={r.emoji} className="action-icon" title={r.label}
                onClick={() => onReact(msg.id, r.emoji)}
                dangerouslySetInnerHTML={{ __html: r.svg }} />
            ))}
            <div className="action-divider" />
            <button className="action-icon" title="Reply" onClick={() => onReply(msg)}>
              <ReplyIcon />
            </button>
            {msg.type === "text" && (
              <button className="action-icon" title="Copy" onClick={handleCopy}>
                <CopyIcon />
              </button>
            )}
            {isMe && msg.type === "text" && (
              <button className="action-icon" title="Edit" onClick={() => setShowEditModal(true)}>
                <EditIcon />
              </button>
            )}
            {isMe && (
              <button className="action-icon action-delete" title="Delete" onClick={() => onDelete(msg.id)}>
                <TrashIcon />
              </button>
            )}
          </div>
        )}

        <div className={`bubble ${isMe ? "bubble-me" : "bubble-other"}`}>
          {msg.type === "image"
            ? <img src={msg.fileUrl} alt="shared" className="msg-image" />
            : (
              <div className="msg-text">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  rehypePlugins={[rehypeRaw, rehypeHighlight]}
                  components={{
                    code: ({node, inline, ...props}) => 
                      inline ? <code className="inline-code" {...props} /> : <code {...props} />
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            )
          }
        </div>
      </div>

      {msg.edited && (
        <span className="edited-tag">edited</span>
      )}

      {totalReactions.length > 0 && (
        <div className="reactions-bar">
          {totalReactions.map(([emoji, voters]) => (
            <button key={emoji}
              className={`reaction-chip ${voters.includes(myName) ? "reacted" : ""}`}
              onClick={() => onReact(msg.id, emoji)}
              title={voters.join(", ")}>
              {LABELS[emoji] || emoji} {voters.length}
            </button>
          ))}
        </div>
      )}

      <span className="msg-time">{formatTime(msg.timestamp)}</span>
      
      {showEditModal && (
        <EditModal 
          message={msg} 
          onSave={handleEdit} 
          onCancel={() => setShowEditModal(false)} 
        />
      )}
    </div>
  );
}
