import { useState, useRef, useEffect } from "react";
import type { TrinoConnectionResponse } from "../types";

import { useToast } from "../contexts/ToastContext";
import { useMetadata } from "../store/MetadataContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "success" | "error";

interface FormValues {
  host: string;
  port: string;
  user: string;
  password: string;
  catalog: string;
  schema: string;
  http_scheme: "http" | "https";
}

const DEFAULT: FormValues = {
  host: "trino.sunhouse.com.vn",
  port: "443",
  user: "",
  password: "",
  catalog: "",
  schema: "",
  http_scheme: "https",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  id,
  type = "text",
  value,
  placeholder,
  onChange,
  mono = false,
  required = false,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  mono?: boolean;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="section-label flex items-center gap-1"
        style={{ fontSize: 9, color: "var(--color-text-3)" }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--color-amber)", fontSize: 9 }}>*</span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={type === "password" ? "current-password" : "off"}
        className="w-full px-2.5 py-2 text-xs rounded-sm transition-all duration-150 outline-none"
        style={{
          fontFamily: mono ? "JetBrains Mono, monospace" : "Space Grotesk, sans-serif",
          background: "var(--color-surface-2)",
          border: `1px solid ${focused ? "var(--color-amber)" : "var(--color-border-mid)"}`,
          color: "var(--color-text-1)",
          caretColor: "var(--color-amber)",
          boxShadow: focused ? "0 0 0 2px rgba(245,166,35,0.10)" : "none",
        }}
      />
    </div>
  );
}

