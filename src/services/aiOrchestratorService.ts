/**
 * @fileoverview Orquestrador de IA Multimodal, Triagem e Proteção de Privacidade LGPD (`aiOrchestratorService.ts`).
 * 
 * Processa contribuições cívicas atribuindo Nota de Relevância (0-100), Nota de Risco (1-5),
 * sugestão de secretaria e filtragem de privacidade com orientações didáticas ao cidadão.
 */

import type { AiTriageResult } from '../types/intelligence';
import { aiLearningService } from './aiLearningService';

// Padrões de detecção de PII e identificações pessoais no texto
const PII_REGEX_PATTERNS = [
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, // CPF
    /\b\d{2}\.?\d{3}\.?\d{3}-?[\dkK]\b/, // RG
    /\b[A-Z]{3}-?\d[A-Z\d]\d{2}\b/i, // Placa de Veículo Mercosul/Brasil
    /\b(?:celular|fone|whatsapp|contato|chamar no)\s*:?\s*\(?\d{2}\)?\s*9?\d{4}-?\d{4}\b/i, // Telefone
];

// Palavras indicando exposição ou difamação de indivíduos
const EXPOSURE_KEYWORDS = [
    'morador da casa', 'o vizinho chamado', 'dona maria', 'sr joao', 'o dono da loja',
    'o funcionario', 'o policial', 'o prefeito fulano'
];

export const aiOrchestratorService = {
    /**
     * Realiza a triagem completa de uma ocorrência com IA.
     */
    async analyzeContribution(data: {
        title: string;
        description: string;
        category?: string;
        photoUrl?: string;
        latitude?: number;
        longitude?: number;
    }): Promise<AiTriageResult> {
        const fullText = `${data.title} ${data.description}`.toLowerCase();

        // 1. CHECAGEM DE PRIVACIDADE E DADOS SENSÍVEIS (LGPD)
        const hasPiiInText = PII_REGEX_PATTERNS.some(regex => regex.test(data.title) || regex.test(data.description));
        const hasExposure = EXPOSURE_KEYWORDS.some(k => fullText.includes(k));

        // Simulação de detecção de face/documento na foto se a foto tiver indícios
        const isPhotoFlaggedAsFace = Boolean(
            data.photoUrl && (data.photoUrl.includes('portrait') || data.photoUrl.includes('selfie') || data.photoUrl.includes('rg_') || data.photoUrl.includes('cpf_'))
        );

        if (hasPiiInText || hasExposure || isPhotoFlaggedAsFace) {
            return {
                relevanceScore: 10,
                riskScore: 4,
                suggestedDepartment: 'Ouvidoria & Conformidade LGPD',
                suggestedDepartmentCode: 'OUV',
                isFaceOrPiiDetected: true,
                piiViolationReason: 'Por motivos de privacidade e conformidade com a LGPD (Lei Geral de Proteção de Dados), não é permitido incluir fotos com rostos de pessoas, placas de veículos, documentos ou números de telefone. Por favor, reenvie sua contribuição removendo ou desfocando os dados pessoais.',
                isAmbiguous: false,
                aiConfidence: 0.96,
                detectedTags: ['lgpd_violation', 'pii_detected'],
                summary: 'Ocorrência rejeitada automaticamente para proteção de dados pessoais.',
                usedFallbackModel: false
            };
        }

        // 2. CÁLCULO DA NOTA DE RELEVÂNCIA (0 a 100)
        let relevanceScore = 60; // Base inicial
        if (data.title.trim().length >= 10) relevanceScore += 10;
        if (data.description.trim().length >= 30) relevanceScore += 15;
        if (data.photoUrl && data.photoUrl.startsWith('http')) relevanceScore += 10;
        if (data.latitude && data.longitude) relevanceScore += 5;

        // Penalidade para textos vagos
        if (data.description.trim().length < 15) relevanceScore -= 25;
        relevanceScore = Math.max(0, Math.min(100, relevanceScore));

        // 3. CÁLCULO DA NOTA DE RISCO (1 a 5) & DIRECIONAMENTO DE SECRETARIA
        let riskScore = 2;
        let suggestedDepartment = 'Secretaria de Obras & Serviços Públicos';
        let suggestedDepartmentCode = 'SMOSP';
        const detectedTags: string[] = [];
        let isAmbiguous = false;

        if (fullText.includes('desmoronamento') || fullText.includes('barranco') || fullText.includes('alagamento') || fullText.includes('enchente') || fullText.includes('desabamento')) {
            riskScore = 5;
            suggestedDepartment = 'Defesa Civil Municipal';
            suggestedDepartmentCode = 'DEF_CIVIL';
            detectedTags.push('risco_calamidade', 'defesa_civil');
        } else if (fullText.includes('fogo') || fullText.includes('incendio') || fullText.includes('explosao') || fullText.includes('arma')) {
            riskScore = 5;
            suggestedDepartment = 'Segurança Urbana & Defesa Social';
            suggestedDepartmentCode = 'GCM';
            detectedTags.push('seguranca_imediata', 'risco_vida');
        } else if (fullText.includes('dengue') || fullText.includes('esgoto') || fullText.includes('rato') || fullText.includes('lixo acumulado')) {
            riskScore = 3;
            suggestedDepartment = 'Vigilância Sanitária & Saúde';
            suggestedDepartmentCode = 'SMS';
            detectedTags.push('saude_publica', 'vetores');
        } else if (fullText.includes('semaforo') || fullText.includes('transito') || fullText.includes('sinalizacao') || fullText.includes('acidente')) {
            riskScore = 3;
            suggestedDepartment = 'Mobilidade Urbana & Trânsito';
            suggestedDepartmentCode = 'SMUT';
            detectedTags.push('transito', 'mobilidade');
        } else if (fullText.includes('arvore') || fullText.includes('poda') || fullText.includes('praca') || fullText.includes('parque')) {
            riskScore = 2;
            suggestedDepartment = 'Secretaria de Meio Ambiente';
            suggestedDepartmentCode = 'SMMA';
            detectedTags.push('meio_ambiente', 'arborizacao');
        } else if (data.description.length < 15 || fullText.includes('coisa estranha') || fullText.includes('verificar')) {
            isAmbiguous = true;
            detectedTags.push('texto_inconclusivo');
        }

        // 4. FALLBACK ML & APRENDIZADO
        const fallbackInference = aiLearningService.inferFromLearnedPatterns(data.title, data.description, data.category);

        // Se for um caso ambíguo mas houver padrão conhecido com alta confiança, ajusta
        if (isAmbiguous && fallbackInference.matchedPattern && fallbackInference.confidence >= 0.85) {
            riskScore = fallbackInference.estimatedRisk;
            isAmbiguous = fallbackInference.suggestedDecision === 'FLAGGED_HUMAN';
        }

        const result: AiTriageResult = {
            relevanceScore,
            riskScore,
            suggestedDepartment,
            suggestedDepartmentCode,
            isFaceOrPiiDetected: false,
            isAmbiguous,
            aiConfidence: isAmbiguous ? 0.65 : 0.94,
            detectedTags,
            summary: `Ocorrência classificada com Relevância ${relevanceScore}/100 e Risco Nível ${riskScore} para ${suggestedDepartment}.`,
            usedFallbackModel: false
        };

        // Alimenta o aprendizado contínuo
        await aiLearningService.recordDecisionPattern(
            data.category || 'geral',
            fullText,
            riskScore,
            isAmbiguous ? 'FLAGGED_HUMAN' : 'APPROVED',
            'AI_MODEL'
        );

        return result;
    }
};
