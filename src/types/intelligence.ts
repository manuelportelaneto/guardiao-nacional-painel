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

export interface AiStructuredTags {
    urgency: 'imediata' | 'alta' | 'media' | 'baixa';
    civicImpact: 'risco_de_vida' | 'saude_publica' | 'mobilidade_urbana' | 'seguranca_patrimonial' | 'zeladoria_estetica';
    suggestedDepartment: 'obras_pavimentacao' | 'saude_vigilancia' | 'mobilidade_transito' | 'defesa_civil' | 'meio_ambiente' | 'ouvidoria_geral';
    publicationRisk: 'nenhum' | 'temperatura_alta' | 'propaganda_politica' | 'anuncio_spam' | 'pii_lgpd_face' | 'difamacao';
    nature: 'cidadao_comum' | 'teste_homologacao';
}

export interface AiTriageResult {
    relevanceScore: number;           // 0 a 100 (Impacto na vida da população)
    riskScore: number;                // 1 a 5 (Risco de publicação pública)
    suggestedDepartment: string;
    suggestedDepartmentCode?: string;
    isFaceOrPiiDetected: boolean;
    piiViolationReason?: string;      // Mensagem didática para o cidadão caso haja violação
    isAmbiguous: boolean;             // Encaminha para revisão humana
    isTestContribution?: boolean;     // Identifica contas de teste (Google Reviewers / QA)
    aiConfidence: number;             // 0.0 a 1.0
    detectedTags: string[];           // Lista consolidada de tags
    structuredTags?: AiStructuredTags;// Tags estruturadas padronizadas
    freeformTags?: string[];          // Tags livres contextuais
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
