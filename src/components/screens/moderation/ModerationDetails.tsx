
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import type { Contribution } from '../../../types/contribution';

interface ModerationDetailsProps {
    contribution: Contribution | null;
    onClose: () => void;
}

export const ModerationDetails: React.FC<ModerationDetailsProps> = ({ contribution, onClose }) => {

    // Helper Mask (Ideally shared)
    const getDisplayUser = (id: string, name?: string) => {
        const firstName = name ? name.split(' ')[0] : 'Usuário';
        return `${firstName} (ID: ${id})`;
    };

    return (
        <Dialog open={!!contribution} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Detalhes</DialogTitle></DialogHeader>
                {contribution && (
                    <div className="space-y-4">
                        {contribution.imageUrl && <img src={contribution.imageUrl} className="w-full h-80 object-cover rounded" alt="Full" />}
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label className="text-gray-500">Título</Label><p className="font-medium">{contribution.title}</p></div>
                            <div><Label className="text-gray-500">Autor</Label><p>{getDisplayUser(contribution.userId, (contribution as any).authorName)}</p></div>
                            <div className="col-span-2"><Label className="text-gray-500">Descrição</Label><p className="text-sm bg-gray-50 p-2 rounded">{contribution.description}</p></div>
                            <div className="col-span-2 border-t pt-2"><Label className="text-gray-500">IA & Auditoria</Label>
                                <div className="bg-slate-900 text-green-400 p-2 rounded font-mono text-xs overflow-auto">
                                    <p>ID: {contribution.id}</p>
                                    <p>User ID: {contribution.userId}</p>
                                    <p>Status: {contribution.status}</p>
                                    <p className="font-bold text-yellow-400">Risco Calculado: Nível {contribution.riskLevel || 'N/A'}</p>
                                    {contribution.rejectionReason && <p className="text-red-400">Motivo Rejeição: {contribution.rejectionReason}</p>}
                                    {contribution.deletionReason && <p className="text-red-400">Motivo Exclusão: {contribution.deletionReason}</p>}
                                    <p>IP: {contribution.ipAddress || 'Unknown'}</p>
                                    <p>Analysis: {JSON.stringify(contribution.aiAnalysis, null, 2)}</p>
                                    {contribution.imagesMetadata && (
                                        <p>Metadata: {JSON.stringify(contribution.imagesMetadata, null, 2)}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button className="w-full" onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
