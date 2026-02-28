import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { MapPin, Calendar, User, Tag, Clock, CircleCheckBig, CircleX, TriangleAlert } from "lucide-react";

interface ContributionDetailModalProps {
    contribution: any; // Using any for flexibility or Contribution interface
    open: boolean;
    onClose: () => void;
}

const ContributionDetailModal: React.FC<ContributionDetailModalProps> = ({ contribution, open, onClose }) => {
    if (!contribution) return null;

    const formatDate = (date: any) => {
        if (!date) return 'Data desconhecida';
        return date.toDate ? date.toDate().toLocaleString('pt-BR') : new Date(date).toLocaleString('pt-BR');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Resolvido':
            case 'Aprovado':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200"><CircleCheckBig className="w-3 h-3 mr-1" /> {status}</Badge>;
            case 'Rejeitado':
            case 'Lixo':
                return <Badge variant="destructive"><CircleX className="w-3 h-3 mr-1" /> {status}</Badge>;
            default:
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden" aria-describedby="contribution-desc">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold leading-tight">
                                {contribution.title || 'Sem título'}
                            </DialogTitle>
                            <DialogDescription id="contribution-desc" className="flex items-center gap-2">
                                <Tag className="w-3 h-3" /> {contribution.category || 'Geral'}
                            </DialogDescription>
                        </div>
                        {getStatusBadge(contribution.status)}
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 pt-2">
                    <div className="space-y-6">
                        {/* Image Section */}
                        {contribution.imageUrl && (
                            <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 max-h-80 flex items-center justify-center">
                                <img
                                    src={contribution.imageUrl}
                                    alt="Evidência"
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Descrição Detalhada</h4>
                            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed border border-gray-100">
                                {contribution.description || 'Nenhuma descrição fornecida.'}
                            </p>
                        </div>

                        {/* Meta Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <h4 className="text-xs font-medium text-gray-500 uppercase">Localização</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span>{contribution.city} - {contribution.state || contribution.uf}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-medium text-gray-500 uppercase">Data do Registro</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>{formatDate(contribution.createdAt)}</span>
                                </div>
                            </div>
                            {contribution.userId && (
                                <div className="col-span-2 space-y-1 pt-2 border-t border-gray-100 mt-2">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase">ID do Autor</h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-mono bg-gray-50 p-1.5 rounded inline-block">
                                        <User className="w-3 h-3 text-gray-400" />
                                        {contribution.userId}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* AI Analysis (Optional) */}
                        {contribution.aiAnalysis && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <h4 className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1">
                                    <TriangleAlert className="w-3 h-3" /> Análise IA
                                </h4>
                                <div className="text-xs text-blue-800 space-y-1">
                                    {contribution.aiAnalysis.map((analysis: any, idx: number) => (
                                        <div key={idx}>
                                            Probabilidade: {analysis.probability ? (analysis.probability * 100).toFixed(1) + '%' : 'N/A'} - {analysis.className}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ContributionDetailModal;
