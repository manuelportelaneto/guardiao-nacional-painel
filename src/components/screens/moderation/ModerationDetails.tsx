
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
                                <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto space-y-2 border border-slate-700">
                                    <div className="flex justify-between border-b border-slate-700 pb-1 mb-2">
                                        <span className="text-gray-400">ID:</span>
                                        <span className="text-blue-300">{contribution.id}</span>
                                    </div>
                                    <p><span className="text-gray-400">User ID:</span> {contribution.userId}</p>
                                    <p><span className="text-gray-400">Status:</span> {contribution.status}</p>
                                    <p className="font-bold text-yellow-400">Risco Calculado: Nível {contribution.riskLevel || 'N/A'}</p>

                                    {/* Smart Queue Priority */}
                                    {(contribution as any).priorityScore !== undefined && (
                                        <div className="mt-2 pt-2 border-t border-slate-700">
                                            <p className="font-bold text-blue-300">Prioridade Smart Queue: {(contribution as any).priorityScore}/100</p>
                                            {(contribution as any).priorityReasons && (contribution as any).priorityReasons.length > 0 && (
                                                <ul className="list-disc list-inside text-gray-400 text-[10px] mt-1">
                                                    {(contribution as any).priorityReasons.map((r: string, idx: number) => (
                                                        <li key={idx}>{r}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}


                                    {/* Gemini Analysis (New Object) */}
                                    {contribution.aiAnalysis && !Array.isArray(contribution.aiAnalysis) && (
                                        <div className="mt-2 pt-2 border-t border-slate-700">
                                            <p className="text-gray-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Análise Gemini 1.5 Flash:</p>
                                            <div className="p-2 rounded bg-slate-800 space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Recomendação IA:</span>
                                                    <span className={`font-bold ${(contribution.aiAnalysis as any).autoAction === 'APPROVE' ? 'text-green-400' : (contribution.aiAnalysis as any).autoAction === 'REJECT' ? 'text-red-500' : 'text-yellow-400'}`}>
                                                        {(contribution.aiAnalysis as any).autoAction}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Categoria Detectada:</span>
                                                    <span className="text-blue-300">{(contribution.aiAnalysis as any).detectedCategory}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Relevância:</span>
                                                    <span>{((contribution.aiAnalysis as any).relevanceScore * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Conflito Texto/Img:</span>
                                                    <span className={(contribution.aiAnalysis as any).contentMismatch ? 'text-red-400' : 'text-green-400'}>
                                                        {(contribution.aiAnalysis as any).contentMismatch ? 'DETECTADO' : 'Nenhum'}
                                                    </span>
                                                </div>
                                                <p className="text-gray-300 italic text-xs border-t border-slate-700 pt-1 mt-1">
                                                    "{(contribution.aiAnalysis as any).reason}"
                                                </p>
                                                {(contribution.aiAnalysis as any).entities && (contribution.aiAnalysis as any).entities.length > 0 && (
                                                    <p className="text-[10px] text-gray-500">
                                                        Entities: {(contribution.aiAnalysis as any).entities.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Legacy Vision API (Array) */}
                                    {contribution.aiAnalysis && Array.isArray(contribution.aiAnalysis) && (
                                        <div className="mt-2 pt-2 border-t border-slate-700">
                                            <p className="text-gray-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Análise de Imagem (Legacy):</p>
                                            {contribution.aiAnalysis.map((res: any, idx: number) => (
                                                <div key={idx} className={`p-2 rounded mb-1 ${res.isSafe ? 'bg-slate-800' : 'bg-red-900/30 border border-red-500/50'}`}>
                                                    <p className={`font-bold ${res.isSafe ? 'text-green-400' : 'text-red-400'}`}>
                                                        Imagem {idx + 1}: {res.isSafe ? 'SEGURA' : 'ALERTA'}
                                                    </p>
                                                    {!res.isSafe && (
                                                        <div className="grid grid-cols-2 gap-x-2 mt-1 opacity-80">
                                                            {res.adult && <p>Adulto: {res.adult}</p>}
                                                            {res.violence && <p>Violência: {res.violence}</p>}
                                                            {res.racy && <p>Picante: {res.racy}</p>}
                                                            {res.medical && <p>Médico: {res.medical}</p>}
                                                            {res.spoof && <p>Spoof: {res.spoof}</p>}
                                                        </div>
                                                    )}
                                                    {res.error && <p className="text-yellow-500">Erro: {res.error}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {contribution.rejectionReason && <p className="text-red-400 pt-2 border-t border-slate-700">Motivo Rejeição: {contribution.rejectionReason}</p>}
                                    {contribution.deletionReason && <p className="text-red-400">Motivo Exclusão: {contribution.deletionReason}</p>}
                                    <p className="text-[10px] text-gray-500 mt-4">Pego via IP: {contribution.ipAddress || 'Unknown'}</p>
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
