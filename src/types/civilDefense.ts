/**
 * @fileoverview Tipos para Alertas Oficiais da Defesa Civil, INMET, Pontos de Risco e Tráfego (`civilDefense.ts`).
 */

export type CivilDefenseSeverity = 'AVISO' | 'PERIGO_POTENCIAL' | 'PERIGO' | 'GRANDE_PERIGO';

export type CivilDefenseAlertCategory = 
    | 'CHUVA_INTENSA'
    | 'TEMPESTADE'
    | 'ALAGAMENTO_INUNDACAO'
    | 'DESLIZAMENTO_ENCOSTA'
    | 'VENDAVAL_CICLONE'
    | 'GRANIZO'
    | 'ONDA_DE_CALOR'
    | 'ONDA_DE_FRIO'
    | 'RESSACA_MARITIMA';

export interface OfficialCivilDefenseAlert {
    id: string;
    source: 'INMET' | 'DEFESA_CIVIL_NACIONAL' | 'DEFESA_CIVIL_SP' | 'CEMADEN';
    title: string;
    description: string;
    instructions: string[];
    severity: CivilDefenseSeverity;
    category: CivilDefenseAlertCategory;
    startDate: string;
    endDate: string;
    affectedStates: string[];
    affectedCities: string[]; // Lista de nomes de cidades ou IDs
    polygonCoords?: [number, number][]; // Coordenadas geográficas da área de abrangência
    riskLevel: 1 | 2 | 3 | 4 | 5;
    icon: string;
}

export type FloodPointStatus = 'NORMAL' | 'ATENCAO' | 'ALERTA' | 'EMERGENCIA' | 'INTRANSITAVEL';

export interface CriticalFloodPoint {
    id: string;
    name: string;
    cityId: string;
    cityName: string;
    state: string;
    latitude: number;
    longitude: number;
    neighborhood: string;
    referenceStreet: string;
    historicFloodCount: number;
    criticalWaterLevelCm: number;
    currentStatus: FloodPointStatus;
    riverOrBasin: string; // Ex: 'Rio Tamanduateí', 'Ribeirão dos Meninos', 'Córrego dos Couros'
    riskLevel: 1 | 2 | 3 | 4 | 5;
    lastUpdated?: string;
}

export interface GeologicalRiskArea {
    id: string;
    name: string;
    cityId: string;
    cityName: string;
    state: string;
    latitude: number;
    longitude: number;
    neighborhood: string;
    slopeType: 'ENCOSTA_HABITADA' | 'TALUDE_RODOVIARIO' | 'MARGEM_CORREGO';
    vulnerabilityLevel: 'BAIXA' | 'MEDIA' | 'ALTA' | 'MUITO_ALTA';
    soilSaturationPercent: number;
    threatDescription: string;
    monitoredBy: string; // Ex: 'Defesa Civil Municipal'
}

export interface TrafficIncident {
    id: string;
    title: string;
    description: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
    severity: 'LEVE' | 'MODERADO' | 'GRAVE' | 'BLOQUEIO_TOTAL';
    type: 'ACIDENTE' | 'ALAGAMENTO_VIA' | 'OBRAS' | 'MANIFESTACAO' | 'CONGESTIONAMENTO_SEVERO';
    delayMinutes: number;
    reportedAt: string;
}

export interface RiskLayerToggles {
    officialAlerts: boolean;
    criticalFloods: boolean;
    geologicalSlopes: boolean;
    liveTraffic: boolean;
}

export type CrisisReadinessLevel = 'VIGILANCIA' | 'ATENCAO' | 'ALERTA' | 'EMERGENCIA_CALAMIDADE';

export type FieldTeamType = 'DEFESA_CIVIL' | 'GCM' | 'TRANSITO' | 'OBRAS_DESOBSTRUCAO' | 'SAMU_RESGATE';
export type FieldTeamStatus = 'DISPONIVEL' | 'DESLOCANDO' | 'EM_ATENDIMENTO' | 'RETORNANDO';

export interface FieldTeam {
    id: string;
    name: string;
    code: string;
    cityId: string;
    cityName: string;
    type: FieldTeamType;
    status: FieldTeamStatus;
    leaderName: string;
    operatorCount: number;
    assignedLocation?: string;
    assignedIncidentId?: string;
    equipment: string[];
    lastStatusUpdate: string;
    latitude?: number;
    longitude?: number;
}
