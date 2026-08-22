import { describe, it, expect } from 'vitest';
import { webhookService, MUNICIPAL_ERP_PRESETS } from '../../services/webhookService';

describe('Serviço de Webhooks e Conectores 156 (webhookService)', () => {
    describe('Assinatura Criptográfica HMAC SHA-256', () => {
        it('deve gerar assinatura válida prefixada com sha256=', () => {
            const signature = webhookService.calculateHmacSignature('{"event":"ping"}', 'minha_chave_secreta_123');
            expect(signature).toBeDefined();
            expect(signature.startsWith('sha256=')).toBe(true);
            expect(signature.length).toBeGreaterThan(15);
        });

        it('deve gerar assinaturas distintas para payloads diferentes', () => {
            const sig1 = webhookService.calculateHmacSignature('{"event":"order.created"}', 'secret_key');
            const sig2 = webhookService.calculateHmacSignature('{"event":"order.updated"}', 'secret_key');
            expect(sig1).not.toBe(sig2);
        });
    });

    describe('Presets de ERPs Governamentais', () => {
        it('deve disponibilizar os principais ERPs municipais', () => {
            expect(MUNICIPAL_ERP_PRESETS.length).toBeGreaterThanOrEqual(4);
            const ids = MUNICIPAL_ERP_PRESETS.map(p => p.id);
            expect(ids).toContain('preset_1doc');
            expect(ids).toContain('preset_betha');
            expect(ids).toContain('preset_ipm');
            expect(ids).toContain('preset_govbr');
        });

        it('deve conter URLs HTTPS e eventos recomendados em todos os presets', () => {
            MUNICIPAL_ERP_PRESETS.forEach(preset => {
                expect(preset.defaultUrl.startsWith('https://')).toBe(true);
                expect(preset.recommendedEvents.length).toBeGreaterThan(0);
                expect(preset.samplePayloadStructure).toContain('{{');
            });
        });
    });

    describe('Disparo em Modo Sandbox / Simulado', () => {
        it('deve simular entrega de webhook gerando protocolo 156 e latência', async () => {
            const mockWebhook = {
                id: 'wh_test_1',
                name: '1Doc Prefeitura Sandbox',
                url: 'https://api.1doc.com.br/v1/ouvidoria/chamados/ingest',
                active: true,
                events: ['contribution.approved'],
                secretKey: 'whsec_test_secret_123',
                successCount: 10,
                failureCount: 0,
                createdAt: new Date().toISOString()
            };

            const result = await webhookService.testWebhook(mockWebhook, 'contribution.approved', 'user_admin_1');

            expect(result.statusCode).toBe(200);
            expect(result.success).toBe(true);
            expect(result.latencyMs).toBeGreaterThan(0);
            expect(result.responseBody).toContain('protocol156');
            expect(result.requestPayload.headers['X-Guardiao-Signature']).toBeDefined();
        });
    });
});
