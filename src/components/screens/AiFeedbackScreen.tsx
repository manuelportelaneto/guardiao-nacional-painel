import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Brain, ThumbsUp, ThumbsDown, Loader2, CircleCheckBig, CircleX } from 'lucide-react';

interface ContributionWithAI {
    id: string;
    title: string;
    description?: string;
    status: string;
    aiAnalysis: {
        autoAction: 'APPROVE' | 'REJECT' | 'REVIEW';
        riskLevel: number;
        relevanceScore: number;
        detectedCategory: string;
        reason: string;
    };
    feedback?: 'correct' | 'wrong';
}

const AiFeedbackScreen: React.FC = () => {
    const { currentUser } = useAuth();
    const [contributions, setContributions] = useState<ContributionWithAI[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);

    useEffect(() => {
        fetchContributions();
    }, []);

    const fetchContributions = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'contributions'),
                where('aiProcessedAt', '!=', null),
                orderBy('aiProcessedAt', 'desc'),
                limit(50)
            );
            const snap = await getDocs(q);

            // Check existing feedback in parallel
            const feedbackSnap = await getDocs(collection(db, 'ai_feedback'));
            const feedbackMap: Record<string, string> = {};
            feedbackSnap.forEach(d => { feedbackMap[d.id] = d.data().verdict; });

            const data = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as any as ContributionWithAI))
                .filter(c => c.aiAnalysis && !Array.isArray(c.aiAnalysis));

            // Annotate with existing feedback
            data.forEach(item => { if (feedbackMap[item.id]) item.feedback = feedbackMap[item.id] as any; });

            setContributions(data);
        } catch (err) {
            toast.error('Erro ao carregar contribuições para auditoria.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const submitFeedback = async (contributionId: string, verdict: 'correct' | 'wrong') => {
        if (!currentUser) return;
        setSubmitting(contributionId);
        try {
            const contribution = contributions.find(c => c.id === contributionId);
            await setDoc(doc(db, 'ai_feedback', contributionId), {
                contributionId,
                verdict,
                geminiDecision: contribution?.aiAnalysis?.autoAction,
                humanStatus: contribution?.status,
                moderatorId: currentUser.uid,
                timestamp: serverTimestamp()
            });

            // Optimistic update
            setContributions(prev =>
                prev.map(c => c.id === contributionId ? { ...c, feedback: verdict } : c)
            );
            toast.success(verdict === 'correct' ? '✓ IA acertou registrado!' : '✗ Erro da IA registrado!');
        } catch (err) {
            toast.error('Erro ao enviar feedback.');
        } finally {
            setSubmitting(null);
        }
    };

    const actionColor = (action: string) => {
        if (action === 'APPROVE') return 'text-green-600 bg-green-50';
        if (action === 'REJECT') return 'text-red-600 bg-red-50';
        return 'text-yellow-600 bg-yellow-50';
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Brain className="w-8 h-8 text-emerald-600" />
                    Auditoria de IA
                </h1>
                <p className="text-muted-foreground mt-1">
                    Avalie se o Gemini tomou a decisão correta em cada contribuição. Seus feedbacks constroem o dataset de otimização dos prompts.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
            ) : contributions.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                    Nenhuma contribuição com análise de IA encontrada.
                </div>
            ) : (
                <div className="space-y-3">
                    {contributions.map(item => (
                        <Card key={item.id} className={`border transition-all ${item.feedback === 'correct' ? 'border-green-200 bg-green-50/30' : item.feedback === 'wrong' ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{item.title}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5 font-mono">ID: {item.id.substring(0, 12)}...</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                                        <Badge variant="outline" className={`text-xs font-bold ${actionColor(item.aiAnalysis.autoAction)}`}>
                                            IA: {item.aiAnalysis.autoAction}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div className="text-xs text-gray-600 space-y-1">
                                        <p><span className="font-medium text-gray-500">Categoria Detectada:</span> {item.aiAnalysis.detectedCategory}</p>
                                        <p><span className="font-medium text-gray-500">Risco:</span> Nível {item.aiAnalysis.riskLevel} · <span className="font-medium text-gray-500">Relevância:</span> {((item.aiAnalysis.relevanceScore || 0) * 100).toFixed(0)}%</p>
                                        <p className="italic text-gray-400">"{item.aiAnalysis.reason}"</p>
                                    </div>

                                    {item.feedback ? (
                                        <div className={`flex items-center gap-2 text-sm font-medium flex-shrink-0 ${item.feedback === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.feedback === 'correct'
                                                ? <><CircleCheckBig className="w-4 h-4" /> Marcado como Correto</>
                                                : <><CircleX className="w-4 h-4" /> Marcado como Errado</>
                                            }
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 border-green-200 hover:bg-green-50 gap-1"
                                                disabled={submitting === item.id}
                                                onClick={() => submitFeedback(item.id, 'correct')}
                                            >
                                                {submitting === item.id
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <ThumbsUp className="w-3 h-3" />
                                                }
                                                IA Acertou
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                                                disabled={submitting === item.id}
                                                onClick={() => submitFeedback(item.id, 'wrong')}
                                            >
                                                <ThumbsDown className="w-3 h-3" />
                                                IA Errou
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AiFeedbackScreen;
