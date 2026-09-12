import React from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { CheckCircle2, CheckSquare, XCircle, MessageSquare, X } from 'lucide-react';

interface BulkActionsBarProps {
    selectedCount: number;
    onApprove: () => void;
    onResolve: () => void;
    onReject: () => void;
    onNotify: () => void;
    onClear: () => void;
    loading?: boolean;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
    selectedCount,
    onApprove,
    onResolve,
    onReject,
    onNotify,
    onClear,
    loading = false
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-slate-900/95 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-2.5">
                <Badge className="bg-blue-600 text-white font-mono text-xs px-2.5 py-1 rounded-lg">
                    {selectedCount}
                </Badge>
                <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                    {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    size="sm"
                    onClick={onApprove}
                    disabled={loading}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl font-semibold shadow-xs"
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aprovar ({selectedCount})</span>
                </Button>

                <Button
                    size="sm"
                    onClick={onResolve}
                    disabled={loading}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl font-semibold shadow-xs"
                >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Resolvido ({selectedCount})</span>
                </Button>

                <Button
                    size="sm"
                    onClick={onReject}
                    disabled={loading}
                    className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5 rounded-xl font-semibold shadow-xs"
                >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Rejeitar</span>
                </Button>

                <Button
                    size="sm"
                    onClick={onNotify}
                    disabled={loading}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 rounded-xl font-semibold shadow-xs"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Notificar</span>
                </Button>

                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClear}
                    disabled={loading}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                    title="Desmarcar todos"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};
