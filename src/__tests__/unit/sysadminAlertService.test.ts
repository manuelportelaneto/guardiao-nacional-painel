import { describe, it, expect, vi } from 'vitest';
import { sysadminAlertService } from '../../services/sysadminAlertService';
import { userRiskTrackingService } from '../../services/userRiskTrackingService';
import { aiOrchestratorService } from '../../services/aiOrchestratorService';

describe('Serviço de Alertas SysAdmin e Pontuação Oculta de Risco', () => {
    describe('sysadminAlertService', () => {
        it('deve registrar alerta de relato de teste (Google Reviewers/QA) com sucesso', async () => {
            const result = await sysadminAlertService.createAlert({
                contributionId: 'test-contrib-01',
                title: 'Teste de Homologação Play Store',
                description: 'Verificando fluxo de envio para aprovação pelo Google.',
                alertType: 'TEST_CONTRIBUTION',
                riskScore: 1,
                relevanceScore: 10,
                authorId: 'google-tester-123',
                authorName: 'Google QA Reviewer',
                city: 'Mountain View',
                state: 'CA',
                reasons: ['Palavras-chave de teste de homologação detectadas'],
                tags: ['natureza:teste_homologacao', 'teste_google_revisor'],
                sysadminEmail: 'admin@guardiao.com.br'
            });

            expect(result.success).toBe(true);
            expect(result.alertId).toBeDefined();
        });

        it('deve registrar alerta de relato de alto risco para intervenção imediata', async () => {
            const result = await sysadminAlertService.createAlert({
                contributionId: 'high-risk-01',
                title: 'Ofensa grave e difamação',
                description: 'Texto agressivo violando termos de uso e incitando discórdia.',
                alertType: 'HIGH_RISK_PUBLICATION',
                riskScore: 5,
                relevanceScore: 40,
                authorId: 'user-bad-faith-99',
                authorName: 'Usuário Infrator',
                city: 'São Paulo',
                state: 'SP',
                reasons: ['Temperatura verbal agressiva e ofensiva', 'Linguagem imprópria'],
                tags: ['risco:temperatura_alta', 'risco_critico'],
                sysadminEmail: 'admin@guardiao.com.br'
            });

            expect(result.success).toBe(true);
            expect(result.alertId).toBeDefined();
        });

        it('deve resolver o alerta mantendo a publicação ativa (KEPT_PUBLISHED)', async () => {
            const resolveResult = await sysadminAlertService.resolveAlert({
                alertId: 'alert-mock-1',
                contributionId: 'test-contrib-01',
                decision: 'KEPT_PUBLISHED',
                sysadminUid: 'admin-uid-1',
                notes: 'Validado pelo SysAdmin como inofensivo.'
            });

            expect(resolveResult.success).toBe(true);
        });

        it('deve resolver o alerta removendo a publicação do feed público (REMOVED_FROM_FEED)', async () => {
            const resolveResult = await sysadminAlertService.resolveAlert({
                alertId: 'alert-mock-2',
                contributionId: 'high-risk-01',
                decision: 'REMOVED_FROM_FEED',
                sysadminUid: 'admin-uid-1',
                notes: 'Conteúdo tóxico removido por moderação administrativa.'
            });

            expect(resolveResult.success).toBe(true);
        });
    });

    describe('userRiskTrackingService (Pontuação Oculta de Risco)', () => {
        it('deve registrar strike de risco silencioso para um usuário identificado', async () => {
            const result = await userRiskTrackingService.recordRiskStrike({
                userId: 'user-suspicious-42',
                contributionId: 'contrib-bad-100',
                contributionTitle: 'Publicação fraudulenta detectada',
                riskScore: 4,
                reasons: ['Divulgação não autorizada de link comercial', 'Propaganda política']
            });

            expect(result.success).toBe(true);
        });

        it('deve ignorar registro de strike caso o usuário seja anônimo ou inválido', async () => {
            const anonResult = await userRiskTrackingService.recordRiskStrike({
                userId: 'anonimo',
                contributionId: 'contrib-anon-1',
                contributionTitle: 'Texto sem autor',
                riskScore: 4,
                reasons: ['Risco detectado em post anônimo']
            });

            expect(anonResult.success).toBe(false);

            const emptyResult = await userRiskTrackingService.recordRiskStrike({
                userId: '',
                contributionId: 'contrib-anon-2',
                contributionTitle: 'Texto sem ID',
                riskScore: 5,
                reasons: ['Risco']
            });

            expect(emptyResult.success).toBe(false);
        });
    });

    describe('Integração Automática no aiOrchestratorService', () => {
        it('deve acionar criação de alerta SysAdmin ao analisar relato de teste', async () => {
            const alertSpy = vi.spyOn(sysadminAlertService, 'createAlert');

            const result = await aiOrchestratorService.analyzeContribution({
                contributionId: 'contrib-auto-test-1',
                userId: 'tester-google-45',
                authorName: 'Google Tester',
                title: 'Teste de QA Google Play Store',
                description: 'Verificando envio para homologação do app.',
                category: 'outros'
            });

            expect(result.isTestContribution).toBe(true);
            expect(result.riskScore).toBe(1);
            expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({
                alertType: 'TEST_CONTRIBUTION',
                contributionId: 'contrib-auto-test-1'
            }));

            alertSpy.mockRestore();
        });

        it('deve acionar alerta SysAdmin e strike oculto de risco ao detectar relato com risco >= 4', async () => {
            const alertSpy = vi.spyOn(sysadminAlertService, 'createAlert');
            const strikeSpy = vi.spyOn(userRiskTrackingService, 'recordRiskStrike');

            const result = await aiOrchestratorService.analyzeContribution({
                contributionId: 'contrib-auto-toxic-1',
                userId: 'user-malicious-77',
                authorName: 'Infrator Reincidente',
                title: 'Prefeito safado e corrupto',
                description: 'Bando de incompetente e vagabundos que não arrumam a rua!',
                category: 'reclamacao'
            });

            expect(result.riskScore).toBeGreaterThanOrEqual(4);
            expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({
                alertType: 'HIGH_RISK_PUBLICATION',
                contributionId: 'contrib-auto-toxic-1'
            }));
            expect(strikeSpy).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-malicious-77',
                contributionId: 'contrib-auto-toxic-1'
            }));

            alertSpy.mockRestore();
            strikeSpy.mockRestore();
        });
    });
});
