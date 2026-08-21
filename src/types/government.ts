/**
 * @fileoverview Definições de Tipos para Governança Pública, Servidores Governamentais e Secretarias (`government.ts`).
 * 
 * Garante separação rigorosa de dados entre Cidadãos (`users`) e Servidores Públicos (`government_officials`),
 * em total conformidade com a LGPD e governança multi-tenant federativa.
 */

export type OfficialRole =
    | 'prefeito'
    | 'vice_prefeito'
    | 'secretario'
    | 'diretor'
    | 'auditor'
    | 'operador_triagem'
    | 'agente_campo'
    | 'super_admin';

export type OfficialStatus = 'ATIVO' | 'PENDENTE_CONVITE' | 'SUSPENSO' | 'DESLIGADO';

export type ContractType = 'CONVENIADA' | 'PILOTO' | 'MONITORAMENTO_CIVICO' | 'CANCELADA';

export interface OfficialPermissions {
    canModerate: boolean;            // Pode aprovar/rejeitar ocorrências da sua secretaria
    canDispatchTeams: boolean;       // Pode despachar ordens de serviço para equipes de campo
    canExportReports: boolean;       // Pode gerar e baixar dossiês e relatórios em PDF/XLSX
    canManageDepartment: boolean;    // Pode criar/editar secretarias e regras
    canInviteStaff: boolean;         // Pode convidar novos servidores para a secretaria
    canViewPII: boolean;             // Permissão expressa para visualizar CPF/Telefone de cidadãos (LGPD)
}

export interface GovernmentDepartment {
    id: string;
    cityId: string;
    state: string;
    name: string;
    slug: string;
    code?: string;                   // Ex: "SMOSP" - Secretaria Municipal de Obras e Serviços Públicos
    responsibleName?: string;
    responsibleEmail?: string;
    responsiblePhone?: string;
    categoriesManaged: string[];     // IDs das categorias geridas (ex: ['buraco_rua', 'iluminacao'])
    defaultSlaHours: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GovernmentMunicipality {
    id: string;                      // Slug normalizado (ex: 'sao-paulo', 'maua', 'santo-andre')
    name: string;
    state: string;
    population?: number;
    coatOfArmsUrl?: string;          // Brasão oficial do município
    contractType: ContractType;
    contractStartDate?: string;
    departmentsCount: number;
    activeOfficialsCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface GovernmentOfficial {
    id: string;                      // UID do Firebase Auth ou ID do documento
    uid?: string;                    // UID após ativação da conta
    registrationNumber?: string;     // Matrícula funcional do servidor
    name: string;
    email: string;
    phone?: string;
    role: OfficialRole;
    officialTitle: string;           // Título legível (ex: "Secretário de Obras")
    state: string;                   // UF (ex: "SP")
    cityId: string;                  // ID do município
    cityName: string;
    departmentId?: string;           // ID da secretaria vinculada
    departmentName?: string;
    permissions: OfficialPermissions;
    status: OfficialStatus;
    invitedByUid: string;
    invitedAt: string;
    activatedAt?: string;
    lastLoginAt?: string;
}

export interface GovernmentInvite {
    id: string;                      // Token seguro de convite (UUID)
    email: string;
    name: string;
    role: OfficialRole;
    officialTitle: string;
    registrationNumber?: string;
    state: string;
    cityId: string;
    cityName: string;
    departmentId?: string;
    departmentName?: string;
    permissions: OfficialPermissions;
    createdByUid: string;
    expiresAt: string;               // Timestamp ISO (padrão: 7 dias)
    used: boolean;
    usedAt?: string;
    createdAt: string;
}
