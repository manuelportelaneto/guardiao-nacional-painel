/**
 * @fileoverview Definições de Tipos para Inteligência Preditiva, Camadas Cartográficas e Machine Learning (`intelligence.ts`).
 */

export type MapLayerMode = 'vector' | 'satellite' | 'terrain' | 'hydrography' | 'weather_radar';

export type PredictiveRiskCategory =
    | 'ALAGAMENTO_ENCHENTE'
    | 'DESLIZAMENTO_ENCOSTA'
    | 'QUEDA_ARVORES_VENTANIA'
    | 'FOCO_EPIDEMIOLOGICO_DENGUE'
    | 'CRIMINALIDADE_SEGURANCA'
    | 'INTERDICAO_TRANSITO';

export type PredictiveSeverity = 'BAIXO' | 'MODERADO' | 'ALTO' | 'CRITICO';

export type AlertApprovalStatus = 'PENDENTE_APROVACAO' | 'APROVADO_DESPACHADO' | 'REJEITADO_DESCARTADO';

export interface GeoCoordinate {
    latitude: number;
    longitude: number;
}

export interface PredictiveRiskAssessment {
    id: string;
    cityId: string;
    cityName: string;
    state: string;
    category: PredictiveRiskCategory;
    title: string;
    description: string;
    severity: PredictiveSeverity;
    riskProbability: number;          // 0 a 100%
    affectedArea: {
        center: GeoCoordinate;
        radiusMeters: number;
        neighborhoods: string[];
    };
    weatherFactors?: {
        precipitationMm: number;
        windSpeedKmH: number;
        temperatureC: number;
        weatherCondition: string;
    };
    incidentHistoryCount: number;      // Qtd de chamados históricos correlacionados na região
    suggestedAction: string;
    createdAt: string;
}

export interface PendingRiskAlert {
    id: string;
    riskAssessmentId: string;
    cityId: string;
    cityName: string;
    state: string;
    title: string;
    message: string;
    severity: PredictiveSeverity;
    targetNeighborhoods: string[];
    estimatedPopulation: number;
    approvalStatus: AlertApprovalStatus;
    notifiedSysadminEmail: string;
    approvedByUid?: string;
    approvedAt?: string;
    rejectedReason?: string;
    createdAt: string;
}

export interface AiTriageResult {
    relevanceScore: number;           // 0 a 100
    riskScore: number;                // 1 a 5
    suggestedDepartment: string;
    suggestedDepartmentCode?: string;
    isFaceOrPiiDetected: boolean;
    piiViolationReason?: string;      // Mensagem didática para o cidadão caso haja violação
    isAmbiguous: boolean;             // Encaminha para revisão humana
    aiConfidence: number;             // 0.0 a 1.0
    detectedTags: string[];
    summary: string;
    usedFallbackModel: boolean;
}

export interface LearningPattern {
    id: string;
    category: string;
    textKeywords: string[];
    riskScore: number;
    decision: 'APPROVED' | 'REJECTED' | 'FLAGGED_HUMAN';
    decisionSource: 'AI_MODEL' | 'HUMAN_MODERATOR';
    confidence: number;
    frequency: number;
    updatedAt: string;
}
