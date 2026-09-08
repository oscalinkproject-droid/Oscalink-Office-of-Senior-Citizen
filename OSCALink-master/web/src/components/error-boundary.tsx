'use client';

import { Component, type ReactNode } from 'react';
import { reportErrorToDeveloper } from '@/lib/report-error';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  stack: string;
  sending: boolean;
  sent: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
    stack: '',
    sending: false,
    sent: false,
  };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error && error.stack ? error.stack : '',
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  private handleSend = async () => {
    this.setState({ sending: true, sent: false });
    const result = await reportErrorToDeveloper({
      message: this.state.message || 'Unexpected error in OSCALink',
      stack: this.state.stack,
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    });
    this.setState({ sending: false, sent: result.success });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-lowest p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-3xl text-red-400">error</span>
          </div>
          <h1 className="text-xl font-headline font-bold text-foreground">
            An unexpected error occurred in OSCALink.
          </h1>
          <p className="text-xs text-outline mt-2 leading-relaxed">
            Something went wrong while rendering this page. Please try again or report the issue to the development team.
          </p>

          {this.state.message && (
            <div className="mt-4 p-3 rounded-lg bg-surface-low border border-outline-variant/20 text-left">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Error details</p>
              <p className="text-[11px] text-red-400 break-words font-mono max-h-28 overflow-y-auto">{this.state.message}</p>
            </div>
          )}

          {this.state.sent && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Error report successfully sent to the developer!
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={this.handleSend}
              disabled={this.state.sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-sm">{this.state.sending ? 'hourglass_top' : 'bug_report'}</span>
              {this.state.sending ? 'Sending...' : 'Send Bug Report to Developer'}
            </button>
            <button
              onClick={() => { this.setState({ hasError: false }); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-low border border-outline-variant/20 text-foreground text-xs font-bold hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
