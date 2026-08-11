import { useState } from "react";

// Emoji category chips for expenses. Presentational: the parent supplies the
// list and handles create/delete/select. Custom categories get a delete badge;
// seeded defaults (isDefault) are protected.
export default function CategoryPicker({
  categories,
  value,
  onSelect,
  onCreate,
  onDelete,
}) {
  const [adding, setAdding] = useState(false);
  const [emoji, setEmoji] = useState("");
  const [label, setLabel] = useState("");

  function submitNew(e) {
    e.preventDefault();
    if (!label.trim()) return;
    onCreate({ emoji: emoji.trim(), label: label.trim() });
    setEmoji("");
    setLabel("");
    setAdding(false);
  }

  return (
    <div className="cat-picker">
      <div className="cat-scroll">
        {categories.map((c) => (
          <div className="cat-chip-wrap" key={c.id}>
            <button
              type="button"
              className={`cat-chip ${value === c.label ? "active" : ""}`}
              aria-pressed={value === c.label}
              onClick={() => onSelect(value === c.label ? "" : c.label)}
            >
              <span className="cat-emoji">{c.emoji}</span>
              <span className="cat-label">{c.label}</span>
            </button>
            {!c.isDefault && (
              <button
                type="button"
                className="cat-del"
                aria-label={`Delete ${c.label}`}
                onClick={() => onDelete(c)}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="cat-chip add"
          aria-label="New category"
          aria-expanded={adding}
          onClick={() => setAdding((v) => !v)}
        >
          ＋
        </button>
      </div>

      {adding && (
        <form className="cat-add" onSubmit={submitNew}>
          <input
            className="cat-emoji-input"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🏷️"
            maxLength={2}
            aria-label="Category emoji"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="New category name"
            aria-label="Category name"
          />
          <button className="btn primary" type="submit">
            Add
          </button>
        </form>
      )}
    </div>
  );
}
