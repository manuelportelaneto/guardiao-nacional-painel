
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import type { Contribution } from '../types/contribution';

export interface ModerationItem extends Contribution {
    priorityScore: number;
    priorityReasons: string[];
}

export const moderationService = {
    /**
     * Calculates a priority score (0-100) for a contribution to help moderators focus.
     */
    calculatePriority: (contribution: Contribution): { score: number, reasons: string[] } => {
        let score = 0;
        const reasons: string[] = [];

        // 1. High Risk Factor (Max 50 points)
        if (contribution.riskLevel) {
            if (contribution.riskLevel >= 5) {
                score += 50;
                reasons.push('Risco Crítico Detectado');
            } else if (contribution.riskLevel >= 4) {
                score += 30;
                reasons.push('Alto Risco');
            } else if (contribution.riskLevel >= 3) {
                score += 15;
            }
        }

        // 2. Reports Factor (Max 30 points)
        // Assuming we might have a reportsCount field in the future, currently just isReported
        if (contribution.isReported) {
            score += 20;
            reasons.push('Reportado por Usuários');
        }

        // 3. Time Factor (Max 20 points) - Older items get higher priority to prevent backlog
        const createdAt = contribution.createdAt instanceof Timestamp ? contribution.createdAt.toDate() : new Date(contribution.createdAt || Date.now());
        const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursOld > 48) {
            score += 20;
            reasons.push('Atrasado (>48h)');
        } else if (hoursOld > 24) {
            score += 10;
        }

        // 4. Keyword Analysis (Simple fallback if no AI)
        const text = (contribution.title + ' ' + contribution.description).toLowerCase();
        const urgentKeywords = ['urgente', 'perigo', 'acidente', 'morte', 'imediato', 'socorro'];
        if (urgentKeywords.some(w => text.includes(w))) {
            score += 10;
            reasons.push('Palavras-chave de Urgência');
        }

        return {
            score: Math.min(score, 100),
            reasons
        };
    },

    /**
     * Fetches pending contributions and sorts them by calculated priority.
     */
    getSmartQueue: async (): Promise<ModerationItem[]> => {
        try {
            const q = query(
                collection(db, 'contributions'),
                where('status', '==', 'pending'), // or 'Em Análise'
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

            // Client-side sort by score desc
            return items.sort((a, b) => b.priorityScore - a.priorityScore);

        } catch (error) {
            console.error("Error fetching smart queue:", error);
            throw error;
        }
    }
};
