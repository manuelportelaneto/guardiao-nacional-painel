import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { AlertTriangle, Home, Send, Copy, CheckCircle } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorHash: string;
    isReporting: boolean;
    reported: boolean;
    copied: boolean;
}

const generateErrorHash = () => {
    return 'ERR-PNL-' + Math.random().toString(36).substring(2, 9).toUpperCase();
};

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
        errorHash: '',
        isReporting: false,
        reported: false,
        copied: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
            errorHash: generateErrorHash(),
            isReporting: false,
            reported: false,
            copied: false,
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo,
        });
        console.error('Um erro não tratado foi detectado pelo GlobalErrorBoundary:', error, errorInfo);
    }

    private handleReportError = async () => {
        this.setState({ isReporting: true });

        try {
            const report = {
                hash: this.state.errorHash,
                message: this.state.error?.message,
                stack: this.state.error?.stack,
                componentStack: this.state.errorInfo?.componentStack,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                status: 'Novo',
                source: 'guardiao-painel'
            };

            await addDoc(collection(db, 'crash_reports'), report);
            this.setState({ reported: true });
        } catch (e) {
            console.error('Erro ao enviar report:', e);
            alert('Não foi possível enviar o relatório. Verifique sua conexão.');
        } finally {
            this.setState({ isReporting: false });
        }
    };

    private copyHash = () => {
        navigator.clipboard.writeText(this.state.errorHash);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
    };

    private resetApp = () => {
        // Redireciona de forca bruta para o inicio (garante que estados que causaram crash sao limpos)
        window.location.href = '/hub';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex bg-slate-50 flex-col items-center justify-center min-h-screen p-4">
                    <div className="bg-white max-w-lg w-full rounded-2xl p-8 shadow-xl border border-red-100 flex flex-col items-center text-center">

                        <div className="bg-red-50 text-red-500 rounded-full p-4 mb-6">
                            <AlertTriangle size={48} />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Painel Interrompido</h2>
                        <p className="text-gray-500 mb-6 font-medium">
                            Ocorreu um erro inesperado e o painel precisou ser interrompido para sua segurança.
                        </p>

                        <div className="flex items-center gap-3 bg-slate-100 p-3 rounded-lg border border-slate-200 w-full mb-6">
                            <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider whitespace-nowrap">Cód:</span>
                            <code className="flex-1 font-mono font-bold text-slate-800 tracking-wide">{this.state.errorHash}</code>
                            <Button variant="ghost" size="icon" onClick={this.copyHash} className="h-8 w-8 text-slate-500 hover:text-slate-800">
                                {this.state.copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                            </Button>
                        </div>

                        <div className="w-full space-y-3 pb-2 pt-2">
                            <Button
                                onClick={this.handleReportError}
                                disabled={this.state.reported || this.state.isReporting}
                                variant={this.state.reported ? "outline" : "default"}
                                className={`w-full gap-2 ${this.state.reported ? 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {this.state.reported ? (
                                    <><CheckCircle size={18} /> Relatório enviado aos engenheiros</>
                                ) : (
                                    <><Send size={18} /> {this.state.isReporting ? 'Enviando log...' : 'Reportar falha ao SysAdmin'}</>
                                )}
                            </Button>

                            <Button onClick={this.resetApp} variant="outline" className="w-full gap-2">
                                <Home size={18} /> Voltar ao Hub Administrativo
                            </Button>
                        </div>

                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
