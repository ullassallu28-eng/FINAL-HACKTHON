import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackLabel?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" role="alert">
          <div className="error-boundary-content">
            <strong>{this.props.fallbackLabel ?? "Something went wrong loading this view."}</strong>
            {this.state.errorMessage && (
              <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                {this.state.errorMessage}
              </p>
            )}
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: "12px" }}
              onClick={this.handleRetry}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
