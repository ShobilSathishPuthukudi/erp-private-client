import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertOctagon className="w-10 h-10" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Unexpected System Error</h1>
            <p className="text-slate-500 mb-8">
              A runtime exception has occurred within the client application. The state has been preserved for diagnostic review.
            </p>
            
            <div className="bg-slate-900 text-red-400 p-4 rounded-lg text-left text-xs font-mono mb-8 overflow-auto max-h-32 border border-slate-800">
              {this.state.error?.toString()}
            </div>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-blue-200"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Full System Reload</span>
            </button>
            
            <p className="text-[10px] text-slate-400 mt-6 uppercase tracking-widest font-bold">
              Institutional Quality Assurance Engine Active
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
