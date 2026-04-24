import { useState } from "react";
import type { TrinoConnectionRequest, ConnectionStatus } from "../types";

interface Props {
  status: ConnectionStatus;
  error: string | null;
  onConnect: (params: TrinoConnectionRequest) => void;
  onDisconnect: () => void;
  connectedHost: string | null;
  catalog: string | null;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: 3,
  padding: "5px 8px",
  fontSize: 11,
  fontFamily: "JetBrains Mono, monospace",
  color: "var(--color-text-1)",
  outline: "none",
  caretColor: "var(--color-amber)",
  boxSizing: "border-box",
};

export default function ConnectionPanel({
  status,
  error,
  onConnect,
  onDisconnect,
  connectedHost,
  catalog,
}: Props) {
  const [open, setOpen] = useState(status === "idle" || status === "error");
  const [host, setHost] = useState("trino.sunhouse.com.vn");
  const [port, setPort] = useState("443");
  const [user, setUser] = useState("sunhouseit");
  const [password, setPassword] = useState("");
  const [cat, setCat] = useState("dp_warehouse");
  const [scheme, setScheme] = useState<"http" | "https">("https");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect({ host, port: Number(port), user, password: password || undefined, catalog: cat, http_scheme: scheme });
  };

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div
      style={{
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 12px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        {/* Status dot */}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            flexShrink: 0,
            background:
              isConnected
                ? "#4ade80"
                : status === "error"
                ? "#f87171"
                : isConnecting
                ? "var(--color-amber)"
                : "var(--color-text-3)",
            boxShadow: isConnected
              ? "0 0 6px #4ade8066"
              : isConnecting
              ? "0 0 6px var(--color-amber)"
              : "none",
            animation: isConnecting ? "pulse-amber 1s infinite" : "none",
          }}
        />
        <span
          className="section-label"
          style={{ flex: 1, textAlign: "left", color: "var(--color-text-2)" }}
        >
          {isConnected
            ? `${connectedHost} · ${catalog}`
            : isConnecting
            ? "connecting..."
            : "trino connection"}
        </span>
        <span
          style={{
            fontSize: 9,
            fontFamily: "JetBrains Mono, monospace",
            color: "var(--color-text-3)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>

      {/* Expandable form / status */}
      {open && (
        <div style={{ padding: "0 12px 10px" }}>
          {isConnected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p
                style={{
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                  color: "var(--color-text-3)",
                  margin: 0,
                }}
              >
                Connected to <span style={{ color: "#4ade80" }}>{connectedHost}</span>
                {" "}· catalog <span style={{ color: "var(--color-amber)" }}>{catalog}</span>
              </p>
              <button
                onClick={onDisconnect}
                style={{
                  alignSelf: "flex-start",
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.25)",
                  borderRadius: 3,
                  padding: "3px 8px",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#f87171",
                  cursor: "pointer",
                }}
              >
                disconnect
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {error && (
                <p
                  style={{
                    fontSize: 10,
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#f87171",
                    margin: "0 0 2px",
                    wordBreak: "break-all",
                  }}
                >
                  ✕ {error}
                </p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 72px", gap: 4 }}>
                <input style={inputStyle} placeholder="host" value={host} onChange={(e) => setHost(e.target.value)} />
                <input style={inputStyle} placeholder="port" value={port} onChange={(e) => setPort(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <input style={inputStyle} placeholder="user" value={user} onChange={(e) => setUser(e.target.value)} />
                <input style={inputStyle} type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <input style={inputStyle} placeholder="catalog" value={cat} onChange={(e) => setCat(e.target.value)} />
              <select
                style={{ ...inputStyle, color: "var(--color-text-2)" }}
                value={scheme}
                onChange={(e) => setScheme(e.target.value as "http" | "https")}
              >
                <option value="http">http</option>
                <option value="https">https</option>
              </select>
              <button
                type="submit"
                disabled={isConnecting}
                style={{
                  marginTop: 2,
                  background: isConnecting ? "var(--color-surface-2)" : "var(--color-amber-dim)",
                  border: "1px solid rgba(245,166,35,0.3)",
                  borderRadius: 3,
                  padding: "5px 0",
                  fontSize: 11,
                  fontFamily: "JetBrains Mono, monospace",
                  color: isConnecting ? "var(--color-text-3)" : "var(--color-amber)",
                  cursor: isConnecting ? "not-allowed" : "pointer",
                  letterSpacing: "0.06em",
                }}
              >
                {isConnecting ? "connecting…" : "connect →"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
