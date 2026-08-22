
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



    return (
        <Dialog open={!!contribution} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Detalhes</DialogTitle></DialogHeader>
                {contribution && (
                    <div className="space-y-4">
                        {contribution.imageUrl && <img src={contribution.imageUrl} className="w-full h-80 object-cover rounded" alt="Full" />}
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label className="text-gray-500">Título</Label><p className="font-medium">{contribution.title}</p></div>
                            <div><Label className="text-gray-500">Privacidade</Label><p className="text-sm italic text-gray-400">Nome Oculto (LGPD)</p></div>
                            <div className="col-span-2"><Label className="text-gray-500">Descrição</Label><p className="text-sm bg-gray-50 p-2 rounded">{contribution.description}</p></div>
                            <div className="col-span-2 border-t pt-2"><Label className="text-gray-500">IA & Auditoria</Label>
                                <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs space-y-2 border border-slate-700">
                                    <div className="flex flex-col border-b border-slate-700 pb-2 mb-2 gap-1">
                                        <span className="text-gray-400 text-[10px] uppercase">ID Contribuição:</span>
                                        <span className="text-blue-300 break-all">{contribution.id}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 pb-2 border-b border-slate-700/50 mb-2">
                                        <span className="text-gray-400 text-[10px] uppercase">User ID (Autor):</span>
                                        <span className="text-gray-300 break-all">{contribution.userId}</span>
                                    </div>
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


                                    {/* Scorecard de Triagem Multimodal IA */}
                                    <div className="p-3.5 bg-slate-800 rounded-xl border border-slate-700 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                                <span>🤖</span> Scorecard de Triagem & IA
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(contribution.aiAnalysis as any)?.autoAction === 'APPROVE' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40' : (contribution.aiAnalysis as any)?.autoAction === 'REJECT' ? 'bg-red-900/60 text-red-300 border border-red-500/40' : 'bg-amber-900/60 text-amber-300 border border-amber-500/40'}`}>
                                                Recomendação: {(contribution.aiAnalysis as any)?.autoAction || 'EM ANÁLISE'}
                                            </span>
                                        </div>

                                        {/* Barra de Relevância */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">Nota de Relevância Cívica:</span>
                                                <span className="font-bold text-blue-300">
                                                    {(contribution.aiAnalysis as any)?.relevanceScore !== undefined
                                                        ? `${Math.round((contribution.aiAnalysis as any).relevanceScore * ((contribution.aiAnalysis as any).relevanceScore <= 1 ? 100 : 1))}/100`
                                                        : `${(contribution as any).priorityScore || 65}/100`}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${(contribution.aiAnalysis as any)?.relevanceScore !== undefined
                                                            ? Math.round((contribution.aiAnalysis as any).relevanceScore * ((contribution.aiAnalysis as any).relevanceScore <= 1 ? 100 : 1))
                                                            : (contribution as any).priorityScore || 65}%`
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Risco e Secretaria */}
                                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-700/60">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Grau de Risco:</span>
                                                <span className={`font-bold ${contribution.riskLevel && contribution.riskLevel >= 4 ? 'text-red-400' : contribution.riskLevel === 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    Nível {contribution.riskLevel || 2} de 5
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Secretaria Indicada:</span>
                                                <span className="font-bold text-indigo-300">
                                                    {(contribution.aiAnalysis as any)?.suggestedDepartmentCode || (contribution as any).suggestedDepartment || 'SMOSP (Obras)'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mensagem Didática LGPD / Orientação ao Cidadão */}
                                        {((contribution.aiAnalysis as any)?.isFaceOrPiiDetected || (contribution as any).regexAnalysis?.isSafe === false) && (
                                            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                                                        🛡️ Feedback Didático LGPD Sugerido pela IA:
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const text = (contribution.aiAnalysis as any)?.piiViolationReason || "Por motivos de privacidade e conformidade com a LGPD (Lei 13.709/2018), não é permitido incluir fotos com rostos de pessoas, placas de veículos, documentos ou telefones. Por favor, reenvie desfocando ou removendo os dados pessoais.";
                                                            navigator.clipboard.writeText(text);
                                                            alert('Mensagem didática copiada!');
                                                        }}
                                                        className="text-[10px] text-blue-400 hover:text-blue-300 underline font-mono"
                                                    >
                                                        Copiar Texto
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-amber-200/90 leading-relaxed italic">
                                                    "{(contribution.aiAnalysis as any)?.piiViolationReason || "Por motivos de privacidade e conformidade com a LGPD (Lei 13.709/2018), não é permitido incluir fotos com rostos de pessoas, placas de veículos, documentos ou telefones. Por favor, reenvie desfocando ou removendo os dados pessoais."}"
                                                </p>
                                            </div>
                                        )}

                                        {(contribution.aiAnalysis as any)?.reason && (
                                            <p className="text-slate-300 italic text-xs border-t border-slate-700/60 pt-2">
                                                Parecer IA: "{(contribution.aiAnalysis as any).reason}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Local Regex Analysis */}
                                    {(contribution as any).regexAnalysis && (
                                        <div className="mt-2 pt-2 border-t border-slate-700">
                                            <p className="text-gray-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Inteligência Local (Regex):</p>
                                            <div className="p-2 rounded bg-slate-800 space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Status Local:</span>
                                                    <span className={`font-bold ${(contribution as any).regexAnalysis.isSafe ? 'text-green-400' : 'text-red-400'}`}>
                                                        {(contribution as any).regexAnalysis.isSafe ? 'SEGURO' : 'ALERTA'}
                                                    </span>
                                                </div>
                                                {(contribution as any).regexAnalysis.matchedWords?.length > 0 && (
                                                    <p className="text-[10px] text-red-300 flex flex-wrap gap-1">
                                                        Gatilhos: {(contribution as any).regexAnalysis.matchedWords.map((w: string) => (
                                                            <span key={w} className="bg-red-950 px-1 rounded">{w}</span>
                                                        ))}
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
