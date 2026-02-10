
import { Timestamp } from 'firebase/firestore';
import type { Contribution } from '../types/contribution';

export interface StatTrend {
    value: number;
    percentageChange: number;
    direction: 'up' | 'down' | 'neutral';
}

export interface Anomaly {
    type: 'surge' | 'drop' | 'new_category';
    description: string;
    severity: 'low' | 'medium' | 'high';
    category?: string;
    metric: string;
}

export const statsService = {
    /**
     * Calculates the percentage change between two values.
     */
    calculateTrend: (current: number, previous: number): StatTrend => {
        if (previous === 0) {
            return {
                value: current,
                percentageChange: current > 0 ? 100 : 0,
                direction: current > 0 ? 'up' : 'neutral'
            };
        }
        const change = ((current - previous) / previous) * 100;
        return {
            value: current,
            percentageChange: Math.abs(change),
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
        };
    },

    /**
     * Detects anomalies in the provided contributions based on simple heuristics.
     * e.g., > 20% increase in a category today compared to average.
     */
    detectAnomalies: (contributions: Contribution[]): Anomaly[] => {
        const anomalies: Anomaly[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Helper to safe-get dates
        const getDate = (c: Contribution) => c.createdAt instanceof Timestamp ? c.createdAt.toDate() : new Date(c.createdAt);

        const todayContribs = contributions.filter(c => getDate(c) >= today);
        const yesterdayContribs = contributions.filter(c => {
            const d = getDate(c);
            return d >= yesterday && d < today;
        });

        // 1. Check for overall surge
        if (todayContribs.length > yesterdayContribs.length * 1.5 && yesterdayContribs.length > 5) {
            anomalies.push({
                type: 'surge',
                description: `Aumento súbito de ${Math.round(((todayContribs.length - yesterdayContribs.length) / yesterdayContribs.length) * 100)}% no volume total de ocorrências.`,
                severity: 'high',
                metric: 'total_volume'
            });
        }

        // 2. Check for Category Surges
        const catMapToday: Record<string, number> = {};
        todayContribs.forEach(c => {
            const cat = c.category || 'Outros';
            catMapToday[cat] = (catMapToday[cat] || 0) + 1;
        });

        const catMapYesterday: Record<string, number> = {};
        yesterdayContribs.forEach(c => {
            const cat = c.category || 'Outros';
            catMapYesterday[cat] = (catMapYesterday[cat] || 0) + 1;
        });

        Object.entries(catMapToday).forEach(([cat, count]) => {
            const prev = catMapYesterday[cat] || 0;
            // Threshold: > 5 items and > 100% increase (doubled)
            if (count > 5 && count >= prev * 2) {
                anomalies.push({
                    type: 'surge',
                    description: `Pico de ocorrências em "${cat}" (${count} hoje vs ${prev} ontem).`,
                    severity: count > 20 ? 'high' : 'medium',
                    category: cat,
                    metric: 'category_volume'
                });
            }
        });

        // 3. Check for High Risk Cluster (Simple check)
        const highRiskToday = todayContribs.filter(c => (c.riskLevel || 0) >= 4).length;
        if (highRiskToday > 3) {
            anomalies.push({
                type: 'surge',
                description: `${highRiskToday} ocorrências de Alto Risco registradas hoje.`,
                severity: 'high',
                metric: 'risk_volume'
            });
        }

        return anomalies;
    }
};
