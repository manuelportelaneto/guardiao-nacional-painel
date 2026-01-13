import React, { Component, ErrorInfo, ReactNode } from 'react';
import { loggingService } from '../services/loggingService';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        loggingService.logError(error, {
            componentStack: errorInfo.componentStack,
            source: 'ErrorBoundary'
        });
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg border text-center space-y-4">
                        <div className="bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Ops! Algo deu errado.</h1>
                        <p className="text-gray-500 text-sm">
                            Ocorreu um erro inesperado. Nossa equipe já foi notificada.
                        </p>

                        {this.state.error && (
                            <div className="bg-gray-100 p-3 rounded text-left text-xs font-mono overflow-auto max-h-32 text-gray-700">
                                {this.state.error.message}
                            </div>
                        )}

                        <Button onClick={this.handleReload} className="w-full gap-2">
                            <RefreshCw className="w-4 h-4" /> Recarregar Página
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
