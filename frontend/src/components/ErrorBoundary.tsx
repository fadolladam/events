import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  /** shown in the fallback so the user knows what failed */
  label?: string;
  /** bumping this value re-mounts the boundary (clears the error on tab change) */
  resetKey?: unknown;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Keeps one failing panel from blanking the whole screen. Renders an inline
 * notice with a retry instead. Reset by changing `resetKey`.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error(`[ErrorBoundary${this.props.label ? ` · ${this.props.label}` : ''}]`, error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="w-6 h-6 text-rose-500" />
        <div>
          <p className="text-sm font-bold text-rose-700">
            {this.props.label ? `${this.props.label} could not be displayed.` : 'This section could not be displayed.'}
          </p>
          <p className="text-xs text-rose-500 mt-1 break-words max-w-md">{this.state.error.message}</p>
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }
}
