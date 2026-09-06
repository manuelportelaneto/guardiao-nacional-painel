import { describe, it, expect } from 'vitest';
import { analyticsIntelligenceService } from '../../services/analyticsIntelligenceService';
import type { Contribution } from '../../types/contribution';

describe('Serviço de Inteligência Analítica e Cruzamento de Dados (analyticsIntelligenceService)', () => {
    it('deve retornar estrutura vazia limpa quando não houver contribuições', () => {
        const result = analyticsIntelligenceService.computeAnalytics([], []);
        expect(result.totalRecords).toBe(0);
        expect(result.resolutionRate).toBe(0);
        expect(result.avgResolutionTimeHours).toBe(0);
        expect(result.neighborhoodCross).toHaveLength(0);
        expect(result.departmentEfficiency).toHaveLength(0);
        expect(result.citizenRanking).toHaveLength(0);
    });

    it('deve cruzar dados reais de bairros, categorias, horários e predições com precisão', () => {
        const mockContributions: Contribution[] = [
            {
                id: 'c1',
                title: 'Buraco Crítico',
                category: 'Buraco na pista',
                city: 'Santo André',
                state: 'SP',
                status: 'Resolvido',
                userId: 'user_1',
                userName: 'Carlos Silva',
                likes: 12,
                endorsementCount: 5,
                createdAt: new Date('2026-08-20T08:30:00Z') as any,
                updatedAt: new Date('2026-08-21T14:30:00Z') as any,
                neighborhood: 'Utinga'
            } as any,
            {
                id: 'c2',
                title: 'Lâmpada Apagada',
                category: 'Iluminação pública',
                city: 'Santo André',
                state: 'SP',
                status: 'Aprovado',
                userId: 'user_1',
                userName: 'Carlos Silva',
                likes: 4,
                endorsementCount: 2,
                createdAt: new Date('2026-08-20T19:00:00Z') as any,
                neighborhood: 'Utinga'
            } as any,
            {
                id: 'c3',
                title: 'Foco de Dengue',
                category: 'Foco de dengue',
                city: 'Santo André',
                state: 'SP',
                status: 'Resolvido',
                userId: 'user_2',
                userName: 'Ana Paula',
                likes: 20,
                endorsementCount: 10,
                createdAt: new Date('2026-08-21T14:15:00Z') as any,
                updatedAt: new Date('2026-08-22T10:15:00Z') as any,
                neighborhood: 'Centro'
            } as any
        ];

        const result = analyticsIntelligenceService.computeAnalytics(mockContributions, []);

        expect(result.totalRecords).toBe(3);
        expect(result.resolutionRate).toBe(67); // 2 de 3 resolvidas (66.66% -> 67%)
        expect(result.avgResolutionTimeHours).toBeGreaterThan(0);
        expect(result.citizenEngagementIndex).toBeGreaterThan(0);

        // Cruzamento por bairro
        const utinga = result.neighborhoodCross.find(n => n.neighborhood === 'Utinga');
        expect(utinga).toBeDefined();
        expect(utinga?.total).toBe(2);
        expect(utinga?.categories['Buraco na pista']).toBe(1);
        expect(utinga?.categories['Iluminação pública']).toBe(1);

        // Eficiência por secretaria
        expect(result.departmentEfficiency.length).toBeGreaterThan(0);
        const healthDept = result.departmentEfficiency.find(d => d.department.includes('Saúde'));
        expect(healthDept).toBeDefined();

        // Ranking de cidadãos
        expect(result.citizenRanking.length).toBe(2);
        expect(result.citizenRanking[0].name).toBeDefined();

        // Predições
        expect(result.predictiveTrends).toHaveLength(7);
    });

    it('deve correlacionar falhas de infraestrutura hidráulica com risco de alagamentos e enchentes', () => {
        const floodMock: Contribution[] = [
            {
                id: 'fl-1',
                title: 'Bueiro totalmente entupido e assoreado',
                description: 'Boca de lobo cheia de terra e folhas impedindo a drenagem da água.',
                category: 'bueiro_rua',
                city: 'Mauá',
                neighborhood: 'Vila Assis Brasil',
                createdAt: new Date() as any
            } as any,
            {
                id: 'fl-2',
                title: 'Alagamento severo na avenida principal',
                description: 'Enxurrada e enchente cobrindo a pista após chuva de 30 minutos.',
                category: 'alagamento',
                city: 'Mauá',
                neighborhood: 'Vila Assis Brasil',
                createdAt: new Date() as any
            } as any
        ];

        const result = analyticsIntelligenceService.computeAnalytics(floodMock, []);

        expect(result.causalInsights.length).toBeGreaterThanOrEqual(1);
        const floodInsight = result.causalInsights.find(i => i.theme === 'DEFESA_CIVIL_INFRA');
        expect(floodInsight).toBeDefined();
        expect(floodInsight?.observedData.causeCount).toBe(1);
        expect(floodInsight?.observedData.effectCount).toBe(1);
        expect(floodInsight?.correlationScore).toBeGreaterThanOrEqual(65);
        expect(floodInsight?.predictiveWarning).toContain('enchente');
        expect(floodInsight?.recommendedActions.length).toBeGreaterThanOrEqual(2);
        expect(result.bivariateFloodTrends).toHaveLength(4);
    });

    it('deve correlacionar falhas de iluminação pública com aumento de queixas de segurança e furtos (Janelas Quebradas)', () => {
        const securityMock: Contribution[] = [
            {
                id: 'sec-1',
                title: 'Postes apagados na praça central',
                description: 'Três lâmpadas queimadas deixando o quarteirão em completa escuridão.',
                category: 'iluminação pública',
                city: 'Santo André',
                neighborhood: 'Vila Pires',
                createdAt: new Date() as any
            } as any,
            {
                id: 'sec-2',
                title: 'Tentativa de furto e assalto na esquina escura',
                description: 'Indivíduos aproveitando a falta de luz e policiamento para cometer roubos.',
                category: 'segurança',
                city: 'Santo André',
                neighborhood: 'Vila Pires',
                createdAt: new Date() as any
            } as any
        ];

        const result = analyticsIntelligenceService.computeAnalytics(securityMock, []);

        const securityInsight = result.causalInsights.find(i => i.theme === 'SEGURANCA_ILUMINACAO');
        expect(securityInsight).toBeDefined();
        expect(securityInsight?.observedData.causeCount).toBe(1);
        expect(securityInsight?.observedData.effectCount).toBe(1);
        expect(securityInsight?.predictiveWarning).toContain('abordagens suspeitas e furtos');
        expect(result.bivariateSecurityTrends).toHaveLength(4);
    });
});
