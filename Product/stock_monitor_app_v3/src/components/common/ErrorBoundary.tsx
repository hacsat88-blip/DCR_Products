"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      `[ErrorBoundary${this.props.fallbackLabel ? `: ${this.props.fallbackLabel}` : ""}]`,
      error,
      info.componentStack
    );
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded-none border border-danger/30 bg-danger/5 p-6 text-center">
          <p className="text-sm font-semibold text-danger">
            {this.props.fallbackLabel ?? "このセクション"}でエラーが発生しました
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {this.state.error?.message ?? "不明なエラー"}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 rounded-none border border-border-subtle px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-mint/60"
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
