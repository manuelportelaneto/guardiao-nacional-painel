
import React from 'react';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Ban, User } from 'lucide-react';
import type { Contribution } from '../../../types/contribution';

interface ModerationCardProps {
    item: Contribution;
    tab: string; // 'queue', 'approved', 'rejected', etc.
    onClick: (item: Contribution) => void;
    onAction: (action: string, item: Contribution) => void;
    onReply: (item: Contribution) => void;
}

export const ModerationCard: React.FC<ModerationCardProps> = ({ item, tab, onClick, onAction, onReply }) => {



    const formatDate = (date: any) => {
        if (!date) return 'Data desconhecida';
        if (date.toDate) return date.toDate().toLocaleDateString('pt-BR');
        return 'Data inválida';
    };

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

        return <div className="flex flex-wrap gap-1 mt-1">{elements}</div>;
    };

    return (
        <Card onClick={() => onClick(item)} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row justify-between space-y-0">
                <Badge variant="outline">{item.category}</Badge>
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

                {/* Actions Bar */}
                <div className="pt-2">
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
                        <Button size="sm" variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 h-10 touch-manipulation" onClick={e => { e.stopPropagation(); onAction('reject_approved', item); }}>
                            <Ban className="h-3 w-3 mr-1" /> Rejeitar
                        </Button>
                    )}
                    {tab !== 'trash' && (
                        <Button size="sm" variant="ghost" className="w-full mt-1 text-blue-600 hover:text-blue-700 h-10 touch-manipulation" onClick={e => { e.stopPropagation(); onReply(item); }}>
                            Responder
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
