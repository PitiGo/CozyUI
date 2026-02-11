import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * React Error Boundary.
 * Catches rendering errors and shows a recovery UI instead of crashing the entire app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[9999]">
          <div className="max-w-md w-full mx-4 p-8 bg-slate-900 border border-white/10 rounded-2xl text-center space-y-4">
            <AlertTriangle size={48} className="text-amber-400 mx-auto" />
            <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              An unexpected error occurred. You can try reloading the app.
            </p>
            {this.state.error && (
              <pre className="mt-2 p-3 bg-black/40 rounded-lg text-xs text-rose-400 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm text-slate-300 hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-sm text-white hover:bg-indigo-500 transition-colors"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
