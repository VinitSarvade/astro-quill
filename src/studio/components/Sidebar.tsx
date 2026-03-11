import React, { useState, useEffect } from "react";

import type { FileNode } from "../../shared/types";

interface SidebarProps {
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

export default function Sidebar({ selectedFile, onSelectFile }: SidebarProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch("/studio/api/files");
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files || []);
        } else {
          setError("Failed to load files");
        }
      } catch (err) {
        setError("Network error loading files");
      }
    };
    fetchFiles();
  }, []);

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      if (node.type === "directory") {
        return (
          <div key={node.path} style={{ marginLeft: depth * 12 }}>
            <div style={styles.dirLabel}>
              <span style={{ marginRight: 6 }}>📁</span> {node.name}
            </div>
            <div>{renderTree(node.children || [], depth + 1)}</div>
          </div>
        );
      }

      const isSelected = selectedFile === node.path;
      return (
        <div
          key={node.path}
          style={{
            ...styles.fileItem,
            marginLeft: depth * 12,
            backgroundColor: isSelected ? "#e0e7ff" : "transparent",
            color: isSelected ? "#4338ca" : "#374151",
            fontWeight: isSelected ? "500" : "normal",
          }}
          onClick={() => onSelectFile(node.path)}
        >
          <span style={{ marginRight: 6 }}>📄</span> {node.name}
        </div>
      );
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Content</h2>
      </div>
      <div style={styles.fileList}>
        {error ? (
          <div style={styles.error}>{error}</div>
        ) : files.length > 0 ? (
          renderTree(files)
        ) : (
          <div style={styles.empty}>No content files found.</div>
        )}
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
  },
  title: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: "600",
    color: "#111827",
  },
  fileList: {
    flex: 1,
    overflowY: "auto",
    padding: "0.5rem",
  },
  dirLabel: {
    padding: "0.375rem 0.5rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#4b5563",
    display: "flex",
    alignItems: "center",
    marginTop: "0.25rem",
  },
  fileItem: {
    padding: "0.375rem 0.5rem",
    fontSize: "0.875rem",
    cursor: "pointer",
    borderRadius: "0.25rem",
    display: "flex",
    alignItems: "center",
    margin: "0.125rem 0",
    transition: "background-color 0.1s",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    padding: "0.5rem",
  },
  empty: {
    color: "#6b7280",
    fontSize: "0.875rem",
    padding: "0.5rem",
    textAlign: "center",
  },
};
