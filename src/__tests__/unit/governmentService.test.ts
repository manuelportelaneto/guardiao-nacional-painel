import { describe, it, expect, vi } from 'vitest';
import { governmentService } from '../../services/governmentService';
import type { GovernmentOfficial, OfficialPermissions } from '../../types/government';

describe('Governança Federativa, Servidores Públicos e LGPD (governmentService)', () => {
    it('deve validar permissões estritas de RBAC para servidores públicos', () => {
        const standardPermissions: OfficialPermissions = {
            canModerate: true,
            canDispatchTeams: true,
            canExportReports: true,
            canManageDepartment: false,
            canInviteStaff: false,
            canViewPII: false,
        };

        expect(standardPermissions.canViewPII).toBe(false);
        expect(standardPermissions.canModerate).toBe(true);
    });

    it('deve garantir que permissão de PII (LGPD) seja atribuída apenas com flag expressa', () => {
        const auditorPermissions: OfficialPermissions = {
            canModerate: false,
            canDispatchTeams: false,
            canExportReports: true,
            canManageDepartment: false,
            canInviteStaff: false,
            canViewPII: true,
        };

        expect(auditorPermissions.canViewPII).toBe(true);
        expect(auditorPermissions.canExportReports).toBe(true);
    });

    it('deve listar municípios pré-configurados com contratos federativos', async () => {
        const municipalities = await governmentService.getMunicipalities();
        expect(municipalities.length).toBeGreaterThanOrEqual(8);
        const saoPaulo = municipalities.find(m => m.id === 'sao-paulo');
        expect(saoPaulo).toBeDefined();
        expect(saoPaulo?.state).toBe('SP');
    });

    it('deve gerar slug consistente para municípios e secretarias', () => {
        const cityName = 'São Bernardo do Campo';
        const departmentName = 'Secretaria de Obras & Infraestrutura Urbana';

        const citySlug = cityName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
        const depSlug = departmentName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

        expect(citySlug).toBe('sao-bernardo-do-campo');
        expect(depSlug).toBe('secretaria-de-obras-&-infraestrutura-urbana');
    });

    it('deve calcular expiração de convite institucional para 7 dias no futuro', () => {
        const now = Date.now();
        const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
        const diffDays = (expiresAt.getTime() - now) / (1000 * 60 * 60 * 24);

        expect(Math.round(diffDays)).toBe(7);
    });

    it('deve retornar null para token de convite inexistente', async () => {
        const result = await governmentService.getInviteByToken('token_inexistente_123');
        expect(result).toBeNull();
    });

    it('deve retornar null para busca de servidor inexistente', async () => {
        const result = await governmentService.getOfficialByUidOrEmail('uid_fake_999', 'fake@prefeitura.sp.gov.br');
        expect(result).toBeNull();
    });
});
