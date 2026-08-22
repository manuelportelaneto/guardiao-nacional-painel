import { describe, it, expect } from 'vitest';
import { workOrderService } from '../../services/workOrderService';

describe('Serviço de Gestão de Ordens de Serviço (workOrderService)', () => {
    describe('Cálculo de SLA por Categoria', () => {
        it('deve atribuir SLA correto para demandas de emergência e Defesa Civil (12h)', () => {
            const sla = workOrderService.getSlaHoursForCategory('defesa_civil');
            expect(sla).toBe(12);

            const slaEmergencia = workOrderService.getSlaHoursForCategory('emergência no trânsito');
            expect(slaEmergencia).toBe(12);
        });

        it('deve atribuir SLA de 48h para Iluminação Pública', () => {
            const sla = workOrderService.getSlaHoursForCategory('iluminação');
            expect(sla).toBe(48);
        });

        it('deve atribuir SLA de 72h para Buracos e Pavimentação', () => {
            const sla = workOrderService.getSlaHoursForCategory('buraco na pista');
            expect(sla).toBe(72);
        });

        it('deve atribuir SLA de 120h para Zeladoria e Meio Ambiente', () => {
            const sla = workOrderService.getSlaHoursForCategory('poda de árvore');
            expect(sla).toBe(120);
        });
    });

    describe('Mapeamento de Departamentos Responsáveis', () => {
        it('deve direcionar iluminação para Secretaria de Obras', () => {
            const dept = workOrderService.getDepartmentForCategory('iluminação');
            expect(dept).toContain('Secretaria de Obras');
        });

        it('deve direcionar trânsito para Engenharia de Tráfego', () => {
            const dept = workOrderService.getDepartmentForCategory('sinalização');
            expect(dept).toContain('Departamento de Engenharia de Tráfego');
        });

        it('deve direcionar Defesa Civil para Coordenadoria Municipal de Defesa Civil', () => {
            const dept = workOrderService.getDepartmentForCategory('defesa_civil');
            expect(dept).toContain('Defesa Civil');
        });
    });

    describe('Status Regressivo de SLA', () => {
        it('deve calcular status ON_TIME para demandas recém-criadas', () => {
            const now = new Date();
            const slaResult = workOrderService.calculateSla(now, 48);

            expect(slaResult.status).toBe('ON_TIME');
            expect(slaResult.isOverdue).toBe(false);
            expect(slaResult.hoursRemaining).toBeGreaterThanOrEqual(47);
        });

        it('deve calcular status WARNING para demandas com menos de 24h restantes', () => {
            const twentyHoursAgo = new Date(Date.now() - 30 * 3600 * 1000); // 30h atrás de um SLA de 48h (restam 18h)
            const slaResult = workOrderService.calculateSla(twentyHoursAgo, 48);

            expect(slaResult.status).toBe('WARNING');
            expect(slaResult.isOverdue).toBe(false);
            expect(slaResult.hoursRemaining).toBeLessThanOrEqual(24);
        });

        it('deve calcular status OVERDUE para demandas com prazo estourado', () => {
            const fourDaysAgo = new Date(Date.now() - 96 * 3600 * 1000); // 96h atrás de um SLA de 48h (estourado em 48h)
            const slaResult = workOrderService.calculateSla(fourDaysAgo, 48);

            expect(slaResult.status).toBe('OVERDUE');
            expect(slaResult.isOverdue).toBe(true);
            expect(slaResult.formattedLabel).toContain('Atrasado');
        });
    });

    describe('Formatação de Protocolo', () => {
        it('deve gerar protocolo formal amigável no formato #OS-XXXXX', () => {
            const protocol = workOrderService.formatProtocol('abc-12345');
            expect(protocol).toBe('#OS-12345');
        });
    });
});
