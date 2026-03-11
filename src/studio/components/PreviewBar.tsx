import React, { useState, useEffect } from "react";

interface PreviewBarProps {
  filePath: string;
  currentMarkdown: string;
  hasChanges: boolean;
  onPublishSuccess: () => void;
}

type PRStatus = "idle" | "creating" | "polling" | "ready" | "publishing" | "published" | "error";

export default function PreviewBar({
  filePath,
  currentMarkdown,
  hasChanges,
  onPublishSuccess,
}: PreviewBarProps) {
  const [status, setStatus] = useState<PRStatus>("idle");
  const [prNumber, setPrNumber] = useState<number | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "polling" || !prNumber) return;

    const poll = async () => {
      try {
        const res = await fetch(`/studio/api/preview/${prNumber}/status`, { credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          if (data.previewUrl) {
            setPreviewUrl(data.previewUrl);
            setStatus("ready");
            return;
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
      setTimeout(poll, 5000);
    };

    poll();
  }, [status, prNumber]);

  const handleCreatePreview = async () => {
    setStatus("creating");
    setErrorMsg(null);
    try {
      const res = await fetch("/studio/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, markdownContent: currentMarkdown }),
      });

      const data = await res.json();

      if (res.ok) {
        setPrNumber(data.prNumber);
        setPrUrl(data.prUrl);
        setStatus("polling");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Failed to create preview");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("Network error");
    }
  };

  const handlePublish = async () => {
    if (!prNumber) return;
    setStatus("publishing");
    setErrorMsg(null);
    try {
      const res = await fetch("/studio/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prNumber }),
      });

      if (res.ok) {
        setStatus("published");
        onPublishSuccess();
        setTimeout(() => {
          setStatus("idle");
          setPrNumber(null);
          setPrUrl(null);
          setPreviewUrl(null);
        }, 3000);
      } else {
        const data = await res.json();
        setStatus("error");
        setErrorMsg(data.error || "Failed to publish");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("Network error");
    }
  };

  return (
    <div style={styles.container}>
      {status === "error" && (
        <div style={styles.error} title={errorMsg || "Error"}>
          ⚠️ {errorMsg}
        </div>
      )}

      {status === "idle" && (
        <button
          onClick={handleCreatePreview}
          disabled={!hasChanges}
          style={{
            ...styles.buttonPrimary,
            opacity: hasChanges ? 1 : 0.5,
            cursor: hasChanges ? "pointer" : "not-allowed",
          }}
        >
          Create Preview
        </button>
      )}

      {status === "creating" && <div style={styles.statusText}>Creating PR...</div>}

      {status === "polling" && (
        <div style={styles.statusContainer}>
          <a href={prUrl!} target="_blank" rel="noreferrer" style={styles.link}>
            View PR
          </a>
          <div style={styles.statusText}>⏳ Waiting for build...</div>
        </div>
      )}

      {status === "ready" && (
        <div style={styles.statusContainer}>
          <a href={previewUrl!} target="_blank" rel="noreferrer" style={styles.linkPrimary}>
            👁 View Preview
          </a>
          <button onClick={handlePublish} style={styles.buttonSuccess}>
            Publish
          </button>
        </div>
      )}

      {status === "publishing" && <div style={styles.statusText}>Merging PR...</div>}

      {status === "published" && <div style={styles.statusSuccess}>✅ Published!</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  statusContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  buttonPrimary: {
    padding: "0.375rem 0.75rem",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "0.25rem",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  buttonSuccess: {
    padding: "0.375rem 0.75rem",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "0.25rem",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  link: {
    color: "#6b7280",
    fontSize: "0.875rem",
    textDecoration: "none",
  },
  linkPrimary: {
    color: "#3b82f6",
    fontSize: "0.875rem",
    textDecoration: "none",
    fontWeight: "500",
  },
  statusText: {
    color: "#4b5563",
    fontSize: "0.875rem",
  },
  statusSuccess: {
    color: "#059669",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
