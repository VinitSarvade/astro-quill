import React, { useState, useEffect } from "react";

import Editor from "./components/Editor";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";

export default function StudioApp() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/studio/api/files");
        if (res.status === 401) {
          setIsAuthenticated(false);
        } else if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div
        style={{
          width: "250px",
          borderRight: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Sidebar selectedFile={selectedFilePath} onSelectFile={setSelectedFilePath} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {selectedFilePath ? (
          <Editor filePath={selectedFilePath} />
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              color: "#6b7280",
            }}
          >
            Select a file from the sidebar to start editing
          </div>
        )}
      </div>
    </div>
  );
}
