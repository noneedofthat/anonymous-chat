import { useState } from "react";
import "./PollModal.css";

export default function PollModal({ onClose, onCreate }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState("");

  const updateOption = (i, val) => {
    const updated = [...options];
    updated[i] = val;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, ""]);
  };

  const removeOption = (i) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const handleCreate = () => {
    if (!question.trim()) return setError("Question is required.");
    const filled = options.filter((o) => o.trim());
    if (filled.length < 2) return setError("At least 2 options needed.");
    onCreate(question.trim(), filled);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📊 Create Poll</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <input
            className="modal-input"
            placeholder="Ask something..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={120}
          />

          <p className="options-label">Options</p>
          {options.map((opt, i) => (
            <div key={i} className="option-row">
              <input
                className="modal-input"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                maxLength={60}
              />
              {options.length > 2 && (
                <button className="remove-opt" onClick={() => removeOption(i)}>✕</button>
              )}
            </div>
          ))}

          {options.length < 6 && (
            <button className="add-opt-btn" onClick={addOption}>+ Add option</button>
          )}

          {error && <p className="modal-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="create-btn" onClick={handleCreate}>Launch Poll</button>
        </div>
      </div>
    </div>
  );
}
