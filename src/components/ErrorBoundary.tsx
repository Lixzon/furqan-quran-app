import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{
  children: ReactNode;
}, {
  hasError: boolean;
}> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-base px-6 text-center">
          <div className="max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-card">
            <div className="text-lg font-semibold text-ink">Something went wrong</div>
            <p className="mt-2 text-sm leading-relaxed text-mut">
              The app could not load properly. Please try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-onaccent pressable"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
