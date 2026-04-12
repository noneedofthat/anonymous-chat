import { useState } from "react";
import "./SearchBar.css";

export default function SearchBar({ messages, onResultClick, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSearch = (q) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setCurrentIndex(0);
      return;
    }

    const filtered = messages
      .filter(m => m.type === "text" && m.text.toLowerCase().includes(q.toLowerCase()))
      .reverse(); // Most recent first
    
    setResults(filtered);
    setCurrentIndex(0);
  };

  const handleNext = () => {
    if (results.length === 0) return;
    const nextIdx = (currentIndex + 1) % results.length;
    setCurrentIndex(nextIdx);
    onResultClick(results[nextIdx].id);
  };

  const handlePrev = () => {
    if (results.length === 0) return;
    const prevIdx = (currentIndex - 1 + results.length) % results.length;
    setCurrentIndex(prevIdx);
    onResultClick(results[prevIdx].id);
  };

  return (
    <div className="search-bar">
      <div className="search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search messages..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />
        {results.length > 0 && (
          <span className="search-count">
            {currentIndex + 1} / {results.length}
          </span>
        )}
      </div>
      
      <div className="search-actions">
        <button 
          className="search-nav-btn" 
          onClick={handlePrev} 
          disabled={results.length === 0}
          title="Previous"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button 
          className="search-nav-btn" 
          onClick={handleNext} 
          disabled={results.length === 0}
          title="Next"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
        <button className="search-close-btn" onClick={onClose} title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
