import { marked } from "marked";
import React, { useState, useEffect } from "react";

import AiChat from "./AiChat";
import PreviewBar from "./PreviewBar";

interface EditorProps {
  filePath: string;
}

export default function Editor({ filePath }: EditorProps) {
  const [markdown, setMarkdown] = useState("");
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [html, setHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/studio/api/files/${encodeURIComponent(filePath)}`);
        if (res.ok) {
          const data = await res.json();
          setMarkdown(data.content);
          setOriginalMarkdown(data.content);
        } else {
          setError("Failed to load file content.");
        }
      } catch (err) {
        setError("Network error fetching file.");
      } finally {
        setIsLoading(false);
      }
    };

    if (filePath) {
      fetchContent();
    }
  }, [filePath]);

  useEffect(() => {
    Promise.resolve(marked.parse(markdown)).then((res) => setHtml(res as string));
  }, [markdown]);

  const hasChanges = markdown !== originalMarkdown;

  if (isLoading) {
    return <div style={styles.centerMessage}>Loading {filePath}...</div>;
  }

  if (error) {
    return <div style={{ ...styles.centerMessage, color: "#dc2626" }}>{error}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.filePath}>{filePath}</div>
        <PreviewBar
          filePath={filePath}
          currentMarkdown={markdown}
          hasChanges={hasChanges}
          onPublishSuccess={() => setOriginalMarkdown(markdown)}
        />
      </div>

      <div style={styles.mainArea}>
        {/* Left pane: Preview */}
        <div style={styles.pane}>
          <div style={styles.paneHeader}>Preview</div>
          <div
            style={styles.previewContent}
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        {/* Right pane: Markdown source */}
        <div style={{ ...styles.pane, borderLeft: "1px solid #e5e7eb" }}>
          <div style={styles.paneHeader}>Markdown</div>
          <textarea
            style={styles.textarea}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* AI Chat sidebar */}
        <div style={styles.chatSidebar}>
          <AiChat
            markdownContent={markdown}
            onMarkdownUpdate={(newMarkdown) => setMarkdown(newMarkdown)}
          />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#ffffff",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
  },
  filePath: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#111827",
  },
  mainArea: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  pane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  paneHeader: {
    padding: "0.5rem 1rem",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "uppercase",
    color: "#6b7280",
    letterSpacing: "0.05em",
  },
  previewContent: {
    flex: 1,
    padding: "2rem",
    overflowY: "auto",
    backgroundColor: "#ffffff",
    color: "#374151",
    lineHeight: "1.6",
  },
  textarea: {
    flex: 1,
    padding: "1rem",
    border: "none",
    resize: "none",
    outline: "none",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "0.875rem",
    lineHeight: "1.5",
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  chatSidebar: {
    width: "320px",
    borderLeft: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    display: "flex",
    flexDirection: "column",
  },
  centerMessage: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    color: "#6b7280",
  },
};
