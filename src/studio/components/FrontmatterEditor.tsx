import React, { useState } from "react";

type FrontmatterEntry = { key: string; value: string };

interface FrontmatterEditorProps {
  entries: FrontmatterEntry[];
  onChange: (entries: FrontmatterEntry[]) => void;
}

export default function FrontmatterEditor({ entries, onChange }: FrontmatterEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateEntry = (index: number, field: "key" | "value", newValue: string) => {
    const updated = entries.map((e, i) => (i === index ? { ...e, [field]: newValue } : e));
    onChange(updated);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    onChange([...entries, { key: "", value: "" }]);
  };

  if (entries.length === 0 && !isOpen) return null;

  return (
    <div style={styles.container}>
      <button onClick={() => setIsOpen(!isOpen)} style={styles.toggle}>
        <span style={styles.arrow}>{isOpen ? "▼" : "▶"}</span>
        <span style={styles.label}>Frontmatter</span>
        <span style={styles.count}>{entries.length} fields</span>
      </button>

      {isOpen && (
        <div style={styles.fields}>
          {entries.map((entry, i) => (
            <div key={i} style={styles.row}>
              <input
                style={styles.keyInput}
                value={entry.key}
                onChange={(e) => updateEntry(i, "key", e.target.value)}
                placeholder="key"
                spellCheck={false}
              />
              <input
                style={styles.valueInput}
                value={entry.value}
                onChange={(e) => updateEntry(i, "value", e.target.value)}
                placeholder="value"
                spellCheck={false}
              />
              <button onClick={() => removeEntry(i)} style={styles.removeBtn} title="Remove field">
                ×
              </button>
            </div>
          ))}
          <button onClick={addEntry} style={styles.addBtn}>
            + Add field
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
  },
  toggle: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "0.5rem 1rem",
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "uppercase",
    color: "#6b7280",
    letterSpacing: "0.05em",
  },
  arrow: {
    fontSize: "0.625rem",
  },
  label: {},
  count: {
    fontWeight: "400",
    marginLeft: "auto",
  },
  fields: {
    padding: "0 1rem 0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  row: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
  },
  keyInput: {
    width: "140px",
    padding: "0.25rem 0.5rem",
    border: "1px solid #d1d5db",
    borderRadius: "0.25rem",
    fontSize: "0.8125rem",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    color: "#4338ca",
    backgroundColor: "#ffffff",
    outline: "none",
  },
  valueInput: {
    flex: 1,
    padding: "0.25rem 0.5rem",
    border: "1px solid #d1d5db",
    borderRadius: "0.25rem",
    fontSize: "0.8125rem",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    color: "#111827",
    backgroundColor: "#ffffff",
    outline: "none",
  },
  removeBtn: {
    padding: "0.125rem 0.375rem",
    border: "none",
    backgroundColor: "transparent",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: "1rem",
    lineHeight: 1,
  },
  addBtn: {
    alignSelf: "flex-start",
    padding: "0.25rem 0.5rem",
    border: "none",
    backgroundColor: "transparent",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: "500",
  },
};
