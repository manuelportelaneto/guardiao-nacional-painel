/**
 * Guardian Index Service — Proprietary indices for the Guardião Nacional Intelligence Map
 * ICA™ (Cidadania Ativa), IRM™ (Responsividade Municipal), SIU™ (Infraestrutura Urbana)
 * IRSP (Risco de Segurança Pública), IRDN (Risco de Desastres Naturais)
 * Admin-only: these indices are restricted to the admin panel.
 */

// ─── Category Translation (EN → PT-BR) ─────────────────────────────────────

export const CATEGORY_TRANSLATIONS: Record<string, string> = {
    'infrastructure': 'Infraestrutura',
    'security': 'Segurança',
    'transport': 'Transporte',
    'environment': 'Meio Ambiente',
    'services': 'Serviços Públicos',
    'leisure': 'Lazer',
    'health': 'Saúde',
    'accessibility': 'Acessibilidade',
    'culture': 'Cultura',
    'social': 'Solidariedade',
    // Fallbacks for already-translated
    'Infraestrutura': 'Infraestrutura',
    'Segurança': 'Segurança',
    'Transporte': 'Transporte',
    'Meio Ambiente': 'Meio Ambiente',
    'Serviços Públicos': 'Serviços Públicos',
    'Lazer': 'Lazer',
    'Saúde': 'Saúde',
    'Acessibilidade': 'Acessibilidade',
    'Cultura': 'Cultura',
    'Solidariedade': 'Solidariedade',
    'Iluminação': 'Iluminação',
    'Saneamento': 'Saneamento',
    'Educação': 'Educação',
    'Trânsito': 'Trânsito',
};

export function translateCategory(category: string): string {
    return CATEGORY_TRANSLATIONS[category] || category;
}

// ─── All Categories with Colors ─────────────────────────────────────────────

export const ALL_CATEGORIES: { id: string; name: string; color: string }[] = [
    { id: 'infrastructure', name: 'Infraestrutura', color: '#f97316' },
    { id: 'security', name: 'Segurança', color: '#ef4444' },
    { id: 'transport', name: 'Transporte', color: '#3b82f6' },
    { id: 'environment', name: 'Meio Ambiente', color: '#22c55e' },
    { id: 'services', name: 'Serviços Públicos', color: '#34d399' },
    { id: 'leisure', name: 'Lazer', color: '#ec4899' },
    { id: 'health', name: 'Saúde', color: '#10b981' },
    { id: 'accessibility', name: 'Acessibilidade', color: '#0ea5e9' },
    { id: 'culture', name: 'Cultura', color: '#10b981' },
    { id: 'social', name: 'Solidariedade', color: '#f43f5e' },
];

export function getCategoryColor(category: string): string {
    const translated = translateCategory(category);
    const found = ALL_CATEGORIES.find(c => c.name === translated || c.id === category);
    return found?.color || '#6b7280';
}

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
    security: number;
    environment: number;
    health: number;
    avgRisk: number;
    population?: number;
    area?: number;
    lat?: number;
    lng?: number;
}

export interface GuardianIndices {
    ica: number;
    irm: number;
    siu: number;
    irsp: number;   // Índice de Risco de Segurança Pública
    irdn: number;   // Índice de Risco de Desastres Naturais
    icaLabel: string;
    irmLabel: string;
    siuLabel: string;
    irspLabel: string;
    irdnLabel: string;
}

export interface OpportunityZone {
    city: string;
    state: string;
    demandScore: number;
    supplyScore: number;
    opportunityScore: number;
    dominantCategory: string;
}

// ─── Contribution Value Scoring ─────────────────────────────────────────────

export interface ContributionValue {
    relevancia: number;       // 0-100 relevance score
    impactoCidadao: string;   // Human-readable impact description
    fatorRisco: string;       // Risk factor description
    valorLabel: string;       // Level label
}

/**
 * Calculate contribution value based on risk, supports, category, and age.
 * Higher = more relevant for citizens and governance.
 */
