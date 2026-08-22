import { describe, it, expect } from 'vitest';
import { lgpdAuditService, LGPD_LEGAL_BASES } from '../../services/lgpdAuditService';

describe('Serviço de Auditoria LGPD e Proteção de Dados (lgpdAuditService)', () => {
    describe('Algoritmos de Mascaramento de PII', () => {
        it('deve mascarar CPF mantendo apenas os 3 primeiros e 2 últimos dígitos', () => {
            const masked = lgpdAuditService.maskCpf('123.456.789-00');
            expect(masked).toBe('123.***.***-00');
        });

        it('deve mascarar CPF com dígitos limpos', () => {
            const masked = lgpdAuditService.maskCpf('98765432199');
            expect(masked).toBe('987.***.***-99');
        });

        it('deve mascarar emails preservando provedor e primeiras 2 letras', () => {
            const masked = lgpdAuditService.maskEmail('joaosilva@prefeitura.gov.br');
            expect(masked).toBe('jo***@prefeitura.gov.br');
        });

        it('deve mascarar telefones mantendo DDD e últimos 4 dígitos', () => {
            const masked = lgpdAuditService.maskPhone('11987654321');
            expect(masked).toBe('(11) 9****-4321');
        });

        it('deve mascarar nomes completos preservando primeiro nome e inicial seguinte', () => {
            const masked = lgpdAuditService.maskName('Carlos Alberto da Silva');
            expect(masked).toBe('Carlos A. ***');
        });

        it('deve mascarar números prediais e residenciais em endereços', () => {
            const masked = lgpdAuditService.maskAddress('Rua das Flores, 123, Centro');
            expect(masked).toBe('Rua das Flores, ***, Centro');
        });
    });

    describe('Bases Legais da LGPD (Art. 7º)', () => {
        it('deve fornecer bases legais municipais adequadas', () => {
            expect(LGPD_LEGAL_BASES.length).toBeGreaterThanOrEqual(4);
            const codes = LGPD_LEGAL_BASES.map(b => b.code);
            expect(codes).toContain('Art. 7º, III');
            expect(codes).toContain('Art. 7º, X');
            expect(codes).toContain('Art. 7º, II');
        });
    });

    describe('Registro e Estatísticas de Auditoria', () => {
        it('deve registrar um acesso com metadados forenses imutáveis', async () => {
            const log = await lgpdAuditService.logPiiAccess({
                userEmail: 'fiscal.obras@santoandre.sp.gov.br',
                userName: 'Fiscal Teste',
                userRole: 'Fiscal de Obras',
                targetResource: 'Demanda de Asfalto',
                targetResourceId: '#OS-88221',
                accessedFields: ['cpf', 'phone'],
                legalBasis: 'Art. 7º, III',
                justification: 'Confirmação de vistoria no local solicitado'
            });

            expect(log.id).toBeDefined();
            expect(log.accessedFields).toContain('cpf');
            expect(log.accessedFields).toContain('phone');
            expect(log.justification).toBe('Confirmação de vistoria no local solicitado');
        });

        it('deve calcular resumo de conformidade para o DPO', () => {
            const summary = lgpdAuditService.getDpoSummary();
            expect(summary.totalAccesses).toBeGreaterThanOrEqual(1);
            expect(summary.complianceScore).toBe(100);
            expect(summary.legalBasisDistribution).toBeDefined();
        });
    });
});
