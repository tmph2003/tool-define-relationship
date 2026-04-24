import { useState, useRef, useEffect } from "react";
import TrinoConnectForm from "../components/TrinoConnectForm";
import { useProject } from "../store/ProjectContext";
import { useMetadata } from "../store/MetadataContext";
import yaml from "yaml";

const NAV_LINKS = ["Graph", "Relations"];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TopNavbar() {
  const [formOpen, setFormOpen] = useState(false);
  const { state: metadataState } = useMetadata();
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { exportProject, loadProject, activeTab, setActiveTab } = useProject();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProjectMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const handleExportJson = () => {
    const data = exportProject();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, "project.json");
    setShowProjectMenu(false);
  };

  const handleExportYaml = () => {
    const data = exportProject();
    const blob = new Blob([yaml.stringify(data)], { type: "text/yaml" });
    downloadBlob(blob, "project.yaml");
    setShowProjectMenu(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const data = file.name.endsWith(".json") ? JSON.parse(content) : yaml.parse(content);
        loadProject(data);
      } catch (err) {
        console.error("Failed to load project", err);
        alert("Failed to load project file.");
      }
    };
    reader.readAsText(file);
    setShowProjectMenu(false);
    e.target.value = '';
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center px-4"
        style={{
          height: "var(--nav-h)",
          background: "linear-gradient(90deg, #18191C 0%, #111215 100%)",
          borderBottom: "1px solid var(--color-border-mid)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4), inset 0 -1px 0 rgba(245, 166, 35, 0.1)",
        }}
      >
        {/* Logo mark */}
        <div className="flex items-center gap-2 shrink-0" style={{ width: "var(--sidebar-w)" }}>
          <span
            className="flex items-center justify-center rounded-sm text-xs font-bold"
            style={{
              width: 22,
              height: 22,
              background: "var(--color-amber)",
              color: "var(--color-bg)",
              fontFamily: "JetBrains Mono, monospace",
              letterSpacing: "-0.05em",
            }}
          >
            RD
          </span>
          <span
            className="font-medium tracking-tight"
            style={{ fontSize: 13, color: "var(--color-text-1)" }}
          >
            Relationship
            <span style={{ color: "var(--color-text-3)", marginLeft: 4 }}>Designer</span>
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1 px-4" style={{ height: "100%" }}>
          {NAV_LINKS.map((link) => {
            const isActive = activeTab === link;
            return (
              <button
                key={link}
                id={`nav-${link.toLowerCase().replace(" ", "-")}`}
                onClick={() => setActiveTab(link)}
                className={`amber-sweep relative flex items-center px-3 text-xs font-medium transition-colors duration-150 ${isActive ? "active" : ""}`}
                style={{
                  height: "var(--nav-h)",
                  color: isActive ? "var(--color-text-1)" : "var(--color-text-3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                {isActive && (
                  <span
                    className="mr-1.5 inline-block rounded-full"
                    style={{
                      width: 4,
                      height: 4,
                      background: "var(--color-amber)",
                      boxShadow: "0 0 6px var(--color-amber)",
                    }}
                  />
                )}
                {link}
              </button>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center justify-end gap-3 shrink-0 relative" style={{ width: "var(--panel-w)" }} ref={menuRef}>
          {/* Connection status pill */}
          <button
            id="trino-connect-btn"
            onClick={() => setFormOpen(true)}
            title={metadataState.connectionStatus === "connected" ? `Connected to ${metadataState.connectedHost}` : "Click to connect to Trino"}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-all duration-150"
            style={{
              background: metadataState.connectionStatus === "connected"
                ? "rgba(34,197,94,0.08)"
                : "rgba(239,68,68,0.08)",
              border: `1px solid ${metadataState.connectionStatus === "connected" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              color: metadataState.connectionStatus === "connected" ? "#22C55E" : "#EF4444",
              cursor: "pointer",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
          >
            <span
              className="inline-block rounded-full shrink-0"
              style={{
                width: 5,
                height: 5,
                background: metadataState.connectionStatus === "connected" ? "#22C55E" : "#EF4444",
                boxShadow: `0 0 5px ${metadataState.connectionStatus === "connected" ? "#22C55E" : "#EF4444"}`,
                animation: metadataState.connectionStatus === "connected" ? "none" : "pulse 1.5s ease-in-out infinite",
              }}
            />
            {metadataState.connectionStatus === "connected"
              ? `${metadataState.connectedHost || "unknown"}/${metadataState.catalog || "unknown"}`
              : "not connected"}
          </button>

          {/* Project Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all duration-150"
              style={{
                background: "var(--color-amber-dim)",
                color: "var(--color-amber)",
                border: "1px solid rgba(245,166,35,0.3)",
                fontFamily: "Space Grotesk, sans-serif",
                cursor: "pointer",
              }}
            >
              Project ▾
            </button>
            
            {showProjectMenu && (
              <div 
                className="absolute right-0 mt-2 py-1 rounded-sm shadow-xl"
                style={{ 
                  width: 160, 
                  background: "var(--color-surface)", 
                  border: "1px solid var(--color-border)",
                  zIndex: 100 
                }}
              >
                <div className="px-3 py-1 section-label" style={{ fontSize: 9 }}>EXPORT</div>
                <button 
                  onClick={handleExportJson}
                  className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
                  style={{ color: "var(--color-text-1)", fontFamily: "Space Grotesk, sans-serif" }}
                >
                  Save as JSON
                </button>
                <button 
                  onClick={handleExportYaml}
                  className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
                  style={{ color: "var(--color-text-1)", fontFamily: "Space Grotesk, sans-serif" }}
                >
                  Save as YAML
                </button>
                <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
                <div className="px-3 py-1 section-label" style={{ fontSize: 9 }}>IMPORT</div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
                  style={{ color: "var(--color-amber)", fontFamily: "Space Grotesk, sans-serif" }}
                >
                  Load Project...
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImport} 
                  accept=".json,.yaml,.yml" 
                  className="hidden" 
                />
              </div>
            )}
          </div>

          {/* Avatar */}
          <div
            className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
            style={{
              width: 28,
              height: 28,
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border-mid)",
              color: "var(--color-text-2)",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            U
          </div>
        </div>
      </header>

      {/* Trino connection slide-in form */}
      <TrinoConnectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />

      {/* Pulse animation for disconnected dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
      `}</style>
    </>
  );
}
