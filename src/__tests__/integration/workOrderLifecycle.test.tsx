import { describe, it, expect, vi } from 'vitest';
import { workOrderService, type WorkOrderStatus } from '../../services/workOrderService';

describe('Integração do Ciclo de Vida de Ordens de Serviço (O.S.)', () => {
    it('deve processar o ciclo completo de uma Ordem de Serviço da abertura à conclusão', () => {
        const creationTime = new Date('2026-08-20T10:00:00Z');
        const slaHours = workOrderService.getSlaHoursForCategory('buraco na pista');
        expect(slaHours).toBe(72);

        const protocol = workOrderService.formatProtocol('contrib_89412');
        expect(protocol).toBe('#OS-89412');

        const department = workOrderService.getDepartmentForCategory('buraco na pista');
        expect(department).toContain('Pavimentação');

        // 1. Etapa: Aberta
        let currentStatus: WorkOrderStatus = 'open';
        let slaCheck = workOrderService.calculateSla(creationTime, slaHours, '2026-08-20T12:00:00Z');
        expect(slaCheck.status).toBe('ON_TIME');
        expect(slaCheck.isOverdue).toBe(false);

        // 2. Etapa: Despachada para Campo
        currentStatus = 'in_progress';
        slaCheck = workOrderService.calculateSla(creationTime, slaHours, '2026-08-22T14:00:00Z'); // 52h passadas de 72h (restam 20h <= 24h)
        expect(slaCheck.status).toBe('WARNING');

        // 3. Etapa: Vistoria & Validação
        currentStatus = 'inspection';
        expect(currentStatus).toBe('inspection');

        // 4. Etapa: Concluída dentro do prazo
        currentStatus = 'completed';
        const completionTime = '2026-08-22T18:00:00Z'; // 56h após abertura (SLA 72h)
        slaCheck = workOrderService.calculateSla(creationTime, slaHours, completionTime);
        expect(slaCheck.isOverdue).toBe(false);
        expect(slaCheck.percentElapsed).toBeLessThanOrEqual(100);
    });

    it('deve identificar violação de SLA caso a demanda ultrapasse a janela permitida', () => {
        const creationTime = new Date('2026-08-10T10:00:00Z');
        const slaHours = 24; // 24h para sinalização
        const checkTime = '2026-08-12T10:00:00Z'; // 48h depois

        const slaResult = workOrderService.calculateSla(creationTime, slaHours, checkTime);
        expect(slaResult.status).toBe('OVERDUE');
        expect(slaResult.isOverdue).toBe(true);
        expect(slaResult.formattedLabel).toContain('Atrasado');
    });
});
