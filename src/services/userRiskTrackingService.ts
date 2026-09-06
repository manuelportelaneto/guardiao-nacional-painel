/**
 * @fileoverview Serviço de Rastreamento Oculto de Risco de Usuários (`userRiskTrackingService.ts`).
 * 
 * Registra infrações de alto risco de forma transparente para a administração,
 * incrementando `shadowRiskCount` em +1 sem que o usuário tome conhecimento.
 * Permite mapear padrões de comportamento suspeito e contas potencialmente comprometidas.
 */

import { db } from '../firebaseConfig';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface UserRiskStrikeLog {
    id?: string;
    userId: string;
    contributionId: string;
    contributionTitle: string;
    riskScore: number;
    detectedReasons: string[];
    createdAt: any;
}

export const userRiskTrackingService = {
    /**
     * Registra uma infração grave de forma silenciosa e incrementa o contador oculto.
     */
    async recordRiskStrike(params: {
        userId: string;
        contributionId: string;
        contributionTitle: string;
        riskScore: number;
        reasons: string[];
    }): Promise<{ success: boolean; strikeCount?: number }> {
        if (!params.userId || params.userId === 'anonimo') {
            return { success: false };
        }

        try {
            // 1. Atualização atômica silenciosa do documento do usuário
            const userRef = doc(db, 'users', params.userId);
            await updateDoc(userRef, {
                shadowRiskCount: increment(1),
                lastRiskStrikeAt: serverTimestamp(),
                isFlaggedForAudit: true
            });

            // 2. Histórico detalhado para auditoria do SysAdmin
            await addDoc(collection(db, 'user_risk_strikes'), {
                userId: params.userId,
                contributionId: params.contributionId,
                contributionTitle: params.contributionTitle,
                riskScore: params.riskScore,
                detectedReasons: params.reasons,
                createdAt: serverTimestamp()
            });

            console.log(`🕵️ [UserRisk] Strike registrado para usuário ${params.userId} na contribuição ${params.contributionId}`);
            return { success: true };
        } catch (error) {
            console.warn('Erro ao registrar pontuação de risco oculto:', error);
            return { success: false };
        }
    }
};
