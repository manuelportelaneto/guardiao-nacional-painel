/**
 * @fileoverview Tipos para o Sistema de Governança Federativa, Jurisdições, No-Code e SRE do SysAdmin.
 */

export type JurisdictionLevel = 'NATIONAL' | 'STATE' | 'MUNICIPAL' | 'DEPARTMENT';

export interface JurisdictionScope {
    level: JurisdictionLevel;
    state?: string;          // Sigla UF (ex: 'SP', 'RJ')
    cityId?: string;         // ID normalizado da cidade (ex: 'maua', 'sao-paulo')
    cityName?: string;       // Nome legível da cidade
    departmentId?: string;   // ID da secretaria (ex: 'obras', 'saude')
    departmentName?: string; // Nome da secretaria
    isEmulated?: boolean;    // Flag indicando se o SysAdmin está emulando a visão de um cliente
}

// ─── No-Code CMS & Configurações Vivas ───────────────────────────────────────

export interface CustomFormField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean' | 'date' | 'photo';
    required: boolean;
    options?: string[]; // Para campos tipo 'select'
    placeholder?: string;
}

export interface DynamicCategory {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string; // Nome do ícone Lucide
    color: string; // Hex ou Tailwind color
    slaHours: number; // SLA padrão para resolução em horas
    priority: 'low' | 'medium' | 'high' | 'urgent';
    active: boolean;
    customFields?: CustomFormField[];
    applicableJurisdictions?: string[]; // IDs de cidades ou estados que usam esta categoria (vazio = todas)
    createdAt: string;
    updatedAt: string;
}

export interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description: string;
    enabled: boolean;
    targetPlatforms: ('ios' | 'android' | 'web')[];
    minAppVersion?: string; // ex: '1.2.0'
    targetStates?: string[]; // UFs específicas
    targetCities?: string[]; // Cidades específicas
    rolloutPercentage: number; // 0 a 100%
    createdAt: string;
    updatedAt: string;
}

export interface DynamicBanner {
    id: string;
    title: string;
    message: string;
    imageUrl?: string;
    priority: 'info' | 'warning' | 'emergency';
    active: boolean;
    targetLevel: JurisdictionLevel;
    targetStates?: string[];
    targetCities?: string[];
    startDate?: string;
    endDate?: string;
    deepLink?: string; // Rota interna do app (ex: 'guarda://contribute/dengue')
    actionButtonText?: string;
    actionButtonUrl?: string;
    createdAt: string;
}

export interface AIOrchestratorConfig {
    provider: 'gemini' | 'claude' | 'openai' | 'deepseek';
    modelName: string;
    temperature: number;
    moderationSensitivity: number; // 1 a 5 (limiar de auto-aprovação)
    autoApproveThreshold: number;
    systemPrompt: string;
    bannedWordsRegex: string;
    enableSmartCategorization: boolean;
    enableUrgencyEstimation: boolean;
    updatedAt: string;
}

// ─── Observabilidade (SRE) & Health Check ────────────────────────────────────

export interface ServiceHealthStatus {
    service: string;
    name: string;
    status: 'healthy' | 'degraded' | 'down' | 'checking';
    latencyMs: number;
    lastCheck: string;
    message?: string;
    details?: Record<string, any>;
}

export interface SREMetrics {
    services: ServiceHealthStatus[];
    errorRate24h: number;
    totalAuditsToday: number;
    activeUsersNow: number;
    unresolvedCrashes: number;
    storageUsageGB: number;
    storageQuotaGB: number;
}

// ─── Webhooks & Conexões ───────────────────────────────────────────────────

export interface WebhookEndpoint {
    id: string;
    name: string;
    url: string;
    description?: string;
    active: boolean;
    events: string[]; // ex: ['contribution.created', 'contribution.status_changed', 'emergency.alert']
    secretKey?: string; // Para assinatura HMAC SHA-256
    customHeaders?: Record<string, string>;
    targetJurisdiction?: {
        state?: string;
        cityId?: string;
    };
    lastTriggered?: string;
    successCount: number;
    failureCount: number;
    createdAt: string;
}

export interface WebhookDeliveryLog {
    id: string;
    webhookId: string;
    event: string;
    timestamp: string;
    statusCode: number;
    latencyMs: number;
    payloadPreview: string;
    responsePreview?: string;
    success: boolean;
    error?: string;
}

// ─── Motor de Relatórios ───────────────────────────────────────────────────

export interface ReportSchedule {
    id: string;
    title: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    targetEmails: string[];
    jurisdiction: JurisdictionScope;
    format: 'pdf' | 'xlsx' | 'both';
    includeAISummary: boolean;
    active: boolean;
    lastSent?: string;
    nextRun?: string;
}
