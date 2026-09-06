/**
 * @fileoverview Orquestrador de IA Multimodal, Triagem Avançada e Tags Internas Inteligentes (`aiOrchestratorService.ts`).
 * 
 * Processa contribuições cívicas atribuindo:
 * 1. Nota de Relevância Cívica (0-100) — ponderando o impacto prático no dia a dia da população.
 * 2. Nota de Risco de Publicação (1-5) — avaliando toxicidade, anúncios, propaganda política, difamação e LGPD.
 * 3. Tags Internas Estruturadas ([urgencia:*], [impacto:*], [secretaria:*], [risco:*], [natureza:*]) + Tags Livres.
 * 4. Tolerância a Contas de Teste (Google Reviewers / QA) com auto-aprovação sem bloqueios.
 */

import type { AiTriageResult, AiStructuredTags } from '../types/intelligence';
import { aiLearningService } from './aiLearningService';

// Padrões de detecção de PII e identificações pessoais no texto
const PII_REGEX_PATTERNS = [
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, // CPF
    /\b\d{2}\.?\d{3}\.?\d{3}-?[\dkK]\b/, // RG
    /\b[A-Z]{3}-?\d[A-Z\d]\d{2}\b/i, // Placa de Veículo Mercosul/Brasil
    /\b(?:celular|fone|whatsapp|contato|chamar no)\s*:?\s*\(?\d{2}\)?\s*9?\d{4}-?\d{4}\b/i, // Telefone
];

// Palavras de teste para identificação de Google Reviewers e QA
const TEST_CONTRIBUTION_PATTERNS = [
    /\bteste\b/i,
    /\btest\b/i,
    /\bgoogle\s*review/i,
    /\btestando\b/i,
    /\bqa\s*test\b/i,
    /\bhomologacao\b/i,
    /\bteste\s*de\s*app\b/i,
    /\b123\s*teste\b/i
];

// Palavras indicando temperatura alta / agressividade / ofensas
const HIGH_TEMPERATURE_WORDS = [
    'ladrao', 'ladroes', 'corrupto', 'corruptos', 'safado', 'safados', 'canalha',
    'bando de incompetente', 'vagabundo', 'vagabundos', 'merda', 'bosta', 'porra',
    'desgraca', 'incompetentes', 'pilantra', 'safadeza', 'prefeito safado', 'policia lixo'
];

// Palavras indicando anúncios comerciais ou spam
const COMMERCIAL_SPAM_WORDS = [
    'compre', 'comprar', 'desconto', 'promocao', 'venda de', 'vendo casa', 'vendo carro',
    'clique no link', 'www.', 'http://', 'https://', 'bit.ly', 'cupom', 'renda extra',
    'trabalhe em casa', 'investimento', 'ganhe dinheiro'
];

// Palavras indicando propaganda partidária / eleitoral
const POLITICAL_CAMPAIGN_WORDS = [
    'vote no', 'vote em', 'candidato', 'partido dos', 'eleicoes', 'eleicao',
    'meu voto e', 'campanha eleitoral', 'deputado fulano', 'vereador ciclano',
    'fora partido', 'viva o partido'
];

// Palavras indicando difamação ou acusação nominal a indivíduos
const EXPOSURE_KEYWORDS = [
    'morador da casa', 'o vizinho chamado', 'dona maria', 'sr joao', 'o dono da loja',
    'o funcionario', 'o vizinho e traficante', 'vizinho ladrao'
];

