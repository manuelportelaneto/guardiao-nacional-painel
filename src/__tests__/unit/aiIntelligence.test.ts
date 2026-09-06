import { describe, it, expect } from 'vitest';
import { aiOrchestratorService } from '../../services/aiOrchestratorService';
import { aiLearningService } from '../../services/aiLearningService';
import { predictiveEngine } from '../../services/predictiveEngine';
import type { PredictiveRiskAssessment } from '../../types/intelligence';

describe('Inteligência Artificial Multimodal, Triagem e Tags Internas (aiOrchestratorService)', () => {
    it('deve ponderar Relevância Populacional maior para buraco/cratera do que para banco de praça', async () => {
        const craterResult = await aiOrchestratorService.analyzeContribution({
            title: 'Buraco profundo na pista na Avenida Brasil',
            description: 'Buraco de grande porte causando lentidão e risco de acidentes para motoristas e motociclistas.',
            category: 'buraco_rua',
            latitude: -23.55,
            longitude: -46.63
        });

        const benchResult = await aiOrchestratorService.analyzeContribution({
            title: 'Banco de madeira quebrado na praça',
            description: 'Banco da praça central com ripa solta precisando de pequenos reparos de carpintaria.',
            category: 'praca'
        });

        expect(craterResult.relevanceScore).toBeGreaterThanOrEqual(80);
        expect(benchResult.relevanceScore).toBeLessThan(70);
        expect(craterResult.relevanceScore).toBeGreaterThan(benchResult.relevanceScore);
        
        // Validação de Tags Estruturadas
        expect(craterResult.structuredTags?.civicImpact).toBe('mobilidade_urbana');
        expect(benchResult.structuredTags?.civicImpact).toBe('zeladoria_estetica');
    });

    it('deve identificar e auto-aprovar relatos de teste do Google Reviewers com risco 1', async () => {
        const testResult = await aiOrchestratorService.analyzeContribution({
            title: 'Teste Google Review 123',
            description: 'Apenas um teste de homologação do app para aprovação na Play Store.',
            category: 'outros'
        });

        expect(testResult.isTestContribution).toBe(true);
        expect(testResult.riskScore).toBe(1);
        expect(testResult.structuredTags?.nature).toBe('teste_homologacao');
        expect(testResult.detectedTags).toContain('natureza:teste_homologacao');
        expect(testResult.detectedTags).toContain('teste_google_revisor');
    });

    it('deve detectar temperatura verbal alta, propaganda política e anúncios como risco de publicação', async () => {
        // Toxicidade / Temperatura alta
        const toxicResult = await aiOrchestratorService.analyzeContribution({
            title: 'Prefeito safado e corrupto',
            description: 'Bando de incompetente e vagabundos que não arrumam a rua!',
            category: 'reclamacao'
        });
        expect(toxicResult.riskScore).toBeGreaterThanOrEqual(4);
        expect(toxicResult.structuredTags?.publicationRisk).toBe('temperatura_alta');

        // Propaganda política
        const politicalResult = await aiOrchestratorService.analyzeContribution({
            title: 'Vote no candidato X nas eleições',
            description: 'Campanha eleitoral do vereador ciclano para mudar o bairro.',
            category: 'evento'
        });
        expect(politicalResult.riskScore).toBeGreaterThanOrEqual(4);
        expect(politicalResult.structuredTags?.publicationRisk).toBe('propaganda_politica');

        // Anúncio comercial / spam
        const spamResult = await aiOrchestratorService.analyzeContribution({
            title: 'Compre casa com desconto imperdível',
            description: 'Acesse o site www.imoveis-promocao.com e ganhe dinheiro!',
            category: 'anuncio'
        });
        expect(spamResult.riskScore).toBeGreaterThanOrEqual(4);
        expect(spamResult.structuredTags?.publicationRisk).toBe('anuncio_spam');
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
        expect(result.detectedTags).toContain('bloqueio_lgpd');
    });

    it('deve direcionar ocorrências críticas de desmoronamento para a Defesa Civil com Risco 1 e Impacto Risco de Vida', async () => {
        const result = await aiOrchestratorService.analyzeContribution({
            title: 'Risco de desmoronamento de barranco após chuva',
            description: 'Encosta cedendo com perigo iminente de desabamento sobre residências vizinhas.',
            category: 'defesa_civil'
        });

        expect(result.suggestedDepartment).toBe('Defesa Civil Municipal');
        expect(result.structuredTags?.urgency).toBe('imediata');
        expect(result.structuredTags?.civicImpact).toBe('risco_de_vida');
        expect(result.relevanceScore).toBeGreaterThanOrEqual(90);
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
