/**
 * @fileoverview Motor de Machine Learning com Aprendizado Contínuo e Fallback Heurístico (`aiLearningService.ts`).
 * 
 * Registra padrões de decisões tomadas por modelos de IA e moderadores humanos, alimentando uma
 * base de conhecimento incremental (`ai_learning_patterns`). Em cenários de instabilidade ou offline,
 * atua como fallback resiliente aplicando as regras aprendidas.
 */

import {
    collection,
    doc,
    getDocs,
    setDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { LearningPattern } from '../types/intelligence';

const PATTERNS_COLLECTION = 'ai_learning_patterns';

// Cache em memória de padrões aprendidos para inferência rápida sem latência de rede
let patternsCache: LearningPattern[] = [
    {
        id: 'pat_buraco_rua',
        category: 'buraco_rua',
        textKeywords: ['buraco', 'cratera', 'asfalto', 'pavimentacao', 'recapeamento'],
        riskScore: 2,
        decision: 'APPROVED',
        decisionSource: 'HUMAN_MODERATOR',
        confidence: 0.95,
        frequency: 45,
        updatedAt: new Date().toISOString()
    },
    {
        id: 'pat_iluminacao',
        category: 'iluminacao',
        textKeywords: ['poste', 'lampada', 'escuridao', 'apagada', 'braco de luz'],
        riskScore: 2,
        decision: 'APPROVED',
        decisionSource: 'HUMAN_MODERATOR',
        confidence: 0.92,
        frequency: 38,
        updatedAt: new Date().toISOString()
    },
    {
        id: 'pat_risco_urgente',
        category: 'defesa_civil',
        textKeywords: ['desmoronamento', 'barranco', 'alagamento', 'enchente', 'socorro', 'desabamento'],
        riskScore: 5,
        decision: 'FLAGGED_HUMAN',
        decisionSource: 'HUMAN_MODERATOR',
        confidence: 0.98,
        frequency: 20,
        updatedAt: new Date().toISOString()
    },
    {
        id: 'pat_spam_comercial',
        category: 'geral',
        textKeywords: ['vendo', 'alugo', 'promocao', 'desconto', 'compre', 'whatsapp', 'chame no'],
        riskScore: 4,
        decision: 'REJECTED',
        decisionSource: 'HUMAN_MODERATOR',
        confidence: 0.99,
        frequency: 18,
        updatedAt: new Date().toISOString()
    }
];

export const aiLearningService = {
    /**
     * Carrega padrões do banco de dados no boot da aplicação.
     */
    async initializePatterns(): Promise<void> {
        try {
            const snap = await getDocs(collection(db, PATTERNS_COLLECTION));
            if (!snap.empty) {
                patternsCache = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LearningPattern[];
            }
        } catch (e) {
            console.warn('Utilizando base de conhecimento heurística padrão para fallback ML.');
        }
    },

    /**
     * Registra ou reforça um padrão aprendido a partir da decisão de um moderador humano ou da IA.
     */
    async recordDecisionPattern(
        category: string,
        text: string,
        riskScore: number,
        decision: 'APPROVED' | 'REJECTED' | 'FLAGGED_HUMAN',
        decisionSource: 'AI_MODEL' | 'HUMAN_MODERATOR'
    ): Promise<void> {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3);

        const uniqueKeywords = Array.from(new Set(words)).slice(0, 8);
        const patternId = `pat_${category}_${uniqueKeywords.slice(0, 2).join('_') || Date.now()}`;

        const existing = patternsCache.find(p => p.id === patternId);
        const frequency = (existing?.frequency || 0) + 1;

        const pattern: LearningPattern = {
            id: patternId,
            category,
            textKeywords: uniqueKeywords,
            riskScore,
            decision,
            decisionSource,
            confidence: Math.min(0.99, 0.70 + (frequency * 0.05)),
            frequency,
            updatedAt: new Date().toISOString()
        };

        // Atualiza cache e persiste no Firestore de forma assíncrona
        patternsCache = patternsCache.filter(p => p.id !== patternId).concat(pattern);

        try {
            await setDoc(doc(db, PATTERNS_COLLECTION, patternId), pattern, { merge: true });
        } catch (err) {
            console.warn('Aviso: Padrão gravado apenas em cache local:', err);
        }
    },

    /**
     * Inferência heurística de fallback quando a API de nuvem está indisponível.
     */
    inferFromLearnedPatterns(title: string, description: string, category?: string): {
        matchedPattern: LearningPattern | null;
        estimatedRisk: number;
        suggestedDecision: 'APPROVED' | 'REJECTED' | 'FLAGGED_HUMAN';
        confidence: number;
    } {
        const combinedText = `${title} ${description}`.toLowerCase();
        let bestMatch: LearningPattern | null = null;
        let maxMatches = 0;

        for (const pat of patternsCache) {
            let matches = 0;
            for (const kw of pat.textKeywords) {
                if (combinedText.includes(kw)) {
                    matches++;
                }
            }
            if (category && pat.category === category) {
                matches += 1.5;
            }
            if (matches > maxMatches) {
                maxMatches = matches;
                bestMatch = pat;
            }
        }

        if (bestMatch && maxMatches >= 1) {
            return {
                matchedPattern: bestMatch,
                estimatedRisk: bestMatch.riskScore,
                suggestedDecision: bestMatch.decision,
                confidence: bestMatch.confidence
            };
        }

        // Padrão Neutro caso não haja match
        return {
            matchedPattern: null,
            estimatedRisk: 2,
            suggestedDecision: 'FLAGGED_HUMAN',
            confidence: 0.50
        };
    },

    /**
     * Retorna os padrões atualmente aprendidos.
     */
    getLearnedPatterns(): LearningPattern[] {
        return patternsCache;
    }
};
