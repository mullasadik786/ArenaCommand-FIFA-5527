import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 bg-rose-950/50 rounded-xl border border-rose-900/30">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-md font-bold uppercase tracking-wider font-mono">ArenaCommand Fail-Safe</h2>
                <p className="text-[10px] text-slate-400 font-medium">Global Error Boundary Triggered</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              The application encountered a runtime boundary crash. Our resilient local buffer prevented a total system blackout.
            </p>

            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/60 font-mono text-[10px] text-rose-400 max-h-[150px] overflow-auto leading-relaxed">
              <p className="font-bold text-slate-500 uppercase tracking-wider text-[8px] mb-1">Diagnostic Log:</p>
              <p className="font-bold">{this.state.error && this.state.error.toString()}</p>
              {this.state.errorInfo && (
                <p className="text-slate-400 mt-2 whitespace-pre-wrap text-[9px]">
                  {this.state.errorInfo.componentStack}
                </p>
              )}
            </div>

            <button
              onClick={this.handleReset}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recover Application State
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
