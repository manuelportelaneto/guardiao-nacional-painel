import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
    Newspaper,
    Sparkles,
    Calendar,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Loader2,
    RefreshCw,
    TrendingUp,
    ListChecks
} from 'lucide-react';
import { weeklyAiDigestService, type WeeklyDigestItem } from '../../../services/weeklyAiDigestService';
import { toast } from 'sonner';

interface WeeklyDigestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WeeklyDigestModal: React.FC<WeeklyDigestModalProps> = ({ isOpen, onClose }) => {
    const [digests, setDigests] = useState<WeeklyDigestItem[]>([]);
    const [selectedDigest, setSelectedDigest] = useState<WeeklyDigestItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadDigests();
        }
    }, [isOpen]);

    const loadDigests = async () => {
        setLoading(true);
        try {
            const past = await weeklyAiDigestService.getPastDigests();
            setDigests(past);
            if (past.length > 0) {
                setSelectedDigest(past[0]);
            } else {
                setSelectedDigest(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateNow = async () => {
        setGenerating(true);
        try {
            toast.info('IA analisando relatos e compilando o Noticiário Semanal...');
            const newDigest = await weeklyAiDigestService.generateWeeklyDigest(7);
            setDigests(prev => [newDigest, ...prev]);
            setSelectedDigest(newDigest);
            toast.success('Boletim Semanal gerado com sucesso!');
        } catch (err) {
            console.error(err);
            toast.error('Não foi possível gerar o boletim agora. Tente novamente.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-slate-50 border border-slate-200">
                <DialogHeader className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <Newspaper className="w-6 h-6 text-indigo-600" />
                            Noticiário Semanal Cívico (IA)
                        </DialogTitle>
                        <p className="text-xs text-slate-500 mt-1">
                            Síntese jornalística e comentários automatizados de cada ocorrência via Google Gemini Flash.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            size="sm"
                            onClick={handleGenerateNow}
                            disabled={generating}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-3.5 rounded-xl font-semibold gap-2 shadow-xs"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Processando IA...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Gerar Novo Boletim</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                        <span className="text-xs">Carregando edições do noticiário...</span>
                    </div>
                ) : digests.length === 0 && !selectedDigest ? (
                    <div className="text-center py-16 space-y-4 bg-white rounded-2xl border border-slate-200 p-8">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                            <Newspaper className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Nenhum boletim semanal arquivado ainda</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                                Clique no botão acima para acionar o agente de IA e gerar a primeira edição com base nos relatos da semana.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 pt-2">
                        {/* Seletor de Edições Anteriores */}
                        {digests.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                                    Edições:
                                </span>
                                {digests.map((d, i) => (
                                    <Badge
                                        key={d.id || i}
                                        variant={selectedDigest?.id === d.id ? 'default' : 'outline'}
                                        onClick={() => setSelectedDigest(d)}
                                        className={`cursor-pointer text-xs px-3 py-1 shrink-0 transition-all ${
                                            selectedDigest?.id === d.id
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-600 bg-white hover:bg-slate-100'
                                        }`}
                                    >
                                        Semana {d.periodStart} – {d.periodEnd}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {selectedDigest && (
                            <div className="space-y-5">
                                {/* Manchete e Header do Boletim */}
                                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-5 rounded-2xl shadow-sm border border-indigo-800/40">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[10px]">
                                            Edição Semanal
                                        </Badge>
                                        <span className="text-xs text-slate-300 font-mono flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {selectedDigest.periodStart} até {selectedDigest.periodEnd}
                                        </span>
                                        <span className="text-xs text-indigo-300 ml-auto font-semibold">
                                            {selectedDigest.totalAnalyzed} ocorrências catalogadas
                                        </span>
                                    </div>
                                    <h2 className="text-lg md:text-xl font-black text-white leading-snug">
                                        {selectedDigest.headline}
                                    </h2>
                                </div>

                                {/* Editorial Resumido */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                                        Síntese Executiva da Semana
                                    </h3>
                                    <p className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                        {selectedDigest.editorialSummary}
                                    </p>
                                </div>

                                {/* Temas e Bairros Críticos */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Temas Principais */}
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            Principais Demandas da Comunidade
                                        </h4>
                                        <div className="space-y-2">
                                            {selectedDigest.keyThemes.map((theme, idx) => (
                                                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-2">
                                                    <div>
                                                        <span className="font-bold text-xs text-slate-900 block">{theme.theme}</span>
                                                        <span className="text-[11px] text-slate-500 block mt-0.5">{theme.commentary}</span>
                                                    </div>
                                                    <Badge className={
                                                        theme.sentiment === 'critical'
                                                            ? 'bg-rose-100 text-rose-800 border-rose-200 text-[10px]'
                                                            : 'bg-blue-100 text-blue-800 border-blue-200 text-[10px]'
                                                    }>
                                                        {theme.count} relatos
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bairros em Destaque */}
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                                            Bairros com Maior Volume
                                        </h4>
                                        <div className="space-y-2">
                                            {selectedDigest.topNeighborhoods.map((neigh, idx) => (
                                                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                                                    <div>
                                                        <span className="font-bold text-xs text-slate-900">{neigh.neighborhood}</span>
                                                        <span className="text-[11px] text-slate-400 block mt-0.5">Foco: {neigh.mainIssue}</span>
                                                    </div>
                                                    <Badge variant="outline" className="font-mono text-xs text-slate-700 bg-white">
                                                        {neigh.count}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Resumos Individuais com Comentários de IA */}
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                        Comentários Analíticos da IA em Relatos da Semana
                                    </h4>
                                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                                        {selectedDigest.highlightedContributions.map((c, idx) => (
                                            <div key={idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/60 transition-colors space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-bold text-xs text-slate-900 line-clamp-1">{c.title}</span>
                                                    <Badge variant="outline" className="text-[10px] text-slate-500 bg-white shrink-0">
                                                        {c.category} · {c.neighborhood}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-indigo-950/80 italic bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/60">
                                                    💡 <strong>Análise do Agente IA:</strong> {c.aiComment}
                                                </p>
                                                <div className="text-[10px] text-slate-400">
                                                    Relatado por: {c.authorName}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recomendações aos Órgãos Municipais */}
                                <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                                        <ListChecks className="w-4 h-4 text-emerald-600" />
                                        Plano de Ação Recomendado às Secretarias
                                    </h4>
                                    <ul className="space-y-1.5 text-xs text-emerald-950">
                                        {selectedDigest.actionRecommendations.map((rec, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                <span>{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
