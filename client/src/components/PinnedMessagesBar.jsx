import { useState } from "react";
import "./PinnedMessagesBar.css";

export default function PinnedMessagesBar({ pinnedMessages, messages, onJumpTo, onUnpin, isHost }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (pinnedMessages.length === 0) return null;

  const pinnedMsgs = messages.filter(m => pinnedMessages.includes(m.id));
  if (pinnedMsgs.length === 0) return null;

  const currentMsg = pinnedMsgs[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((i) => (i - 1 + pinnedMsgs.length) % pinnedMsgs.length);
  };

  const handleNext = () => {
    setCurrentIndex((i) => (i + 1) % pinnedMsgs.length);
  };

  return (
    <div className="pinned-bar">
      <div className="pinned-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <path d="M12 17v5"/>
          <path d="M9 10.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V16a1 1 0 001 1h12a1 1 0 001-1v-.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V7a1 1 0 011-1 2 2 0 000-4H8a2 2 0 000 4 1 1 0 011 1z"/>
        </svg>
      </div>

      <div className="pinned-content" onClick={() => onJumpTo(currentMsg.id)}>
        <span className="pinned-sender">{currentMsg.sender}</span>
        <span className="pinned-text">
          {currentMsg.type === "image" ? "📷 Image" : currentMsg.text?.substring(0, 100)}
          {currentMsg.text?.length > 100 ? "..." : ""}
        </span>
      </div>

      {pinnedMsgs.length > 1 && (
        <div className="pinned-nav">
          <button onClick={handlePrev} title="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="pinned-count">{currentIndex + 1}/{pinnedMsgs.length}</span>
          <button onClick={handleNext} title="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      )}

      {isHost && (
        <button className="pinned-unpin" onClick={() => onUnpin(currentMsg.id)} title="Unpin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}
