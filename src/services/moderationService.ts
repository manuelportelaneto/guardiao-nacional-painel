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
import {
    collection,
    query,
    where,
    getDocs,
    limit,
    Timestamp,
    doc,
    updateDoc,
    setDoc,
    addDoc,
    increment,
    serverTimestamp
} from 'firebase/firestore';
import type { Contribution } from '../types/contribution';
import { notificationService } from './notificationService';
import { loggingService } from './loggingService';
import { sysadminAlertService } from './sysadminAlertService';

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
    },

    /**
     * Aceita manualmente uma publicação que foi previamente recusada pela IA ou moderadores.
     * Reverte o status para 'Aprovado', anula strikes de risco e credita os pontos de gamificação (+10 XP).
     */
    acceptRejectedContribution: async (contribution: Contribution, adminUid?: string): Promise<boolean> => {
        try {
            const contribRef = doc(db, 'contributions', contribution.id);
            await updateDoc(contribRef, {
                status: 'Aprovado',
                approvedAt: serverTimestamp(),
                rejectionReason: null,
                aiDecision: 'approved_override',
                manuallyApprovedAfterRejection: true,
                updatedAt: serverTimestamp()
            });

            // Reverte o strike e credita XP do cidadão
            if (contribution.userId && contribution.userId !== 'anonimo') {
                const userRef = doc(db, 'users', contribution.userId);
                await setDoc(userRef, {
                    xp: increment(10),
                    interactions: {
                        ratingsReceived: increment(1)
                    },
                    riskStrikes: increment(-1) // Anula strike indevido caso tenha
                }, { merge: true });

                // Notifica o cidadão no App Móvel
                await addDoc(collection(db, 'users', contribution.userId, 'notifications'), {
                    title: 'Publicação Aprovada pela Equipe! 🎉',
                    message: `Sua contribuição "${contribution.title}" foi revisada pela equipe de moderação e aprovada no mapa!`,
                    type: 'success',
                    link: '/history',
                    read: false,
                    createdAt: serverTimestamp()
                });
            }

            // Resolve alertas pendentes no SysAdmin para esta contribuição
            try {
                await sysadminAlertService.resolveAlert(contribution.id, 'APPROVED_OVERRIDE');
            } catch {
                // Alerta pode não existir se for contribuição antiga
            }

            if (adminUid) {
                loggingService.logAudit('CONTRIBUTION_OVERRIDE_APPROVE', adminUid, contribution.id, {
                    previousStatus: contribution.status
                });
            }

            return true;
        } catch (err) {
            console.error('Erro ao aceitar publicação recusada:', err);
            throw err;
        }
    },

    /**
     * Aprova múltiplas contribuições de uma só vez (Ação em Massa).
     */
    bulkApprove: async (contributions: Contribution[], rating: number = 5, adminUid?: string): Promise<{ success: number; failed: number }> => {
        let success = 0;
        let failed = 0;

        for (const contrib of contributions) {
            try {
                await updateDoc(doc(db, 'contributions', contrib.id), {
                    status: 'Aprovado',
                    rating,
                    approvedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                if (contrib.userId && contrib.userId !== 'anonimo') {
                    const userRef = doc(db, 'users', contrib.userId);
                    await setDoc(userRef, {
                        interactions: { ratingsReceived: increment(1) },
                        xp: increment(10)
                    }, { merge: true });

                    await addDoc(collection(db, 'users', contrib.userId, 'notifications'), {
                        title: 'Contribuição Aprovada! 🎉',
                        message: `Sua contribuição "${contrib.title}" foi aprovada e já está pública no mapa.`,
                        type: 'success',
                        link: '/history',
                        read: false,
                        createdAt: serverTimestamp()
                    });
                }

                if (adminUid) {
                    loggingService.logAudit('BULK_APPROVE', adminUid, contrib.id, { rating });
                }

                success++;
            } catch (err) {
                console.error(`Erro ao aprovar em massa item ${contrib.id}:`, err);
                failed++;
            }
        }

        return { success, failed };
    },

    /**
     * Rejeita múltiplas contribuições em lote com justificativa padronizada.
     */
    bulkReject: async (contributions: Contribution[], reason: string, adminUid?: string): Promise<{ success: number; failed: number }> => {
        let success = 0;
        let failed = 0;

        for (const contrib of contributions) {
            try {
                await updateDoc(doc(db, 'contributions', contrib.id), {
                    status: 'Rejeitado',
                    rejectionReason: reason,
                    rejectedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                if (contrib.userId && contrib.userId !== 'anonimo') {
                    await addDoc(collection(db, 'users', contrib.userId, 'notifications'), {
                        title: 'Aviso de Moderação 🛡️',
                        message: `Sua ocorrência "${contrib.title}" foi analisada e não pôde ser aprovada: ${reason}.`,
                        type: 'warning',
                        link: '/history',
                        read: false,
                        createdAt: serverTimestamp()
                    });
                }

                if (adminUid) {
                    loggingService.logAudit('BULK_REJECT', adminUid, contrib.id, { reason });
                }

                success++;
            } catch (err) {
                console.error(`Erro ao rejeitar em massa item ${contrib.id}:`, err);
                failed++;
            }
        }

        return { success, failed };
    },

    /**
     * Marca múltiplas ocorrências como Resolvidas (Concluídas).
     */
    bulkResolve: async (contributions: Contribution[], adminUid?: string): Promise<{ success: number; failed: number }> => {
        let success = 0;
        let failed = 0;

        for (const contrib of contributions) {
            try {
                await updateDoc(doc(db, 'contributions', contrib.id), {
                    status: 'Resolvido',
                    resolvedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                if (contrib.userId && contrib.userId !== 'anonimo') {
                    await addDoc(collection(db, 'users', contrib.userId, 'notifications'), {
                        title: 'Demanda Solucionada! ✅',
                        message: `A ocorrência "${contrib.title}" foi atendida e marcada como resolvida pela gestão pública!`,
                        type: 'info',
                        link: '/history',
                        read: false,
                        createdAt: serverTimestamp()
                    });
                }

                if (adminUid) {
                    loggingService.logAudit('BULK_RESOLVE', adminUid, contrib.id, {});
                }

                success++;
            } catch (err) {
                console.error(`Erro ao resolver em massa item ${contrib.id}:`, err);
                failed++;
            }
        }

        return { success, failed };
    },

    /**
     * Despacha mensagens e notificações em massa para os autores das contribuições selecionadas.
     */
    bulkNotify: async (
        recipients: { userId: string; userEmail?: string; contributionTitle?: string }[],
        title: string,
        message: string,
        sendEmail: boolean = false
    ): Promise<{ notifiedCount: number }> => {
        const uniqueUserIds = Array.from(new Set(recipients.map(r => r.userId).filter(id => Boolean(id) && id !== 'anonimo')));
        let count = 0;

        for (const uid of uniqueUserIds) {
            try {
                await addDoc(collection(db, 'users', uid, 'notifications'), {
                    title,
                    message,
                    type: 'info',
                    read: false,
                    createdAt: serverTimestamp()
                });

                if (sendEmail) {
                    const recipient = recipients.find(r => r.userId === uid);
                    if (recipient?.userEmail) {
                        await notificationService.sendEmail({
                            to: [recipient.userEmail],
                            subject: `${title} - Guardião Nacional`,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                                    <h2 style="color: #2563EB;">${title} 📢</h2>
                                    <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${message}</p>
                                    <p style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666;">
                                        Equipe de Gestão e Moderação · Guardião Nacional
                                    </p>
                                </div>
                            `
                        });
                    }
                }

                count++;
            } catch (err) {
                console.error(`Erro ao notificar usuário ${uid}:`, err);
            }
        }

        return { notifiedCount: count };
    }
};

