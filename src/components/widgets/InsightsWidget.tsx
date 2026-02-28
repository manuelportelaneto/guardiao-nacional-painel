
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { TrendingUp, TriangleAlert, Lightbulb, ArrowRight, CircleCheck } from 'lucide-react';
import { statsService } from '../../services/statsService';
import type { Contribution } from '../../types/contribution';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface InsightsWidgetProps {
    contributions: Contribution[];
    className?: string;
}

const InsightsWidget: React.FC<InsightsWidgetProps> = ({ contributions, className }) => {

    // Memoize calculations to avoid re-running on every render
    const anomalies = useMemo(() => {
        if (!contributions.length) return [];
        return statsService.detectAnomalies(contributions);
    }, [contributions]);

    // Simple Sentiment Analysis (Mock for now, based on positive/negative ratio)
    const sentiment = useMemo(() => {
        if (!contributions.length) return 'neutral';
        const positive = contributions.filter(c => c.status === 'Resolvido' || c.status === 'Aprovado' || (c.likes || 0) > 5).length;
        const negative = contributions.filter(c => c.status === 'Rejeitado' || c.riskLevel && c.riskLevel >= 4).length;

        if (positive > negative * 1.5) return 'positive';
        if (negative > positive * 1.2) return 'negative';
        return 'neutral';
    }, [contributions]);

    return (
        <Card className={`col-span-1 md:col-span-2 lg:col-span-1 overflow-hidden flex flex-col ${className}`}>
            <CardHeader className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-indigo-100 dark:border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                        <Lightbulb className="w-5 h-5 text-indigo-500" /> Insights & Alertas
                    </CardTitle>
                    {sentiment === 'positive' && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Tendência Positiva</Badge>}
                    {sentiment === 'negative' && <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200">Atenção Necessária</Badge>}
                </div>
                <CardDescription>
                    Monitoramento automático de padrões e anomalias.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                <ScrollArea className="h-[250px]">
                    <div className="p-4 space-y-3">
                        {anomalies.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <CircleCheck className="w-8 h-8 mx-auto text-green-500 mb-2 opacity-50" />
                                <p>Nenhuma anomalia detectada hoje.</p>
                                <p className="text-xs">O sistema está operando dentro dos padrões normais.</p>
                            </div>
                        ) : (
                            anomalies.map((anomaly, idx) => (
                                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${anomaly.severity === 'high' ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/50' :
                                    'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/50'
                                    }`}>
                                    <div className="mt-0.5">
                                        {anomaly.severity === 'high' ? (
                                            <TriangleAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        ) : (
                                            <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`text-sm font-semibold mb-0.5 ${anomaly.severity === 'high' ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200'
                                            }`}>
                                            {anomaly.category ? `Surto em ${anomaly.category}` : 'Alerta de Padrão'}
                                        </h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                            {anomaly.description}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Smart Suggestion - Mock for Phase 2 */}
                        <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-900/50">
                            <div className="flex items-center gap-2 mb-1">
                                <TriangleAlert className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Sugestão de Ação</span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                                {anomalies.length > 2
                                    ? "Alto volume de alertas. Recomendado notificar equipes de prontidão."
                                    : "Engajamento estável. Bom momento para revisar relatórios pendentes."}
                            </p>
                            <button className="text-[10px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
                                Ver ações recomendadas <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};



export default InsightsWidget;
