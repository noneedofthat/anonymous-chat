import { useState } from "react";
import "./ImagePreview.css";

export default function ImagePreview({ files, onSend, onCancel }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => setCurrentIndex((i) => (i - 1 + files.length) % files.length);
  const handleNext = () => setCurrentIndex((i) => (i + 1) % files.length);

  return (
    <div className="image-preview-overlay" onClick={onCancel}>
      <div className="image-preview-modal" onClick={(e) => e.stopPropagation()}>
        <button className="preview-close" onClick={onCancel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="preview-content">
          <img src={URL.createObjectURL(files[currentIndex])} alt="Preview" />
          
          {files.length > 1 && (
            <>
              <button className="preview-nav prev" onClick={handlePrev}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <button className="preview-nav next" onClick={handleNext}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              <div className="preview-counter">{currentIndex + 1} / {files.length}</div>
            </>
          )}
        </div>

        <div className="preview-footer">
          <span className="preview-filename">{files[currentIndex].name}</span>
          <div className="preview-actions">
            <button className="preview-btn cancel" onClick={onCancel}>Cancel</button>
            <button className="preview-btn send" onClick={onSend}>
              Send {files.length > 1 ? `${files.length} images` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
