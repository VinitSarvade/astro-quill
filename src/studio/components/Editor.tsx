import React, { useState, useEffect, useCallback } from "react";

import AiChat from "./AiChat";
import FrontmatterEditor from "./FrontmatterEditor";
import PreviewBar from "./PreviewBar";

interface EditorProps {
  filePath: string;
}

type FrontmatterEntry = { key: string; value: string };

function parseFrontmatter(raw: string): { entries: FrontmatterEntry[]; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { entries: [], body: raw };

  const yamlBlock = match[1];
  const body = match[2];
  const entries: FrontmatterEntry[] = [];

  for (const line of yamlBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key) entries.push({ key, value });
  }

  return { entries, body };
}

function assembleFrontmatter(entries: FrontmatterEntry[], body: string): string {
  if (entries.length === 0) return body;

  const yaml = entries
    .filter((e) => e.key.trim())
    .map((e) => {
      const needsQuotes = /[:#{}[\],&*?|>!%@`]/.test(e.value) || /^\s|\s$/.test(e.value);
      const val = needsQuotes ? `"${e.value.replace(/"/g, '\\"')}"` : e.value;
      return `${e.key}: ${val}`;
    })
    .join("\n");

  return `---\n${yaml}\n---\n${body}`;
}

export default function Editor({ filePath }: EditorProps) {
  const [frontmatter, setFrontmatter] = useState<FrontmatterEntry[]>([]);
  const [body, setBody] = useState("");
  const [originalFullContent, setOriginalFullContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/studio/api/files/${filePath.split("/").map(encodeURIComponent).join("/")}`);
        if (res.ok) {
          const data = await res.json();
          const { entries, body: parsedBody } = parseFrontmatter(data.content);
          setFrontmatter(entries);
          setBody(parsedBody);
          setOriginalFullContent(data.content);
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

  const fullContent = assembleFrontmatter(frontmatter, body);
  const hasChanges = fullContent !== originalFullContent;

  const handleAiUpdate = useCallback((newMarkdown: string) => {
    const { entries, body: newBody } = parseFrontmatter(newMarkdown);
    setFrontmatter(entries);
    setBody(newBody);
  }, []);

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
          currentMarkdown={fullContent}
          hasChanges={hasChanges}
          onPublishSuccess={() => setOriginalFullContent(fullContent)}
        />
      </div>

      <FrontmatterEditor entries={frontmatter} onChange={setFrontmatter} />

      <div style={styles.mainArea}>
        <div style={styles.pane}>
          <textarea
            style={styles.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div style={styles.chatSidebar}>
          <AiChat
            markdownContent={fullContent}
            onMarkdownUpdate={handleAiUpdate}
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