export function calculateContributionValue(point: any): ContributionValue {
    let score = 0;

    // 1. Risk level (0-30 points)
    const risk = point.riskLevel || 1;
    score += Math.min(30, risk * 6);

    // 2. Community support (0-25 points)
    const supports = point.supportCount || 0;
    score += Math.min(25, supports * 2.5);

    // 3. Category weight (0-20 points)
    const cat = (point.category || '').toLowerCase();
    const categoryWeights: Record<string, number> = {
        'security': 20, 'health': 18, 'infrastructure': 16,
        'environment': 15, 'transport': 14, 'accessibility': 13,
        'services': 12, 'social': 10, 'culture': 8, 'leisure': 6,
    };
    score += categoryWeights[cat] || 10;

    // 4. Pending status penalty/bonus (0-15 points)
    if (point.status === 'Em Análise') score += 15;
    else if (point.status === 'Aprovado') score += 10;
    else if (point.status === 'Resolvido') score += 3;

    // 5. Recency (0-10 points)
    const now = Date.now();
    const created = point.createdAt?.toDate ? point.createdAt.toDate().getTime() : Date.now();
    const daysOld = (now - created) / (1000 * 60 * 60 * 24);
    score += daysOld <= 7 ? 10 : daysOld <= 30 ? 7 : daysOld <= 90 ? 4 : 1;

    const finalScore = Math.min(100, Math.round(score));

    // Impact descriptions
    const impactMap: Record<string, string> = {
        'security': 'Afeta diretamente a segurança dos cidadãos',
        'health': 'Impacto na saúde pública da comunidade',
        'infrastructure': 'Compromete a infraestrutura urbana',
        'environment': 'Risco ambiental para a região',
        'transport': 'Afeta a mobilidade urbana',
        'accessibility': 'Barreira de acessibilidade para pessoas com deficiência',
        'services': 'Impacta serviços públicos essenciais',
        'social': 'Relevância social para a comunidade',
        'culture': 'Impacto no patrimônio cultural',
        'leisure': 'Afeta áreas de lazer da comunidade',
    };

    const riskFactors: Record<string, string> = {
        'security': '🔴 Risco à vida e integridade física',
        'health': '🟠 Risco sanitário',
        'infrastructure': '🟡 Risco estrutural',
        'environment': '🟢 Risco ambiental',
        'transport': '🔵 Risco viário',
    };

    return {
        relevancia: finalScore,
        impactoCidadao: impactMap[cat] || 'Impacto social relevante',
        fatorRisco: riskFactors[cat] || '⚪ Risco moderado',
        valorLabel: finalScore >= 80 ? 'Crítico' : finalScore >= 60 ? 'Alto' : finalScore >= 40 ? 'Moderado' : finalScore >= 20 ? 'Baixo' : 'Mínimo',
    };
}

// ─── Index Calculations ─────────────────────────────────────────────────────

export function calculateICA(approved: number, population: number): number {
    if (!population || population <= 0) return 0;
    return parseFloat(((approved / population) * 100000).toFixed(2));
}

export function calculateIRM(resolved: number, total: number): number {
    if (!total || total <= 0) return 0;
    return parseFloat(((resolved / total) * 100).toFixed(1));
}

export function calculateSIU(infrastructureIssues: number, areaKm2: number): number {
    if (!areaKm2 || areaKm2 <= 0) return 50;
    const densityPer100km = (infrastructureIssues / areaKm2) * 100;
    return parseFloat(Math.max(0, Math.min(100, 100 - densityPer100km)).toFixed(1));
}

/**
 * IRSP — Índice de Risco de Segurança Pública
 * Higher = more dangerous
 */
export function calculateIRSP(securityIssues: number, total: number, highRisk: number): number {
    if (!total || total <= 0) return 0;
    const securityRatio = (securityIssues / total) * 100;
    const riskBonus = (highRisk / Math.max(total, 1)) * 50;
    return parseFloat(Math.min(100, securityRatio + riskBonus).toFixed(1));
}

/**
 * IRDN — Índice de Risco de Desastres Naturais
 * Based on environment + infrastructure issues density
 */
