import React, { useState } from "react";

interface AiChatProps {
  markdownContent: string;
  onMarkdownUpdate: (newMarkdown: string) => void;
}

export default function AiChat({ markdownContent, onMarkdownUpdate }: AiChatProps) {
  const [instruction, setInstruction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitInstruction = async () => {
    if (!instruction.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/studio/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdownContent, instruction }),
      });

      const data = await res.json();

      if (res.ok) {
        onMarkdownUpdate(data.content);
        setInstruction("");
      } else {
        setError(data.error || "AI edit failed.");
      }
    } catch (err) {
      setError("Network error contacting AI service.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitInstruction();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>AI Assistant</div>

      <div style={styles.body}>
        <div style={styles.infoText}>
          Describe the changes you want to make to the current file. The AI will only edit the
          markdown content.
        </div>

        {error && <div style={styles.error}>{error}</div>}
      </div>

      <div style={styles.footer}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <textarea
            style={styles.input}
            placeholder="E.g., Make the intro more concise..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={isLoading}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitInstruction();
              }
            }}
          />
          <button
            type="submit"
            style={{ ...styles.button, opacity: isLoading || !instruction.trim() ? 0.7 : 1 }}
            disabled={isLoading || !instruction.trim()}
          >
            {isLoading ? "Editing..." : "Apply Edit ->"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    padding: "1rem",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: "600",
    color: "#111827",
  },
  body: {
    flex: 1,
    padding: "1rem",
    overflowY: "auto",
  },
  infoText: {
    fontSize: "0.875rem",
    color: "#6b7280",
    backgroundColor: "#e0e7ff",
    padding: "0.75rem",
    borderRadius: "0.375rem",
    border: "1px solid #c7d2fe",
  },
  error: {
    marginTop: "1rem",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "0.75rem",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
  },
  footer: {
    padding: "1rem",
    borderTop: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  input: {
    width: "100%",
    padding: "0.5rem",
    borderRadius: "0.375rem",
    border: "1px solid #d1d5db",
    fontSize: "0.875rem",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
  },
  button: {
    padding: "0.5rem 1rem",
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    border: "none",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
    alignSelf: "flex-end",
  },
};
