
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

    // Helper Mask (Duplicated from parent momentarily, ideally shared utils)
    const getDisplayUser = (id: string, name?: string) => {
        const firstName = name ? name.split(' ')[0] : 'Usuário';
        return `${firstName} (ID: ${id})`;
    };

    const formatDate = (date: any) => {
        if (!date) return 'Data desconhecida';
        if (date.toDate) return date.toDate().toLocaleDateString('pt-BR');
        return 'Data inválida';
    };

    const renderRiskBadges = () => {
        const analysis = item.aiAnalysis;
        const riskLevel = item.riskLevel;
        const elements = [];

        if (riskLevel && riskLevel > 1) {
            let color = "bg-gray-100 text-gray-800";
            if (riskLevel === 2) color = "bg-yellow-100 text-yellow-800";
            if (riskLevel === 3) color = "bg-orange-100 text-orange-800";
            if (riskLevel >= 4) color = "bg-red-100 text-red-800";
            elements.push(
                <Badge key="risk" variant="outline" className={`${color} border-none`}>
                    Risco Nível {riskLevel}
                </Badge>
            );
        }

        if (analysis && Array.isArray(analysis)) {
            // Logic simplified for card
            const unsafeCount = analysis.reduce((acc, img) => acc + (img.predictions?.filter((p: any) => p.probability > 0.5).length || 0), 0);
            if (unsafeCount > 0) {
                elements.push(<Badge key="ai-risk" variant="destructive" className="text-[10px]">IA: {unsafeCount} Alert(s)</Badge>);
            }
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
                <div className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {getDisplayUser(item.userId || 'unknown', (item as any).authorName)}
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
