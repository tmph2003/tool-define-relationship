import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center bg-bg text-text-1"
          style={{ fontFamily: "Space Grotesk, sans-serif" }}
        >
          <div className="flex flex-col items-center p-8 bg-surface border border-border rounded shadow-2xl max-w-md w-full">
            <span className="text-4xl mb-4" style={{ color: "#EF4444" }}>⚠</span>
            <h1 className="text-xl font-bold mb-2">Application Error</h1>
            <p className="text-sm text-text-3 text-center mb-6" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {this.state.error?.message || "An unexpected error occurred in the React tree."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-dim text-amber border border-amber/30 rounded-sm text-sm hover:bg-amber/20 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
