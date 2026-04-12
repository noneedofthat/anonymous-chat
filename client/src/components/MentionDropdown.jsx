import { useEffect, useState } from "react";
import "./MentionDropdown.css";

export default function MentionDropdown({ members, query, onSelect, position }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = members.filter(m => 
    m.toLowerCase().startsWith(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        onSelect(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        onSelect(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, onSelect]);

  if (filtered.length === 0) return null;

  return (
    <div className="mention-dropdown" style={{ bottom: position.bottom, left: position.left }}>
      {filtered.map((member, i) => (
        <button
          key={member}
          className={`mention-item ${i === selectedIndex ? "selected" : ""}`}
          onClick={() => onSelect(member)}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="mention-avatar">@</span>
          {member}
        </button>
      ))}
    </div>
  );
}
