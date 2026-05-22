/**
 * @fileoverview Serviço Analítico e Computador de Estatísticas Urbanas (`src/services/statsService.ts`).
 * 
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Ele provê métodos matemáticos e algoritmos heurísticos para o painel administrativo do Guardião.
 * Ele computa variações percentuais de tendências e implementa um **Motor de Detecção de Anomalias (Anomaly Detection Engine)**.
 * Este motor varre as contribuições cívicas do banco e detecta desvios atípicos de comportamento (ex: pico súbito de bueiros 
 * entupidos após chuvas fortes ou volume anormal de problemas de alta severidade), permitindo que a prefeitura atue 
 * preventivamente em "hotspots" cívicos antes que evoluam para crises maiores.
 * 
 * 🏛️ CONCEITOS E DETECÇÕES OPERADAS:
 * 1. 📈 CÁLCULO DE VARIÂNCIA E TENDÊNCIA:
 *    Calcula a direção (subida, descida ou neutro) e a porcentagem absoluta de mudança entre dois períodos.
 * 
 * 2. ⚡ SURGE DETECTION (Picos de Volume):
 *    Se o volume de chamados de hoje for 50% maior que ontem (com base em um volume mínimo estatístico), 
 *    o motor acende um alerta de surto cívico geral.
 * 
 * 3. 🏷️ SURTOS POR CATEGORIA (Category Spikes):
 *    Monitora individualmente cada categoria (ex: Iluminação, Zeladoria, Saneamento). Se uma categoria
 *    específica dobrar de tamanho de ontem para hoje, uma anomalia de categoria é gerada com severidade média ou alta.
 * 
 * 4. ☣️ CLUSTER DE ALTO RISCO (High Risk Clusters):
 *    Identifica surtos de ocorrências de risco elevado (nível ≥ 4). Se mais de 3 chamados críticos forem 
 *    registrados em menos de 24 horas, o sistema dispara um sinalizador de alta prioridade.
 */

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
     * Calcula o percentual de variação e a direção da tendência entre dois períodos.
     * Trata divisões por zero de forma robusta e devolve indicadores formatados.
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
     * Motor Heurístico de Detecção de Anomalias.
     * Analisa as ocorrências recebidas e dispara alertas preditivos baseados nas últimas 24 horas.
     */
    detectAnomalies: (contributions: Contribution[]): Anomaly[] => {
        const anomalies: Anomaly[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Zera hora para demarcar o início do dia de hoje

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1); // Demarca o dia de ontem

        // Auxiliar seguro para extrair timestamps do Firestore ou objetos Date brutos
        const getDate = (c: Contribution) => c.createdAt instanceof Timestamp ? c.createdAt.toDate() : new Date(c.createdAt);

        const todayContribs = contributions.filter(c => getDate(c) >= today);
        const yesterdayContribs = contributions.filter(c => {
            const d = getDate(c);
            return d >= yesterday && d < today;
        });

        // 1. DETECÇÃO DE SURTO GERAL (Pico súbito de volume de chamados)
        if (todayContribs.length > yesterdayContribs.length * 1.5 && yesterdayContribs.length > 5) {
            anomalies.push({
                type: 'surge',
                description: `Aumento súbito de ${Math.round(((todayContribs.length - yesterdayContribs.length) / yesterdayContribs.length) * 100)}% no volume total de ocorrências.`,
                severity: 'high',
                metric: 'total_volume'
            });
        }

        // 2. DETECÇÃO DE SURTO POR CATEGORIA (Picos temáticos em prefeituras)
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
            // Gatilho: Mais de 5 itens hoje e variação superior a 100% (dobrou de volume)
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

        // 3. CLUSTER DE ALTO RISCO (Agrupamentos críticos de segurança/zeladoria)
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