export function calculateIRDN(envIssues: number, infraIssues: number, total: number): number {
    if (!total || total <= 0) return 0;
    const envRatio = (envIssues / total) * 60;
    const infraRatio = (infraIssues / total) * 40;
    return parseFloat(Math.min(100, envRatio + infraRatio).toFixed(1));
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

export function getIRSPLabel(irsp: number): string {
    if (irsp >= 70) return 'Crítico';
    if (irsp >= 50) return 'Alto';
    if (irsp >= 30) return 'Moderado';
    if (irsp >= 10) return 'Baixo';
    return 'Seguro';
}

export function getIRDNLabel(irdn: number): string {
    if (irdn >= 60) return 'Crítico';
    if (irdn >= 40) return 'Alto';
    if (irdn >= 20) return 'Moderado';
    if (irdn >= 5) return 'Baixo';
    return 'Estável';
}

// ─── Compute All Indices ────────────────────────────────────────────────────

export function computeIndices(stats: CityStats): GuardianIndices {
    const ica = calculateICA(stats.approved, stats.population || 0);
    const irm = calculateIRM(stats.resolved, stats.total);
    const siu = calculateSIU(stats.infrastructure, stats.area || 0);
    const irsp = calculateIRSP(stats.security, stats.total, stats.highRisk);
    const irdn = calculateIRDN(stats.environment, stats.infrastructure, stats.total);

    return {
        ica, irm, siu, irsp, irdn,
        icaLabel: getICALabel(ica),
        irmLabel: getIRMLabel(irm),
        siuLabel: getSIULabel(siu),
        irspLabel: getIRSPLabel(irsp),
        irdnLabel: getIRDNLabel(irdn),
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
                city, state, total: 0, approved: 0, resolved: 0, pending: 0,
                highRisk: 0, infrastructure: 0, security: 0, environment: 0, health: 0,
                avgRisk: 0, population: point.cityPopulation || 0, area: point.cityArea || 0,
                lat: point.location?.latitude || point.latitude,
                lng: point.location?.longitude || point.longitude,
            });
        }

        const stats = cityMap.get(key)!;
        stats.total++;
        if (point.status === 'Aprovado' || point.status === 'Resolvido' || point.status === 'Concluído') stats.approved++;
        if (point.status === 'Resolvido' || point.status === 'Concluído') stats.resolved++;
        if (point.status === 'Em Análise' || point.status === 'Aprovado') stats.pending++;
        if (point.riskLevel >= 4) stats.highRisk++;

        const cat = (point.category || '').toLowerCase();
        if (cat.includes('infra') || cat === 'infrastructure') stats.infrastructure++;
        if (cat.includes('segur') || cat === 'security') stats.security++;
        if (cat.includes('ambiente') || cat === 'environment') stats.environment++;
        if (cat.includes('saúde') || cat === 'health') stats.health++;

        stats.avgRisk = ((stats.avgRisk * (stats.total - 1)) + (point.riskLevel || 1)) / stats.total;

        // Update lat/lng to latest (centroid approximation)
        if (point.location?.latitude || point.latitude) {
            stats.lat = point.location?.latitude || point.latitude;
            stats.lng = point.location?.longitude || point.longitude;
        }
    });

    return Array.from(cityMap.values());
}

// ─── Opportunity Zones ──────────────────────────────────────────────────────

export function findOpportunityZones(cityStats: CityStats[]): OpportunityZone[] {
    return cityStats
        .filter(s => s.total >= 3)
        .map(s => {
            const demandScore = s.pending + s.highRisk;
            const supplyScore = s.resolved;
            const opportunityScore = demandScore > 0
                ? parseFloat(((demandScore / Math.max(supplyScore, 1)) * 10).toFixed(1))
                : 0;
            const dominant = s.infrastructure >= s.security && s.infrastructure >= s.environment ? 'Infraestrutura'
                : s.security >= s.environment ? 'Segurança' : 'Meio Ambiente';
            return { city: s.city, state: s.state, demandScore, supplyScore, opportunityScore, dominantCategory: dominant };
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
        .map(s => ({
            city: s.city, state: s.state, count: s.total,
            mean: parseFloat(mean.toFixed(1)), stdDev: parseFloat(stdDev.toFixed(1)),
            zScore: parseFloat(((s.total - mean) / stdDev).toFixed(2)),
            isAnomaly: ((s.total - mean) / stdDev) >= threshold,
        }))
        .filter(a => a.isAnomaly)
        .sort((a, b) => b.zScore - a.zScore);
}
