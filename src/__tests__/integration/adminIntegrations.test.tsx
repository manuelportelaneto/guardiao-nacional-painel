import { describe, it, expect } from 'vitest';
import { webhookService, MUNICIPAL_ERP_PRESETS } from '../../services/webhookService';
import { iaasService } from '../../services/iaasService';

describe('Integração de Conectores Governamentais e Módulos IaaS', () => {
    it('deve validar fluxo de integração com ERPs e assinatura criptográfica', async () => {
        const preset = MUNICIPAL_ERP_PRESETS.find(p => p.id === 'preset_1doc');
        expect(preset).toBeDefined();

        const testEndpoint = {
            id: 'wh_integration_test',
            name: `${preset?.erpName} - Integração 156`,
            url: preset?.defaultUrl || 'https://api.1doc.com.br/v1/ouvidoria',
            active: true,
            events: preset?.recommendedEvents || ['contribution.approved'],
            secretKey: 'whsec_prod_super_secure_key',
            successCount: 0,
            failureCount: 0,
            createdAt: new Date().toISOString()
        };

        const delivery = await webhookService.testWebhook(testEndpoint, 'contribution.approved', 'admin_tester');
        expect(delivery.statusCode).toBe(200);
        expect(delivery.success).toBe(true);
        expect(delivery.requestPayload.headers['X-Guardiao-Signature']).toContain('sha256=');
        expect(delivery.responseBody).toContain('protocol156');
    });

    it('deve gerar relatórios IaaS e patrocínios ESG com consistência de dados', () => {
        const report = iaasService.generateRiskReport('santo-andre', 'Santo André');
        expect(report.cityName).toBe('Santo André');
        expect(report.riskIndex).toBeGreaterThan(0);

        const newSponsorship = iaasService.createSponsorship({
            companyName: 'Suzano Papel e Celulose',
            companyCnpj: '16.404.287/0001-55',
            cityId: 'rio-grande-da-serra',
            cityName: 'Rio Grande da Serra',
            targetArea: 'Manancial Billings e Área de Preservação',
            sponsorshipType: 'CIVIC_TREE_PLANTING',
            annualContributionBrl: 54000,
            impactMetrics: {
                citizensImpactedDaily: 11000,
                co2OffsetTonEstimated: 12.4
            },
            startDate: '2026-04-01',
            endDate: '2027-03-31'
        });

        expect(newSponsorship.certificateHash).toContain('ESG-RIO-GRANDE-DA-SERRA-');
        expect(newSponsorship.status).toBe('ACTIVE');
    });
});
