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
});
