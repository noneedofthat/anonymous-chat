import { useState } from "react";
import "./EditModal.css";

export default function EditModal({ message, onSave, onCancel }) {
  const [text, setText] = useState(message.text);

  const handleSave = () => {
    if (text.trim() && text !== message.text) {
      onSave(text.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div className="edit-modal-overlay" onClick={onCancel}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h3>Edit Message</h3>
          <button className="edit-close" onClick={onCancel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <textarea
          className="edit-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          maxLength={500}
        />
        
        <div className="edit-modal-footer">
          <span className="edit-char-count">{text.length} / 500</span>
          <div className="edit-actions">
            <button className="edit-btn cancel" onClick={onCancel}>Cancel</button>
            <button className="edit-btn save" onClick={handleSave} disabled={!text.trim()}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
