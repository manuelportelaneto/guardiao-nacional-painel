/**
 * @fileoverview Intelligence as a Service (IaaS) & Relatórios ESG (`iaasService.ts`).
 * 
 * Permite monetização B2B oferecendo relatórios analíticos de risco territorial
 * para seguradoras/grandes frotas e emissão de Certificados de Impacto ESG
 * para empresas patrocinadoras de praças e zeladoria urbana.
 */

export interface IaaSRiskReport {
    id: string;
    cityId: string;
    cityName: string;
    generatedAt: string;
    targetSector: 'INSURANCE' | 'LOGISTICS' | 'REAL_ESTATE';
    riskIndex: number; // 0 a 100
    floodVulnerabilityScore: number;
    potholeDamageScore: number;
    publicLightingSafetyScore: number;
    neighborhoodsAnalysis: Array<{
        neighborhood: string;
        riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
        incidentsCount: number;
        primaryRiskFactor: string;
    }>;
}

export interface EsgSponsorship {
    id: string;
    companyName: string;
    companyCnpj: string;
    cityId: string;
    cityName: string;
    targetArea: string; // Ex: "Praça dos Expedicionários", "Parque Celso Daniel"
    sponsorshipType: 'PARK_ADOPTION' | 'STORM_DRAIN_SPONSOR' | 'LIGHTING_GREEN' | 'CIVIC_TREE_PLANTING';
    annualContributionBrl: number;
    impactMetrics: {
        citizensImpactedDaily: number;
        treesMaintained?: number;
        potholesRemediated?: number;
        co2OffsetTonEstimated?: number;
    };
    certificateHash: string;
    status: 'ACTIVE' | 'PENDING' | 'RENEWED';
    startDate: string;
    endDate: string;
}

const mockEsgSponsorships: EsgSponsorship[] = [
    {
        id: 'esg_sp_101',
        companyName: 'Porto Seguro S.A.',
        companyCnpj: '61.198.164/0001-60',
        cityId: 'santo-andre',
        cityName: 'Santo André',
        targetArea: 'Praça Presidente Kennedy & Corredor Utinga',
        sponsorshipType: 'PARK_ADOPTION',
        annualContributionBrl: 48000,
        impactMetrics: {
            citizensImpactedDaily: 14500,
            treesMaintained: 120,
            co2OffsetTonEstimated: 4.2
        },
        certificateHash: 'ESG-SA-2026-99182B',
        status: 'ACTIVE',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
    },
    {
        id: 'esg_sp_102',
        companyName: 'Bradesco Seguros',
        companyCnpj: '42.592.315/0001-30',
        cityId: 'sao-bernardo',
        cityName: 'São Bernardo do Campo',
        targetArea: 'Bacia do Córrego dos Couros - Rudge Ramos',
        sponsorshipType: 'STORM_DRAIN_SPONSOR',
        annualContributionBrl: 72000,
        impactMetrics: {
            citizensImpactedDaily: 32000,
            potholesRemediated: 85,
            co2OffsetTonEstimated: 8.5
        },
        certificateHash: 'ESG-SBC-2026-14029C',
        status: 'ACTIVE',
        startDate: '2026-02-01',
        endDate: '2027-01-31'
    }
];

class IaaSService {
    /**
     * Gera relatório de riscos territoriais para Seguradoras e Logística.
     */
    public generateRiskReport(cityId: string, cityName: string): IaaSRiskReport {
        return {
            id: `iaas_rep_${cityId}_${Date.now()}`,
            cityId,
            cityName,
            generatedAt: new Date().toISOString(),
            targetSector: 'INSURANCE',
            riskIndex: 34,
            floodVulnerabilityScore: 42,
            potholeDamageScore: 28,
            publicLightingSafetyScore: 18,
            neighborhoodsAnalysis: [
                {
                    neighborhood: 'Santa Teresinha / Utinga',
                    riskLevel: 'HIGH',
                    incidentsCount: 42,
                    primaryRiskFactor: 'Alagamento por transbordamento de córrego'
                },
                {
                    neighborhood: 'Campestre',
                    riskLevel: 'MODERATE',
                    incidentsCount: 18,
                    primaryRiskFactor: 'Buracos e desníveis asfálticos'
                },
                {
                    neighborhood: 'Centro',
                    riskLevel: 'LOW',
                    incidentsCount: 9,
                    primaryRiskFactor: 'Falhas pontuais em iluminação'
                }
            ]
        };
    }

    /**
     * Retorna a lista de patrocínios cívicos ESG ativos.
     */
    public getSponsorships(): EsgSponsorship[] {
        return [...mockEsgSponsorships];
    }

    /**
     * Cria um novo patrocínio corporativo ESG com cálculo de hash.
     */
    public createSponsorship(params: Omit<EsgSponsorship, 'id' | 'certificateHash' | 'status'>): EsgSponsorship {
        const hash = `ESG-${params.cityId.toUpperCase()}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const newSponsorship: EsgSponsorship = {
            ...params,
            id: `esg_${Date.now()}`,
            certificateHash: hash,
            status: 'ACTIVE'
        };
        mockEsgSponsorships.unshift(newSponsorship);
        return newSponsorship;
    }
}

export const iaasService = new IaaSService();
