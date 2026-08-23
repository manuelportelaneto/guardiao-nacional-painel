import { describe, it, expect } from 'vitest';
import { lgpdAuditService } from '../../services/lgpdAuditService';

describe('Integração de Proteção de Dados e Trilha de Auditoria LGPD', () => {
    it('deve realizar ciclo de mascaramento, registro com justificativa e relatório do DPO', async () => {
        // 1. Mascaramento inicial
        const rawCpf = '389.201.849-01';
        const rawPhone = '11976543210';
        const rawEmail = 'mariasilva@gmail.com';

        const maskedCpf = lgpdAuditService.maskCpf(rawCpf);
        const maskedPhone = lgpdAuditService.maskPhone(rawPhone);
        const maskedEmail = lgpdAuditService.maskEmail(rawEmail);

        expect(maskedCpf).toBe('389.***.***-01');
        expect(maskedPhone).toBe('(11) 9****-3210');
        expect(maskedEmail).toBe('ma***@gmail.com');

        // 2. Registro de desmascaramento auditado
        const auditLog = await lgpdAuditService.logPiiAccess({
            userEmail: 'fiscal.meioambiente@santoandre.sp.gov.br',
            userName: 'Fiscal João Santos',
            userRole: 'Fiscal Ambiental',
            targetResource: 'Demanda de Descarte Irregular',
            targetResourceId: '#OS-77192',
            accessedFields: ['cpf', 'phone', 'address'],
            legalBasis: 'Art. 7º, III (Execução de políticas públicas)',
            justification: 'Notificação do proprietário do imóvel para remoção de entulho'
        });

        expect(auditLog.id).toBeDefined();
        expect(auditLog.userEmail).toBe('fiscal.meioambiente@santoandre.sp.gov.br');
        expect(auditLog.accessedFields).toHaveLength(3);

        // 3. Verificação no relatório do DPO
        const dpoSummary = lgpdAuditService.getDpoSummary();
        expect(dpoSummary.totalAccesses).toBeGreaterThanOrEqual(1);
        expect(dpoSummary.complianceScore).toBe(100);
        expect(dpoSummary.legalBasisDistribution['Art. 7º, III (Execução de políticas públicas)']).toBeGreaterThanOrEqual(1);
    });
});