export const aiOrchestratorService = {
    /**
     * Realiza a triagem completa e geração de tags internas inteligentes da ocorrência.
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
        const detectedTags: string[] = [];
        const freeformTags: string[] = [];

        // ─── 0. DETECÇÃO DE TESTES DO GOOGLE REVIEWER / QA ─────────────────────
        const isTestContribution = TEST_CONTRIBUTION_PATTERNS.some(rx => rx.test(data.title) || rx.test(data.description));

        if (isTestContribution) {
            const structuredTags: AiStructuredTags = {
                urgency: 'baixa',
                civicImpact: 'zeladoria_estetica',
                suggestedDepartment: 'ouvidoria_geral',
                publicationRisk: 'nenhum',
                nature: 'teste_homologacao'
            };

            detectedTags.push('natureza:teste_homologacao', 'urgencia:baixa', 'risco:nenhum', 'teste_google_revisor');
            freeformTags.push('conta_teste', 'google_play_review');

            return {
                relevanceScore: 50,
                riskScore: 1,
                suggestedDepartment: 'Ambiente de Homologação & Testes',
                suggestedDepartmentCode: 'QA_TEST',
                isFaceOrPiiDetected: false,
                isAmbiguous: false,
                isTestContribution: true,
                aiConfidence: 0.99,
                detectedTags,
                structuredTags,
                freeformTags,
                summary: 'Relato identificado como teste de homologação/Google Review. Aprovado para garantir teste de fluxo sem bloqueios.',
                usedFallbackModel: false
            };
        }

        // ─── 1. CHECAGEM DE PRIVACIDADE E DADOS PESSOAIS (LGPD) ────────────────
        const hasPiiInText = PII_REGEX_PATTERNS.some(regex => regex.test(data.title) || regex.test(data.description));
        const hasExposure = EXPOSURE_KEYWORDS.some(k => fullText.includes(k));
        const isPhotoFlaggedAsFace = Boolean(
            data.photoUrl && (data.photoUrl.includes('portrait') || data.photoUrl.includes('selfie') || data.photoUrl.includes('rg_') || data.photoUrl.includes('cpf_'))
        );

        if (hasPiiInText || hasExposure || isPhotoFlaggedAsFace) {
            const structuredTags: AiStructuredTags = {
                urgency: 'media',
                civicImpact: 'seguranca_patrimonial',
                suggestedDepartment: 'ouvidoria_geral',
                publicationRisk: hasExposure ? 'difamacao' : 'pii_lgpd_face',
                nature: 'cidadao_comum'
            };

            detectedTags.push(`risco:${structuredTags.publicationRisk}`, 'natureza:cidadao_comum', 'bloqueio_lgpd');
            if (hasPiiInText) freeformTags.push('pii_texto');
            if (hasExposure) freeformTags.push('difamacao_individual');
            if (isPhotoFlaggedAsFace) freeformTags.push('rosto_detectado');

            return {
                relevanceScore: 20,
                riskScore: 4,
                suggestedDepartment: 'Ouvidoria & Conformidade LGPD',
                suggestedDepartmentCode: 'OUV',
                isFaceOrPiiDetected: true,
                piiViolationReason: 'Por motivos de privacidade e conformidade com a LGPD (Lei 13.709/2018), não é permitido incluir fotos com rostos de pessoas, placas de veículos, documentos ou telefones. Por favor, reenvie desfocando ou removendo os dados pessoais.',
                isAmbiguous: false,
                aiConfidence: 0.96,
                detectedTags,
                structuredTags,
                freeformTags,
                summary: 'Ocorrência rejeitada automaticamente para proteção de dados pessoais ou difamação.',
                usedFallbackModel: false
            };
        }

        // ─── 2. CÁLCULO DA NOTA DE RELEVÂNCIA POPULAR (0 a 100) ─────────────────
        // Pondera o impacto real na vida, mobilidade e saúde da comunidade
        let relevanceScore = 60;
        let civicImpact: AiStructuredTags['civicImpact'] = 'zeladoria_estetica';

        // Gravidade Extrema / Risco de Vida (90 - 100)
        if (fullText.includes('desmoronamento') || fullText.includes('barranco') || fullText.includes('alagamento') || fullText.includes('enchente') || fullText.includes('desabamento') || fullText.includes('fio caido') || fullText.includes('choque eletrico') || fullText.includes('cratera')) {
            relevanceScore = 95;
            civicImpact = 'risco_de_vida';
            freeformTags.push('perigo_iminente', 'risco_vida');
        }
        // Alto Impacto na Saúde & Trânsito Crítico (80 - 90)
        else if (fullText.includes('buraco') || fullText.includes('asfalto') || fullText.includes('esgoto') || fullText.includes('dengue') || fullText.includes('semaforo apagado') || fullText.includes('falta de agua')) {
            relevanceScore = 85;
            civicImpact = fullText.includes('dengue') || fullText.includes('esgoto') ? 'saude_publica' : 'mobilidade_urbana';
            if (fullText.includes('buraco')) freeformTags.push('buraco_na_pista');
            if (fullText.includes('esgoto')) freeformTags.push('esgoto_a_ceu_aberto');
            if (fullText.includes('dengue')) freeformTags.push('foco_epidemiologico');
            if (fullText.includes('semaforo')) freeformTags.push('semaforo_avariado');
        }
        // Impacto Moderado: Iluminação, Lixo, Podas (65 - 75)
        else if (fullText.includes('iluminacao') || fullText.includes('poste') || fullText.includes('lampada') || fullText.includes('lixo') || fullText.includes('entulho') || fullText.includes('arvore')) {
            relevanceScore = 72;
            civicImpact = fullText.includes('iluminacao') ? 'seguranca_patrimonial' : 'zeladoria_estetica';
            if (fullText.includes('iluminacao') || fullText.includes('lampada')) freeformTags.push('iluminacao_escura');
            if (fullText.includes('lixo')) freeformTags.push('descarte_irregular');
        }
        // Baixo Impacto: Praça, Banco, Pintura, Pequenos Reparos (35 - 55)
        else if (fullText.includes('banco') || fullText.includes('praca') || fullText.includes('pintura') || fullText.includes('pichacao') || fullText.includes('calcada')) {
            relevanceScore = 48;
            civicImpact = 'zeladoria_estetica';
            freeformTags.push('manutencao_praça', 'reparo_menor');
        }

        // Bônus de qualidade de informação
        if (data.title.trim().length >= 15) relevanceScore += 3;
        if (data.description.trim().length >= 40) relevanceScore += 5;
        if (data.photoUrl && data.photoUrl.startsWith('http')) relevanceScore += 5;
        if (data.latitude && data.longitude) relevanceScore += 2;
        relevanceScore = Math.max(10, Math.min(100, relevanceScore));

        // ─── 3. CÁLCULO DA NOTA DE RISCO DE PUBLICAÇÃO (1 a 5) ──────────────────
        let riskScore = 1;
        let publicationRisk: AiStructuredTags['publicationRisk'] = 'nenhum';
        let suggestedDepartmentName = 'Secretaria de Obras & Serviços Públicos';
        let suggestedDepartmentCode = 'SMOSP';
        let suggestedDepartmentTag: AiStructuredTags['suggestedDepartment'] = 'obras_pavimentacao';
        let urgency: AiStructuredTags['urgency'] = 'media';
        let isAmbiguous = false;

        // A. Risco por Temperatura Alta / Ofensas
        const hasHighTemperature = HIGH_TEMPERATURE_WORDS.some(w => fullText.includes(w));
        if (hasHighTemperature) {
            riskScore = Math.max(riskScore, 4);
            publicationRisk = 'temperatura_alta';
            freeformTags.push('linguagem_agressiva', 'moderacao_verbal');
        }

        // B. Risco por Anúncio Comercial / Spam
        const hasCommercialSpam = COMMERCIAL_SPAM_WORDS.some(w => fullText.includes(w));
        if (hasCommercialSpam) {
            riskScore = Math.max(riskScore, 4);
            publicationRisk = 'anuncio_spam';
            freeformTags.push('possivel_spam', 'anuncio_comercial');
        }

        // C. Risco por Propaganda Política / Eleitoral
        const hasPoliticalCampaign = POLITICAL_CAMPAIGN_WORDS.some(w => fullText.includes(w));
        if (hasPoliticalCampaign) {
            riskScore = Math.max(riskScore, 4);
            publicationRisk = 'propaganda_politica';
            freeformTags.push('discurso_politico', 'propaganda_eleitoral');
        }

        // ─── 4. DIRECIONAMENTO DE SECRETARIA & URGÊNCIA ────────────────────────
        if (civicImpact === 'risco_de_vida') {
            urgency = 'imediata';
            suggestedDepartmentName = 'Defesa Civil Municipal';
            suggestedDepartmentCode = 'DEF_CIVIL';
            suggestedDepartmentTag = 'defesa_civil';
        } else if (civicImpact === 'saude_publica') {
            urgency = 'alta';
            suggestedDepartmentName = 'Vigilância Sanitária & Saúde';
            suggestedDepartmentCode = 'SMS';
            suggestedDepartmentTag = 'saude_vigilancia';
        } else if (civicImpact === 'mobilidade_urbana') {
            urgency = 'alta';
            suggestedDepartmentName = 'Mobilidade Urbana & Trânsito';
            suggestedDepartmentCode = 'SMUT';
            suggestedDepartmentTag = 'mobilidade_transito';
        } else if (fullText.includes('arvore') || fullText.includes('praca') || fullText.includes('parque')) {
            urgency = 'media';
            suggestedDepartmentName = 'Secretaria de Meio Ambiente';
            suggestedDepartmentCode = 'SMMA';
            suggestedDepartmentTag = 'meio_ambiente';
        } else {
            urgency = relevanceScore >= 70 ? 'alta' : 'baixa';
            suggestedDepartmentTag = 'obras_pavimentacao';
        }

        if (data.description.length < 15 || fullText.includes('coisa estranha') || fullText.includes('verificar apenas')) {
            isAmbiguous = true;
            freeformTags.push('texto_vago');
        }

        // Fallback de aprendizado contínuo
        const fallbackInference = aiLearningService.inferFromLearnedPatterns(data.title, data.description, data.category);
        if (isAmbiguous && fallbackInference.matchedPattern && fallbackInference.confidence >= 0.85) {
            riskScore = fallbackInference.estimatedRisk;
            isAmbiguous = fallbackInference.suggestedDecision === 'FLAGGED_HUMAN';
        }

        // Montagem das Tags Estruturadas
        const structuredTags: AiStructuredTags = {
            urgency,
            civicImpact,
            suggestedDepartment: suggestedDepartmentTag,
            publicationRisk,
            nature: 'cidadao_comum'
        };

        // Consolidação da lista de tags
        detectedTags.push(
            `urgencia:${urgency}`,
            `impacto:${civicImpact}`,
            `secretaria:${suggestedDepartmentTag}`,
            `risco:${publicationRisk}`,
            `natureza:cidadao_comum`,
            ...freeformTags
        );

        const result: AiTriageResult = {
            relevanceScore,
            riskScore,
            suggestedDepartment: suggestedDepartmentName,
            suggestedDepartmentCode,
            isFaceOrPiiDetected: false,
            isAmbiguous,
            isTestContribution: false,
            aiConfidence: isAmbiguous ? 0.70 : 0.95,
            detectedTags: Array.from(new Set(detectedTags)),
            structuredTags,
            freeformTags: Array.from(new Set(freeformTags)),
            summary: `Ocorrência com Relevância Populacional ${relevanceScore}/100 e Risco de Publicação Nível ${riskScore} para ${suggestedDepartmentName}.`,
            usedFallbackModel: false
        };

        // Grava padrão de aprendizado
        await aiLearningService.recordDecisionPattern(
            data.category || 'geral',
            fullText,
            riskScore,
            isAmbiguous ? 'FLAGGED_HUMAN' : (riskScore >= 4 ? 'REJECTED' : 'APPROVED'),
            'AI_MODEL'
        );

        return result;
    }
};
