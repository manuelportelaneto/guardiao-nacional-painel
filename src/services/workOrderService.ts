/**
 * @fileoverview Serviço de Gestão de Ordens de Serviço (O.S.) Municipais
 * Responsável pelo ciclo de vida, cálculo de SLAs, designação de secretarias/equipes
 * e auditoria de movimentações das ocorrências urbanas.
 */

export type WorkOrderStatus = 'open' | 'in_progress' | 'inspection' | 'completed' | 'canceled';
export type WorkOrderPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface WorkOrderHistoryEntry {
    timestamp: string;
    action: string;
    performedBy: string;
    details?: string;
}

export interface WorkOrder {
    id: string;
    protocol: string;
    title: string;
    description: string;
    category: string;
    department: string;
    status: WorkOrderStatus;
    priority: WorkOrderPriority;
    cityId: string;
    cityName: string;
    neighborhood?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string;
    assignedTo?: {
        officialName?: string;
        officialRole?: string;
        teamCode?: string;
    };
    slaHoursTotal: number;
    slaDeadline: string; // ISO string
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    history: WorkOrderHistoryEntry[];
}

export interface SlaCalculationResult {
    status: 'ON_TIME' | 'WARNING' | 'OVERDUE';
    hoursRemaining: number;
    hoursTotal: number;
    percentElapsed: number;
    formattedLabel: string;
    isOverdue: boolean;
}

export const DEFAULT_SLA_HOURS_BY_CATEGORY: Record<string, number> = {
    'defesa_civil': 12,
    'segurança': 12,
    'emergência': 12,
    'sinalização': 24,
    'trânsito': 24,
    'iluminação': 48,
    'iluminação pública': 48,
    'buraco': 72,
    'asfalto': 72,
    'pavimentação': 72,
    'infraestrutura': 72,
    'vazamento de água': 24,
    'esgoto': 48,
    'zeladoria': 120,
    'limpeza urbana': 96,
    'entulho': 96,
    'poda de árvore': 120,
    'meio ambiente': 120,
    'saúde': 48,
    'outros': 120
};

export const DEPARTMENT_MAPPING: Record<string, string> = {
    'iluminação': 'Secretaria de Obras & Serviços Urbanos',
    'iluminação pública': 'Secretaria de Obras & Serviços Urbanos',
    'buraco': 'Secretaria de Mobilidade & Pavimentação',
    'asfalto': 'Secretaria de Mobilidade & Pavimentação',
    'pavimentação': 'Secretaria de Mobilidade & Pavimentação',
    'trânsito': 'Departamento de Engenharia de Tráfego',
    'sinalização': 'Departamento de Engenharia de Tráfego',
    'defesa_civil': 'Coordenadoria Municipal de Defesa Civil',
    'segurança': 'Secretaria de Segurança Cidadã & GCM',
    'zeladoria': 'Secretaria de Meio Ambiente & Zeladoria',
    'limpeza urbana': 'Secretaria de Meio Ambiente & Zeladoria',
    'entulho': 'Secretaria de Meio Ambiente & Zeladoria',
    'poda de árvore': 'Secretaria de Meio Ambiente & Zeladoria',
    'saúde': 'Secretaria Municipal de Saúde',
    'outros': 'Secretaria de Governo & Atendimento 156'
};

class WorkOrderService {
    /**
     * Retorna o SLA padrão em horas para uma categoria.
     */
    public getSlaHoursForCategory(category: string = ''): number {
        const normalized = category.toLowerCase().trim();
        for (const key of Object.keys(DEFAULT_SLA_HOURS_BY_CATEGORY)) {
            if (normalized.includes(key)) {
                return DEFAULT_SLA_HOURS_BY_CATEGORY[key];
            }
        }
        return 72; // SLA padrão: 72 horas
    }

    /**
     * Retorna o departamento responsável sugerido para uma categoria.
     */
    public getDepartmentForCategory(category: string = ''): string {
        const normalized = category.toLowerCase().trim();
        for (const key of Object.keys(DEPARTMENT_MAPPING)) {
            if (normalized.includes(key)) {
                return DEPARTMENT_MAPPING[key];
            }
        }
        return 'Secretaria de Obras & Serviços Urbanos';
    }

    /**
     * Calcula o status regressivo de SLA de uma Ordem de Serviço.
     */
    public calculateSla(createdAt: string | Date, slaHoursTotal: number, completedAt?: string): SlaCalculationResult {
        const createdDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
        const now = completedAt ? new Date(completedAt) : new Date();

        const totalMs = slaHoursTotal * 3600 * 1000;
        const deadlineMs = createdDate.getTime() + totalMs;
        const remainingMs = deadlineMs - now.getTime();
        const hoursRemaining = Math.round(remainingMs / (3600 * 1000));

        const elapsedMs = now.getTime() - createdDate.getTime();
        const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

        if (remainingMs < 0) {
            const overdueHours = Math.abs(hoursRemaining);
            return {
                status: 'OVERDUE',
                hoursRemaining,
                hoursTotal: slaHoursTotal,
                percentElapsed: 100,
                formattedLabel: `Atrasado há ${overdueHours}h`,
                isOverdue: true
            };
        }

        if (hoursRemaining <= 24) {
            return {
                status: 'WARNING',
                hoursRemaining,
                hoursTotal: slaHoursTotal,
                percentElapsed,
                formattedLabel: `Resta(m) ${hoursRemaining}h`,
                isOverdue: false
            };
        }

        return {
            status: 'ON_TIME',
            hoursRemaining,
            hoursTotal: slaHoursTotal,
            percentElapsed,
            formattedLabel: `${hoursRemaining}h restantes`,
            isOverdue: false
        };
    }

    /**
     * Gera um número de protocolo amigável a partir do ID.
     */
    public formatProtocol(id: string): string {
        const clean = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return `#OS-${clean.slice(-5) || '00001'}`;
    }
}

export const workOrderService = new WorkOrderService();
