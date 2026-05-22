/**
 * @fileoverview Serviço de Triagem e Fila Inteligente de Moderação (`src/services/moderationService.ts`).
 * 
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Ele gerencia a moderação humana de denúncias cívicas no painel administrativo do Guardião. Em vez de exibir as
 * ocorrências em ordem cronológica simples, o serviço implementa um algoritmo de **Fila Inteligente (Smart Queue)**.
 * O algoritmo calcula dinamicamente um Score de Prioridade de 0 a 100 para cada denúncia, garantindo que
 * situações críticas de perigo, discurso de ódio ou ocorrências paradas no sistema recebam atendimento prioritário dos gestores.
 * 
 * 🏛️ CONCEITOS E CRITÉRIOS DE PRIORIZAÇÃO:
 * 1. 🛑 SCORE DE RISCO DA IA (Até 50 Pontos):
 *    Se o classificador automático de IA do Guardião marcou a denúncia com nível de risco crítico (≥ 5), 
 *    ela ganha 50 pontos imediatos de score. Se for alto risco (≥ 4), recebe 30 pontos de peso.
 * 
 * 2. 📢 ALERTAS DE ABUSO POR CIDADÃOS (Até 20 Pontos):
 *    Ocorrências ativamente denunciadas por outros usuários na plataforma PWA móvel recebem pesos adicionais
 *    para rápida análise humana e ocultação preventiva.
 * 
 * 3. ⏳ ATENUAÇÃO TEMPORAL - ANTIBACKLOG (Até 20 Pontos):
 *    Para evitar que chamados simples de zeladoria caiam no esquecimento, a antiguidade do chamado gera peso
 *    crescente na prioridade (itens com mais de 48 horas parados na fila ganham 20 pontos automaticamente).
 * 
 * 4. 🔑 ANÁLISE DE PALAVRAS-CHAVE URGENTES (Até 10 Pontos):
 *    Como fallback de IA, o sistema realiza uma varredura léxica no título e descrição buscando por
 *    expressões de perigo iminente como "morte", "acidente" ou "socorro".
 */

import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import type { Contribution } from '../types/contribution';

export interface ModerationItem extends Contribution {
    priorityScore: number;    // Score matemático calculado de prioridade de moderação (0 a 100)
    priorityReasons: string[]; // Razões qualitativas amigáveis que explicam a nota atribuída
}

export const moderationService = {
    /**
     * Calcula o Score de Prioridade de Moderação (0 a 100) para uma determinada contribuição cívica.
     * Combina inteligência artificial, denúncias de cidadãos, antiguidade e análise léxica.
     */
    calculatePriority: (contribution: Contribution): { score: number, reasons: string[] } => {
        let score = 0;
        const reasons: string[] = [];

        // 1. FATOR DE RISCO IA (Máximo de 50 pontos)
        if (contribution.riskLevel) {
            if (contribution.riskLevel >= 5) {
                score += 50;
                reasons.push('Risco Crítico Detectado pela IA');
            } else if (contribution.riskLevel >= 4) {
                score += 30;
                reasons.push('Alto Risco Sinalizado');
            } else if (contribution.riskLevel >= 3) {
                score += 15;
            }
        }

        // 2. FATOR DE DENÚNCIA DE CIDADÃO (Máximo de 20 pontos)
        if (contribution.isReported) {
            score += 20;
            reasons.push('Reportado por Cidadãos (Possível Abuso)');
        }

        // 3. FATOR TEMPORAL / PREVENÇÃO DE BACKLOG (Máximo de 20 pontos)
        const createdAt = contribution.createdAt instanceof Timestamp ? contribution.createdAt.toDate() : new Date(contribution.createdAt || Date.now());
        const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursOld > 48) {
            score += 20;
            reasons.push('Atrasado na Fila (>48h)');
        } else if (hoursOld > 24) {
            score += 10;
        }

        // 4. ANÁLISE LÉXICA URGENTE - FALLBACK DE REDE (Máximo de 10 pontos)
        const text = (contribution.title + ' ' + contribution.description).toLowerCase();
        const urgentKeywords = ['urgente', 'perigo', 'acidente', 'morte', 'imediato', 'socorro'];
        if (urgentKeywords.some(w => text.includes(w))) {
            score += 10;
            reasons.push('Contém Palavras-chave de Emergência');
        }

        return {
            score: Math.min(score, 100), // Garante que o score nunca estoure o teto de 100
            reasons
        };
    },

    /**
     * Recupera contribuições pendentes do Firestore e devolve a Fila Inteligente (Smart Queue)
     * classificada de forma decrescente pelo score matemático de prioridade.
     */
    getSmartQueue: async (): Promise<ModerationItem[]> => {
        try {
            // Consulta eficiente no Firestore limitando a 50 itens pendentes por lote
            const q = query(
                collection(db, 'contributions'),
                where('status', '==', 'pending'), 
                limit(50)
            );

            const snapshot = await getDocs(q);
            const items: ModerationItem[] = snapshot.docs.map(doc => {
                const data = { id: doc.id, ...doc.data() } as Contribution;
                const { score, reasons } = moderationService.calculatePriority(data);
                return {
                    ...data,
                    priorityScore: score,
                    priorityReasons: reasons
                };
            });

            // Ordenação local (Client-side) decrescente do Score de Prioridade
            return items.sort((a, b) => b.priorityScore - a.priorityScore);

        } catch (error) {
            console.error("Erro ao gerar a fila inteligente de moderação:", error);
            throw error;
        }
    }
};

