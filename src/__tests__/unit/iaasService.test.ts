import { describe, it, expect } from 'vitest';
import { iaasService } from '../../services/iaasService';

describe('Serviço de Intelligence as a Service (IaaS) e ESG (iaasService)', () => {
    describe('Geração de Relatórios de Risco Territorial para Seguradoras', () => {
        it('deve compilar índices de vulnerabilidade para a cidade solicitada', () => {
            const report = iaasService.generateRiskReport('santo-andre', 'Santo André');
            expect(report.cityId).toBe('santo-andre');
            expect(report.cityName).toBe('Santo André');
            expect(report.targetSector).toBe('INSURANCE');
            expect(report.riskIndex).toBeGreaterThanOrEqual(0);
            expect(report.floodVulnerabilityScore).toBeGreaterThanOrEqual(0);
            expect(report.potholeDamageScore).toBeGreaterThanOrEqual(0);
            expect(report.neighborhoodsAnalysis.length).toBeGreaterThan(0);
        });
    });

    describe('Patrocínio Cívico e Certificados ESG', () => {
        it('deve listar patrocínios corporativos ativos', () => {
            const sponsorships = iaasService.getSponsorships();
            expect(sponsorships.length).toBeGreaterThanOrEqual(2);
            expect(sponsorships[0].companyName).toBeDefined();
            expect(sponsorships[0].certificateHash).toContain('ESG-');
        });

        it('deve cadastrar novo patrocínio e gerar hash de auditoria auditável', () => {
            const newSponsor = iaasService.createSponsorship({
                companyName: 'Enel Distribuição',
                companyCnpj: '06.057.223/0001-71',
                cityId: 'maua',
                cityName: 'Mauá',
                targetArea: 'Corredor Verde Barão de Mauá',
                sponsorshipType: 'LIGHTING_GREEN',
                annualContributionBrl: 36000,
                impactMetrics: {
                    citizensImpactedDaily: 8900,
                    co2OffsetTonEstimated: 2.1
                },
                startDate: '2026-03-01',
                endDate: '2027-02-28'
            });

            expect(newSponsor.id).toBeDefined();
            expect(newSponsor.certificateHash).toContain('ESG-MAUA-');
            expect(newSponsor.status).toBe('ACTIVE');
        });
    });
});
