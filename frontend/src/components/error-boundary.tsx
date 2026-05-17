import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  handleClearAndReload = () => {
    localStorage.removeItem('sofa_token');
    this.setState({ hasError: false, error: null });
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-900">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className="rounded-xl bg-red-600/10 p-3">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <CardTitle className="text-lg text-zinc-50">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-400 text-center">
                An unexpected error occurred. This might be caused by a session issue.
              </p>
              {this.state.error && (
                <pre className="text-xs text-zinc-500 bg-zinc-800 p-3 rounded-md overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1 border-zinc-700"
                >
                  Try Again
                </Button>
                <Button
                  onClick={this.handleClearAndReload}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Re-login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