function StatusBanner({
  status,
  result,
  error,
}: {
  status: Status;
  result: TrinoConnectionResponse | null;
  error: string;
}) {
  if (status === "idle") return null;

  if (status === "loading") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-sm animate-fade-in-up"
        style={{
          background: "rgba(245,166,35,0.08)",
          border: "1px solid rgba(245,166,35,0.2)",
        }}
      >
        {/* Spinner */}
        <span
          className="inline-block rounded-full shrink-0"
          style={{
            width: 10,
            height: 10,
            border: "2px solid rgba(245,166,35,0.3)",
            borderTopColor: "var(--color-amber)",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <span
          className="text-xs"
          style={{ color: "var(--color-amber)", fontFamily: "JetBrains Mono, monospace" }}
        >
          connecting…
        </span>
      </div>
    );
  }

  if (status === "success" && result) {
    return (
      <div
        className="animate-fade-in-up rounded-sm overflow-hidden"
        style={{
          background: "rgba(34,197,94,0.07)",
          border: "1px solid rgba(34,197,94,0.25)",
        }}
      >
        {/* Top bar */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ borderBottom: "1px solid rgba(34,197,94,0.15)" }}
        >
          <span style={{ color: "#22C55E", fontSize: 12 }}>✓</span>
          <span
            className="text-xs font-medium"
            style={{ color: "#22C55E", fontFamily: "Space Grotesk, sans-serif" }}
          >
            Connected
          </span>
        </div>
        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2">
          {[
            ["host", result.host],
            ["port", String(result.port)],
            ["catalog", result.catalog],
            ["schema", result.schema_name ?? "—"],
            ["user", result.user],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="section-label" style={{ fontSize: 9, minWidth: 40 }}>{k}</span>
              <span
                className="text-xs truncate"
                style={{ color: "var(--color-text-2)", fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex items-start gap-2 px-3 py-2.5 rounded-sm animate-fade-in-up"
        style={{
          background: "rgba(239,68,68,0.07)",
          border: "1px solid rgba(239,68,68,0.25)",
        }}
      >
        <span style={{ color: "#EF4444", fontSize: 12, lineHeight: 1.5 }}>✕</span>
        <span
          className="text-xs"
          style={{ color: "#EF4444", fontFamily: "JetBrains Mono, monospace", wordBreak: "break-word" }}
        >
          {error}
        </span>
      </div>
    );
  }

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrinoConnectForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { connect, disconnect, state: metadataState } = useMetadata();
  const [form, setForm] = useState<FormValues>(DEFAULT);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<TrinoConnectionResponse | null>(null);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset status when re-opened
  useEffect(() => {
    if (open) {
      setStatus("idle");
      setResult(null);
      setError("");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const set = (key: keyof FormValues) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const trimmedHost = form.host.trim();
    const trimmedCatalog = form.catalog.trim();
    const parsedPort = parseInt(form.port, 10);
    
    if (!trimmedHost) {
      toast({ type: "error", message: "Host cannot be empty." });
      return;
    }
    if (!trimmedCatalog) {
      toast({ type: "error", message: "Catalog cannot be empty." });
      return;
    }
    if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      toast({ type: "error", message: "Port must be a valid number between 1 and 65535." });
      return;
    }

    setStatus("loading");
    setResult(null);
    setError("");

    try {
      const res = await connect({
        host: trimmedHost,
        port: parsedPort,
        user: form.user.trim(),
        password: form.password || undefined,
        catalog: trimmedCatalog,
        schema: form.schema.trim() || undefined,
        http_scheme: form.http_scheme,
      });
      setResult(res);
      setStatus("success");
      toast({ type: "success", message: `Connected to Trino cluster: ${trimmedHost}` });
      
      // Auto-close after 1.5 seconds on success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setStatus("error");
      toast({ type: "error", message: `Connection failed: ${msg}` });
    }
  };

  const handleDisconnect = async () => {
    setStatus("idle");
    setResult(null);
    setError("");
    try {
      await disconnect();
      toast({ type: "success", message: "Disconnected from Trino" });
      onClose();
    } catch (e) {
      toast({ type: "error", message: "Failed to disconnect" });
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Trino connection form"
        className="fixed z-50 animate-slide-right"
        style={{
          top: "var(--nav-h)",
          right: 0,
          bottom: 0,
          width: 340,
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border-mid)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div>
            <div
              className="font-semibold text-xs"
              style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--color-text-1)" }}
            >
              Trino Connection
            </div>
            <div className="section-label mt-0.5" style={{ fontSize: 9 }}>
              POST /api/v1/trino/connect
            </div>
          </div>
          <button
            id="trino-form-close"
            onClick={onClose}
            className="flex items-center justify-center rounded-sm transition-colors duration-100"
            style={{
              width: 24,
              height: 24,
              background: "none",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-3)",
              cursor: "pointer",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.4)";
              (e.currentTarget as HTMLButtonElement).style.color = "#EF4444";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-3)";
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          id="trino-connect-form"
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-y-auto"
        >
          <div className="flex flex-col gap-3 px-4 py-4">

            {/* Scheme toggle */}
            <div className="flex flex-col gap-1">
              <span className="section-label" style={{ fontSize: 9, color: "var(--color-text-3)" }}>
                HTTP SCHEME
              </span>
              <div
                className="flex rounded-sm overflow-hidden"
                style={{ border: "1px solid var(--color-border-mid)" }}
              >
                {(["http", "https"] as const).map((scheme) => (
                  <button
                    key={scheme}
                    type="button"
                    onClick={() => set("http_scheme")(scheme)}
                    className="flex-1 py-1.5 text-xs transition-all duration-100"
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      background: form.http_scheme === scheme ? "var(--color-amber-dim)" : "var(--color-surface-2)",
                      color: form.http_scheme === scheme ? "var(--color-amber)" : "var(--color-text-3)",
                      border: "none",
                      cursor: "pointer",
                      borderRight: scheme === "http" ? "1px solid var(--color-border-mid)" : "none",
                    }}
                  >
                    {scheme}
                  </button>
                ))}
              </div>
            </div>

            {/* Host + Port in a row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Field id="trino-host" label="HOST" value={form.host} onChange={set("host")}
                  placeholder="trino.host" mono required />
              </div>
              <Field id="trino-port" label="PORT" value={form.port} onChange={set("port")}
                placeholder="8080" mono />
            </div>

            <div
              className="border-t"
              style={{ borderColor: "var(--color-border)" }}
            />

            {/* Credentials */}
            <Field id="trino-user" label="USER" value={form.user} onChange={set("user")}
              placeholder="trino" required />
            <Field id="trino-password" label="PASSWORD" type="password" value={form.password}
              onChange={set("password")} placeholder="leave empty if none" />

            <div
              className="border-t"
              style={{ borderColor: "var(--color-border)" }}
            />

            {/* Catalog / Schema */}
            <Field id="trino-catalog" label="CATALOG" value={form.catalog} onChange={set("catalog")}
              placeholder="hive" mono required />
            <Field id="trino-schema" label="SCHEMA" value={form.schema} onChange={set("schema")}
              placeholder="default (optional)" mono />
          </div>

          {/* Status */}
          <div className="px-4 pb-2">
            <StatusBanner status={status} result={result} error={error} />
          </div>

          {/* Footer actions */}
          <div
            className="flex gap-2 px-4 py-3 mt-auto shrink-0"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            {metadataState.connectionStatus === "connected" ? (
              <>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex-1 py-2 text-xs font-semibold rounded-sm transition-all duration-150"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#EF4444",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239, 68, 68, 0.2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239, 68, 68, 0.1)"; }}
                >
                  Disconnect
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-xs rounded-sm transition-all duration-100"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border-mid)",
                    color: "var(--color-text-2)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-2)"; }}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <button
                  id="trino-connect-cancel"
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-xs rounded-sm transition-all duration-100"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border-mid)",
                    color: "var(--color-text-2)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-2)"; }}
                >
                  Cancel
                </button>
                <button
                  id="trino-connect-submit"
                  type="submit"
                  disabled={status === "loading"}
                  className="flex-1 py-2 text-xs font-semibold rounded-sm transition-all duration-150"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    background: status === "loading" ? "rgba(245,166,35,0.4)" : "var(--color-amber)",
                    color: "var(--color-bg)",
                    border: "none",
                    cursor: status === "loading" ? "not-allowed" : "pointer",
                    opacity: status === "loading" ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (status !== "loading")
                      (e.currentTarget as HTMLButtonElement).style.background = "#F0A020";
                  }}
                  onMouseLeave={(e) => {
                    if (status !== "loading")
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--color-amber)";
                  }}
                >
                  {status === "loading" ? "Connecting…" : status === "success" ? "Reconnect" : "Connect"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Spinner keyframe (injected inline so no extra CSS file needed) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
