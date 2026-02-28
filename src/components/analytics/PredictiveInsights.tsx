import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TriangleAlert, TrendingUp, Zap, MapPin } from 'lucide-react';
import type { ReportData } from '../../services/reportService';
import { startOfWeek, endOfWeek, isWithinInterval, subWeeks } from 'date-fns';

interface PredictiveInsightsProps {
    contributions: ReportData[];
}

const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({ contributions }) => {

    const insights = useMemo(() => {
        if (!contributions.length) return null;

        const now = new Date();
        const currentWeekStart = startOfWeek(now);
        const lastWeekStart = startOfWeek(subWeeks(now, 1));
        const lastWeekEnd = endOfWeek(subWeeks(now, 1));

        // 1. Weekly Trend Analysis
        const thisWeekCount = contributions.filter(c => {
            const val = c.createdAt as unknown;
            const d = (val as { toDate: () => Date }).toDate ? (val as { toDate: () => Date }).toDate() : new Date(val as string);
            return d >= currentWeekStart;
        }).length;

        const lastWeekCount = contributions.filter(c => {
            const val = c.createdAt as unknown;
            const d = (val as { toDate: () => Date }).toDate ? (val as { toDate: () => Date }).toDate() : new Date(val as string);
            return isWithinInterval(d, { start: lastWeekStart, end: lastWeekEnd });
        }).length;

        let trendPercentage = 0;
        if (lastWeekCount > 0) {
            trendPercentage = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
        }

        // 2. Critical Categories
        const categoryCounts: Record<string, number> = {};
        contributions.forEach(c => {
            const cat = c.category || 'Outros';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const topCategories = Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2);

        // 3. Hotspots (Simplified by Neighborhood/Address grouping)
        // Ideally this needs geospatial clustering, but string matching works for MVP
        const locationCounts: Record<string, number> = {};
        contributions.forEach(c => {
            // Extract neighborhood from address if possible, or use raw address
            // "Rua X, Bairro Y, Cidade" -> flexible regex or split
            if (c.address) {
                // Simple clustering by first 15 chars of address to group nearby issues
                const key = c.address.substring(0, 15);
                locationCounts[key] = (locationCounts[key] || 0) + 1;
            }
        });
        const hotspot = Object.entries(locationCounts)
            .sort(([, a], [, b]) => b - a)[0];


        return {
            trend: trendPercentage,
            increasing: trendPercentage > 0,
            topCategories,
            hotspot
        };
    }, [contributions]);

    if (!insights) return null;

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
            {/* 1. Demand Velocity */}
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-indigo-900">Velocidade da Demanda</CardTitle>
                    <TrendingUp className={`h-4 w-4 ${insights.increasing ? 'text-red-500' : 'text-green-500'}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-indigo-900">
                        {insights.trend > 0 ? '+' : ''}{insights.trend}%
                    </div>
                    <p className="text-xs text-indigo-600/80">
                        em relação à semana anterior
                    </p>
                    {insights.increasing && (
                        <div className="mt-3 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded inline-flex items-center">
                            <Zap className="w-3 h-3 mr-1" />
                            Atenção: Aceleração detectada
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. Critical Focus */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-orange-900">Foco Crítico</CardTitle>
                    <TriangleAlert className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {insights.topCategories.map(([cat, count], i) => (
                            <div key={cat} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-gray-700 capitalize">
                                    {i + 1}. {cat}
                                </span>
                                <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {count}x
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-orange-600/80 mt-2">
                        Categorias com maior volume acumulado
                    </p>
                </CardContent>
            </Card>

            {/* 3. Hotspot Alert */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-900">Hotspot Identificado</CardTitle>
                    <MapPin className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    {insights.hotspot ? (
                        <>
                            <div className="text-lg font-bold text-red-900 truncate" title={insights.hotspot[0]}>
                                {insights.hotspot[0]}...
                            </div>
                            <p className="text-xs text-red-600/80 mb-2">
                                Local com maior concentração de problemas
                            </p>
                            <div className="mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded inline-flex items-center font-bold">
                                {insights.hotspot[1]} ocorrências nesta região
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 py-2">
                            Sem dados suficientes para identificar hotspots.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default PredictiveInsights;
