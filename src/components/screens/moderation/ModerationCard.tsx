import React from 'react';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Ban, User, CheckCircle2, CheckCheck, Check, Bot } from 'lucide-react';
import type { Contribution } from '../../../types/contribution';

interface ModerationCardProps {
    item: Contribution;
    tab: string; // 'queue', 'approved', 'rejected', etc.
    onClick: (item: Contribution) => void;
    onAction: (action: string, item: Contribution) => void;
    onReply: (item: Contribution) => void;
    isSelected?: boolean;
    onToggleSelect?: (item: Contribution, e: React.MouseEvent) => void;
}

export const ModerationCard: React.FC<ModerationCardProps> = ({
    item,
    tab,
    onClick,
    onAction,
    onReply,
    isSelected = false,
    onToggleSelect
}) => {

    const formatDate = (date: any) => {
        if (!date) return 'Data desconhecida';
        if (date.toDate) return date.toDate().toLocaleDateString('pt-BR');
        return 'Data inválida';
    };

    const isRejectedByAi = item.status === 'Rejeitado' && (
        (item as any).rejectedBy === 'AI' ||
        (item as any).rejectedBy === 'SYSTEM' ||
        item.rejectionReason?.toLowerCase().includes('ia') ||
        item.rejectionReason?.toLowerCase().includes('inteligência') ||
        item.rejectionReason?.toLowerCase().includes('automátic') ||
        item.rejectionReason?.toLowerCase().includes('filtro') ||
        item.aiAnalysis !== undefined ||
        !(item as any).rejectedByAdmin
    );

    const renderRiskBadges = () => {
        const analysis = item.aiAnalysis as any;
        const riskLevel = item.riskLevel;
        const elements = [];

        // 1. NOTA DE RELEVÂNCIA IA (0 a 100)
        const relevance = analysis?.relevanceScore !== undefined
            ? Math.round(analysis.relevanceScore * (analysis.relevanceScore <= 1 ? 100 : 1))
            : (item as any).priorityScore;

        if (relevance !== undefined && relevance > 0) {
            let relBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-300";
            if (relevance < 40) relBadgeColor = "bg-slate-100 text-slate-600 border-slate-300";
            else if (relevance < 70) relBadgeColor = "bg-blue-50 text-blue-700 border-blue-300";

            elements.push(
                <Badge key="relevance" variant="outline" className={`${relBadgeColor} text-[10px] font-bold`}>
                    ✨ Relevância: {relevance}/100
                </Badge>
            );
        }

        // 2. NÍVEL DE RISCO (1 a 5)
        if (riskLevel && riskLevel >= 1) {
            let color = "bg-emerald-50 text-emerald-700 border-emerald-200";
            if (riskLevel === 2) color = "bg-blue-50 text-blue-700 border-blue-200";
            if (riskLevel === 3) color = "bg-amber-100 text-amber-800 border-amber-300";
            if (riskLevel === 4) color = "bg-orange-100 text-orange-800 border-orange-300";
            if (riskLevel >= 5) color = "bg-red-600 text-white border-red-700 font-bold animate-pulse";
            elements.push(
                <Badge key="risk" variant="outline" className={`${color} text-[10px]`}>
                    🛡️ Risco Nível {riskLevel}
                </Badge>
            );
        }

        // 3. SECRETARIA SUGERIDA PELA IA
        const suggestedDept = analysis?.suggestedDepartmentCode || (item as any).suggestedDepartment;
        if (suggestedDept) {
            elements.push(
                <Badge key="dept" variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                    🏛️ {suggestedDept}
                </Badge>
            );
        }

        // 4. ALERTA DE PRIVACIDADE / LGPD
        if (analysis?.isFaceOrPiiDetected || (item as any).regexAnalysis?.isSafe === false) {
            elements.push(
                <Badge key="lgpd" className="bg-red-600 text-white text-[10px]">
                    🛡️ Alerta LGPD / Dados Pessoais
                </Badge>
            );
        }

        // 5. BADGE DE STATUS RESOLVIDO OU RECUSADO POR IA
        if (item.status === 'Resolvido') {
            elements.push(
                <Badge key="resolved" className="bg-green-100 text-green-800 border-green-300 text-[10px]">
                    ✅ Resolvido
                </Badge>
            );
        } else if (isRejectedByAi && (tab === 'rejected' || item.status === 'Rejeitado')) {
            elements.push(
                <Badge key="ai-rejected" variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] flex items-center gap-1">
                    <Bot className="w-3 h-3" /> Recusado pela IA
                </Badge>
            );
        }

        return <div className="flex flex-wrap gap-1 mt-1">{elements}</div>;
    };

    return (
        <Card
            onClick={() => onClick(item)}
            className={`relative cursor-pointer hover:shadow-md transition-all ${
                isSelected ? 'ring-2 ring-blue-600 border-blue-500 bg-blue-50/20 shadow-md' : ''
            }`}
        >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    {/* Checkbox de Seleção Massiva com toque amplo */}
                    {onToggleSelect && (
                        <div
                            role="checkbox"
                            aria-checked={isSelected}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 hover:border-gray-500'
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelect(item, e);
                            }}
                        >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                    )}
                    <Badge variant="outline">{item.category}</Badge>
                </div>
                <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
            </CardHeader>
            <CardContent className="space-y-2">
                {item.imageUrl && (
                    <div className="relative w-full h-40 rounded overflow-hidden bg-gray-100">
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt="Content" loading="lazy" />
                    </div>
                )}
                <h4 className="font-semibold text-sm line-clamp-2">{item.title}</h4>
                {renderRiskBadges()}
                <div className="text-xs text-gray-500 flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium">Usuário Oculto (LGPD)</span>
                    </div>
                    <span className="text-[10px] break-all opacity-70 ml-4">ID: {item.userId || 'unknown'}</span>
                </div>

                {/* Motivo da Rejeição se houver */}
                {item.rejectionReason && (tab === 'rejected' || item.status === 'Rejeitado') && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <span className="font-semibold">Motivo da recusa:</span> {item.rejectionReason}
                    </div>
                )}

                {/* Actions Bar */}
                <div className="pt-2 space-y-1.5">
                    {tab === 'queue' && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="destructive" className="flex-1 h-10 touch-manipulation" onClick={e => { e.stopPropagation(); onAction('reject_contrib', item); }}>
                                Rejeitar
                            </Button>
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 h-10 touch-manipulation" onClick={e => { e.stopPropagation(); onAction('approve_contrib', item); }}>
                                Aprovar
                            </Button>
                        </div>
                    )}
                    {tab === 'approved' && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300 h-10 touch-manipulation" onClick={e => { e.stopPropagation(); onAction('resolve_contrib', item); }}>
                                <CheckCheck className="h-3 w-3 mr-1" /> Resolvido
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 h-10 touch-manipulation" onClick={e => { e.stopPropagation(); onAction('reject_approved', item); }}>
                                <Ban className="h-3 w-3 mr-1" /> Rejeitar
                            </Button>
                        </div>
                    )}
                    {tab === 'rejected' && isRejectedByAi && (
                        <Button
                            size="sm"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 touch-manipulation flex items-center justify-center gap-1.5 shadow-sm"
                            onClick={e => {
                                e.stopPropagation();
                                onAction('accept_override', item);
                            }}
                        >
                            <CheckCircle2 className="h-4 w-4" /> Aceitar Publicação
                        </Button>
                    )}
                    {tab !== 'trash' && (
                        <Button size="sm" variant="ghost" className="w-full text-blue-600 hover:text-blue-700 h-9 touch-manipulation" onClick={e => { e.stopPropagation(); onReply(item); }}>
                            Enviar Mensagem ao Autor
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

