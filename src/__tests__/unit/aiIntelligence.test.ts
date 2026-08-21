import { describe, it, expect } from 'vitest';
import { aiOrchestratorService } from '../../services/aiOrchestratorService';
import { aiLearningService } from '../../services/aiLearningService';
import { predictiveEngine } from '../../services/predictiveEngine';
import type { PredictiveRiskAssessment } from '../../types/intelligence';

describe('Inteligência Artificial Multimodal, Triagem e Proteção LGPD (aiOrchestratorService)', () => {
    it('deve calcular Nota de Relevância e Nota de Risco para ocorrência válida', async () => {
        const result = await aiOrchestratorService.analyzeContribution({
            title: 'Cratera profunda na Avenida Brasil',
            description: 'Buraco de grande porte causando lentidão e risco de acidentes para motoristas e motociclistas.',
            category: 'buraco_rua',
            latitude: -23.55,
            longitude: -46.63
        });

        expect(result.relevanceScore).toBeGreaterThanOrEqual(60);
        expect(result.relevanceScore).toBeLessThanOrEqual(100);
        expect(result.riskScore).toBeGreaterThanOrEqual(1);
        expect(result.riskScore).toBeLessThanOrEqual(5);
        expect(result.isFaceOrPiiDetected).toBe(false);
    });

    it('deve rejeitar didaticamente contribuições contendo CPF ou dados pessoais (LGPD)', async () => {
        const result = await aiOrchestratorService.analyzeContribution({
            title: 'Denúncia contra vizinho',
            description: 'O morador de CPF 123.456.789-00 está jogando entulho na calçada.',
            category: 'lixo'
        });

        expect(result.isFaceOrPiiDetected).toBe(true);
        expect(result.piiViolationReason).toBeDefined();
        expect(result.piiViolationReason).toContain('LGPD');
        expect(result.detectedTags).toContain('lgpd_violation');
    });

    it('deve direcionar ocorrências críticas de desmoronamento para a Defesa Civil com Risco 5', async () => {
        const result = await aiOrchestratorService.analyzeContribution({
            title: 'Risco de desmoronamento de barranco após chuva',
            description: 'Encosta cedendo com perigo iminente de queda sobre residências vizinhas.',
            category: 'defesa_civil'
        });

        expect(result.riskScore).toBe(5);
        expect(result.suggestedDepartment).toBe('Defesa Civil Municipal');
        expect(result.detectedTags).toContain('risco_calamidade');
    });
});

describe('Motor de Active Learning e Fallback Heurístico (aiLearningService)', () => {
    it('deve aprender novos padrões e realizar inferência rápida em fallback', async () => {
        await aiLearningService.recordDecisionPattern(
            'iluminacao',
            'Poste com fiação exposta e faíscas na esquina',
            4,
            'APPROVED',
            'HUMAN_MODERATOR'
        );

        const inference = aiLearningService.inferFromLearnedPatterns(
            'Fiação de poste solta',
            'Poste com fiação caída soltando faíscas perto de pedestres',
            'iluminacao'
        );

        expect(inference.matchedPattern).toBeDefined();
        expect(inference.confidence).toBeGreaterThan(0.7);
    });
});

describe('Motor Preditivo de Incidentes Urbanos (predictiveEngine)', () => {
    it('deve criar alerta pendente sem envio automático em broadcast', async () => {
        const mockAssessment: PredictiveRiskAssessment = {
            id: 'test_assessment_123',
            cityId: 'santo-andre',
            cityName: 'Santo André',
            state: 'SP',
            category: 'ALAGAMENTO_ENCHENTE',
            title: 'Risco de Transbordamento do Rio Tamanduateí',
            description: 'Volume de água próximo da calha máxima com previsão de temporal.',
            severity: 'CRITICO',
            riskProbability: 92,
            affectedArea: {
                center: { latitude: -23.65, longitude: -46.53 },
                radiusMeters: 3000,
                neighborhoods: ['Centro', 'Campestre', 'Santa Terezinha']
            },
            incidentHistoryCount: 35,
            suggestedAction: 'Monitoramento por câmeras e equipes em campo.',
            createdAt: new Date().toISOString()
        };

        const alert = await predictiveEngine.createPendingAlert(mockAssessment, 'sysadmin@guardiao.com.br');

        expect(alert.approvalStatus).toBe('PENDENTE_APROVACAO');
        expect(alert.estimatedPopulation).toBeGreaterThan(0);
        expect(alert.notifiedSysadminEmail).toBe('sysadmin@guardiao.com.br');
    });
});
