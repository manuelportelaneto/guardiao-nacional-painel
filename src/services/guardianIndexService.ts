/**
 * Guardian Index Service — Proprietary indices for the Guardião Nacional Intelligence Map
 * ICA™ (Cidadania Ativa), IRM™ (Responsividade Municipal), SIU™ (Infraestrutura Urbana)
 * Admin-only: these indices are restricted to the admin panel.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CityStats {
    city: string;
    state: string;
    total: number;
    approved: number;
    resolved: number;
    pending: number;
    highRisk: number;
    infrastructure: number;
    avgRisk: number;
    population?: number;
    area?: number;
}

export interface GuardianIndices {
    ica: number;    // Índice de Cidadania Ativa
    irm: number;    // Índice de Responsividade Municipal
    siu: number;    // Score de Infraestrutura Urbana
    icaLabel: string;
    irmLabel: string;
    siuLabel: string;
}

export interface OpportunityZone {
    city: string;
    state: string;
    demandScore: number;   // High = lots of problems
    supplyScore: number;   // Low = few solutions
    opportunityScore: number;
    dominantCategory: string;
    lat?: number;
    lng?: number;
}

// ─── Index Calculations ─────────────────────────────────────────────────────

/**
 * ICA™ — Índice de Cidadania Ativa
 * Formula: (approved_contributions / population) × 100,000
 * Higher = more engaged citizens
 */
export function calculateICA(approved: number, population: number): number {
    if (!population || population <= 0) return 0;
    return parseFloat(((approved / population) * 100000).toFixed(2));
}

/**
 * IRM™ — Índice de Responsividade Municipal
 * Formula: (resolved / total) × 100, with time penalty
 * Higher = more responsive government
 */
export function calculateIRM(resolved: number, total: number): number {
    if (!total || total <= 0) return 0;
    return parseFloat(((resolved / total) * 100).toFixed(1));
}

/**
 * SIU™ — Score de Infraestrutura Urbana
 * Formula: 100 - (infrastructure_issues / area_km2) × factor
 * Higher = better infrastructure
 */
export function calculateSIU(infrastructureIssues: number, areaKm2: number): number {
    if (!areaKm2 || areaKm2 <= 0) return 50; // default neutral
    const densityPer100km = (infrastructureIssues / areaKm2) * 100;
    const score = Math.max(0, Math.min(100, 100 - densityPer100km));
    return parseFloat(score.toFixed(1));
}

// ─── Label Helpers ──────────────────────────────────────────────────────────

export function getICALabel(ica: number): string {
    if (ica >= 50) return 'Excelente';
    if (ica >= 20) return 'Alto';
    if (ica >= 5) return 'Moderado';
    if (ica >= 1) return 'Baixo';
    return 'Mínimo';
}

export function getIRMLabel(irm: number): string {
    if (irm >= 80) return 'Excelente';
    if (irm >= 60) return 'Bom';
    if (irm >= 40) return 'Regular';
    if (irm >= 20) return 'Fraco';
    return 'Crítico';
}

export function getSIULabel(siu: number): string {
    if (siu >= 80) return 'Excelente';
    if (siu >= 60) return 'Boa';
    if (siu >= 40) return 'Regular';
    if (siu >= 20) return 'Precária';
    return 'Crítica';
}

// ─── Compute All Indices for a City ─────────────────────────────────────────

export function computeIndices(stats: CityStats): GuardianIndices {
    const ica = calculateICA(stats.approved, stats.population || 0);
    const irm = calculateIRM(stats.resolved, stats.total);
    const siu = calculateSIU(stats.infrastructure, stats.area || 0);

    return {
        ica,
        irm,
        siu,
        icaLabel: getICALabel(ica),
        irmLabel: getIRMLabel(irm),
        siuLabel: getSIULabel(siu),
    };
}

// ─── Aggregate Stats from Map Data ──────────────────────────────────────────

export function aggregateCityStats(data: any[]): CityStats[] {
    const cityMap = new Map<string, CityStats>();

    data.forEach(point => {
        const city = point.city || point.location?.city || 'Desconhecido';
        const state = point.state || point.location?.state || '';
        const key = `${city}-${state}`;

        if (!cityMap.has(key)) {
            cityMap.set(key, {
                city,
                state,
                total: 0,
                approved: 0,
                resolved: 0,
                pending: 0,
                highRisk: 0,
                infrastructure: 0,
                avgRisk: 0,
                population: point.cityPopulation || 0,
                area: point.cityArea || 0,
            });
        }

        const stats = cityMap.get(key)!;
        stats.total++;
        if (point.status === 'Aprovado' || point.status === 'Resolvido' || point.status === 'Concluído') stats.approved++;
        if (point.status === 'Resolvido' || point.status === 'Concluído') stats.resolved++;
        if (point.status === 'Em Análise' || point.status === 'Aprovado') stats.pending++;
        if (point.riskLevel >= 4) stats.highRisk++;
        const cat = (point.category || '').toLowerCase();
        if (cat.includes('infra') || cat.includes('saneamento') || cat.includes('ilumina')) stats.infrastructure++;
        stats.avgRisk = ((stats.avgRisk * (stats.total - 1)) + (point.riskLevel || 1)) / stats.total;
    });

    return Array.from(cityMap.values());
}

// ─── Opportunity Zones ──────────────────────────────────────────────────────

export function findOpportunityZones(cityStats: CityStats[]): OpportunityZone[] {
    return cityStats
        .filter(s => s.total >= 3) // Minimum data threshold
        .map(s => {
            const demandScore = s.pending + s.highRisk;
            const supplyScore = s.resolved;
            const opportunityScore = demandScore > 0
                ? parseFloat(((demandScore / Math.max(supplyScore, 1)) * 10).toFixed(1))
                : 0;

            return {
                city: s.city,
                state: s.state,
                demandScore,
                supplyScore,
                opportunityScore,
                dominantCategory: s.infrastructure > s.total / 2 ? 'Infraestrutura' : 'Diversificado',
            };
        })
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .slice(0, 10);
}

// ─── Anomaly Detection ──────────────────────────────────────────────────────

export interface AnomalyResult {
    city: string;
    state: string;
    count: number;
    mean: number;
    stdDev: number;
    zScore: number;
    isAnomaly: boolean;
}

export function detectAnomalies(cityStats: CityStats[], threshold: number = 2): AnomalyResult[] {
    if (cityStats.length < 3) return [];

    const counts = cityStats.map(s => s.total);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return [];

    return cityStats
        .map(s => {
            const zScore = (s.total - mean) / stdDev;
            return {
                city: s.city,
                state: s.state,
                count: s.total,
                mean: parseFloat(mean.toFixed(1)),
                stdDev: parseFloat(stdDev.toFixed(1)),
                zScore: parseFloat(zScore.toFixed(2)),
                isAnomaly: zScore >= threshold,
            };
        })
        .filter(a => a.isAnomaly)
        .sort((a, b) => b.zScore - a.zScore);
}
